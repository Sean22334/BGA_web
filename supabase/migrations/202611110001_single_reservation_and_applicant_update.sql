-- Enforce one active reservation per applicant across all orientations,
-- and provide secure applicant self-update for typographical corrections.

create or replace function public.book_orientation(
  p_orientation_id bigint,
  p_full_name text,
  p_phone text,
  p_email text,
  p_address text,
  p_city text,
  p_province text,
  p_notes text default ''
)
returns table (
  reference_number text,
  full_name text,
  reservation_status text,
  orientation_title text,
  orientation_branch text,
  orientation_venue text,
  orientation_date date,
  orientation_start_time text,
  orientation_end_time text,
  submitted_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_orientation public.orientations%rowtype;
  v_reference text;
  v_created_at timestamptz;
  v_phone text := regexp_replace(p_phone, '[^0-9]', '', 'g');
begin
  if nullif(trim(p_full_name), '') is null
    or nullif(v_phone, '') is null
    or length(v_phone) < 10 or length(v_phone) > 15
    or coalesce(trim(p_email), '') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or nullif(trim(p_address), '') is null
    or nullif(trim(p_city), '') is null
    or nullif(trim(p_province), '') is null then
    raise exception 'Valid applicant details are required.' using errcode = '22023';
  end if;

  select o.* into v_orientation
  from public.orientations o where o.id = p_orientation_id for update;
  if not found then
    raise exception 'Selected orientation event is unavailable.' using errcode = 'P0002';
  end if;
  if coalesce(public.orientation_starts_at(v_orientation.date, v_orientation.start_time::text) <= now(), true)
    or coalesce(v_orientation.status::text not in ('Open', 'Published'), true)
    or (v_orientation.capacity is not null and v_orientation.reserved >= v_orientation.capacity) then
    raise exception 'Selected orientation event is no longer available.' using errcode = 'P0001';
  end if;

  -- One active reservation per user across all orientations
  if exists (
    select 1 from public.reservations r
    where r.status::text <> 'Cancelled'
      and (lower(trim(r.email)) = lower(trim(p_email))
        or regexp_replace(r.phone, '[^0-9]', '', 'g') = v_phone)
  ) then
    raise exception 'You already have an active reservation under this email or phone number. Each applicant is allowed one active reservation to prevent duplicate bookings.' using errcode = '23505';
  end if;

  v_reference := 'BGA-' || to_char(now() at time zone 'Asia/Manila', 'YYYY') || '-' || upper(replace(gen_random_uuid()::text, '-', ''));
  insert into public.reservations (
    orientation_id, reference_number, full_name, phone, email,
    address, city, province, notes, status
  ) values (
    p_orientation_id, v_reference, trim(p_full_name), trim(p_phone), lower(trim(p_email)),
    trim(p_address), trim(p_city), trim(p_province), coalesce(trim(p_notes), ''), 'Confirmed'
  ) returning created_at into v_created_at;

  update public.orientations o
  set reserved = o.reserved + 1,
    status = case when o.capacity is not null and o.reserved + 1 >= o.capacity then 'Fully Booked' else o.status end
  where o.id = p_orientation_id;

  return query select v_reference, trim(p_full_name), 'Confirmed'::text,
    v_orientation.title::text, v_orientation.branch::text, v_orientation.venue::text,
    v_orientation.date, v_orientation.start_time::text, v_orientation.end_time::text,
    v_created_at;
end;
$$;

create or replace function public.set_reservation_status(p_reservation_id bigint, p_status text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reservation public.reservations%rowtype;
  v_orientation public.orientations%rowtype;
  v_orientation_id bigint;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('Pending', 'Confirmed', 'Cancelled') then
    raise exception 'Invalid reservation status.' using errcode = '22023';
  end if;

  select r.orientation_id into v_orientation_id
  from public.reservations r where r.id = p_reservation_id;
  if not found then
    raise exception 'Reservation not found.' using errcode = 'P0002';
  end if;

  select o.* into v_orientation
  from public.orientations o where o.id = v_orientation_id for update;
  if not found then
    raise exception 'Orientation not found.' using errcode = 'P0002';
  end if;
  select r.* into v_reservation
  from public.reservations r where r.id = p_reservation_id for update;
  if not found or v_reservation.orientation_id is distinct from v_orientation_id then
    raise exception 'Reservation changed. Please retry.' using errcode = '40001';
  end if;

  if v_reservation.status::text = 'Cancelled' and p_status <> 'Cancelled' then
    if v_orientation.capacity is not null and v_orientation.reserved >= v_orientation.capacity then
      raise exception 'The orientation is already fully booked.' using errcode = 'P0001';
    end if;
    if exists (
      select 1 from public.reservations r
      where r.id <> p_reservation_id
        and r.status::text <> 'Cancelled'
        and (lower(trim(r.email)) = lower(trim(v_reservation.email))
          or regexp_replace(r.phone, '[^0-9]', '', 'g') = regexp_replace(v_reservation.phone, '[^0-9]', '', 'g'))
    ) then
      raise exception 'You already have an active reservation under this email or phone number.' using errcode = '23505';
    end if;
    update public.orientations o
    set reserved = o.reserved + 1,
      status = case when o.capacity is not null and o.reserved + 1 >= o.capacity then 'Fully Booked' else o.status end
    where o.id = v_orientation_id;
  elsif v_reservation.status::text <> 'Cancelled' and p_status = 'Cancelled' then
    update public.orientations o
    set reserved = greatest(0, o.reserved - 1),
      status = case when o.status::text = 'Fully Booked' then 'Open' else o.status end
    where o.id = v_orientation_id;
  end if;

  v_reservation.status := p_status;
  update public.reservations set status = v_reservation.status where id = p_reservation_id;
end;
$$;

create or replace function public.update_applicant_reservation(
  p_reference_number text,
  p_current_phone text,
  p_full_name text,
  p_phone text,
  p_email text,
  p_address text,
  p_city text,
  p_province text,
  p_notes text default ''
)
returns table (
  reference_number text,
  full_name text,
  reservation_status text,
  orientation_title text,
  orientation_branch text,
  orientation_venue text,
  orientation_date date,
  orientation_start_time text,
  orientation_end_time text,
  submitted_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_res public.reservations%rowtype;
  v_orientation public.orientations%rowtype;
  v_cur_phone text := regexp_replace(p_current_phone, '[^0-9]', '', 'g');
  v_new_phone text := regexp_replace(p_phone, '[^0-9]', '', 'g');
begin
  if nullif(trim(p_full_name), '') is null
    or nullif(v_new_phone, '') is null
    or length(v_new_phone) < 10 or length(v_new_phone) > 15
    or coalesce(trim(p_email), '') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or nullif(trim(p_address), '') is null
    or nullif(trim(p_city), '') is null
    or nullif(trim(p_province), '') is null then
    raise exception 'Valid applicant details are required.' using errcode = '22023';
  end if;

  select * into v_res
  from public.reservations r
  where upper(trim(r.reference_number)) = upper(trim(p_reference_number))
    and regexp_replace(r.phone, '[^0-9]', '', 'g') = v_cur_phone
  for update;

  if not found then
    raise exception 'Reservation not found or phone number does not match.' using errcode = 'P0002';
  end if;

  if v_res.status::text = 'Cancelled' then
    raise exception 'Cancelled reservations cannot be edited.' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.reservations r
    where r.id <> v_res.id and r.status::text <> 'Cancelled'
      and (lower(trim(r.email)) = lower(trim(p_email))
        or regexp_replace(r.phone, '[^0-9]', '', 'g') = v_new_phone)
  ) then
    raise exception 'Another active reservation already exists under this email or phone number.' using errcode = '23505';
  end if;

  update public.reservations
  set full_name = trim(p_full_name),
      phone = trim(p_phone),
      email = lower(trim(p_email)),
      address = trim(p_address),
      city = trim(p_city),
      province = trim(p_province),
      notes = coalesce(trim(p_notes), '')
  where id = v_res.id;

  select * into v_orientation from public.orientations where id = v_res.orientation_id;

  return query select
    v_res.reference_number::text,
    trim(p_full_name),
    v_res.status::text,
    v_orientation.title::text,
    v_orientation.branch::text,
    v_orientation.venue::text,
    v_orientation.date,
    v_orientation.start_time::text,
    v_orientation.end_time::text,
    v_res.created_at;
end;
$$;

revoke all on function public.book_orientation(bigint,text,text,text,text,text,text,text) from public;
grant execute on function public.book_orientation(bigint,text,text,text,text,text,text,text) to anon, authenticated;
revoke all on function public.set_reservation_status(bigint,text) from public;
grant execute on function public.set_reservation_status(bigint,text) to authenticated;
revoke all on function public.update_applicant_reservation(text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.update_applicant_reservation(text,text,text,text,text,text,text,text,text) to anon, authenticated;
notify pgrst, 'reload schema';

