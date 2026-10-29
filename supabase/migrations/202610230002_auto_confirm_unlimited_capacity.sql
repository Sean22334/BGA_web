-- NULL capacity means unlimited. Existing numeric capacities are preserved.
alter table public.orientations alter column capacity drop not null;
alter table public.orientations drop constraint orientations_capacity_integrity;
alter table public.orientations add constraint orientations_capacity_integrity
check (reserved is not null and reserved >= 0 and
  (capacity is null or (capacity > 0 and reserved <= capacity))) not valid;
alter table public.reservations alter column status set default 'Confirmed';

create or replace function public.guard_orientation_seat_count()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if (tg_op = 'INSERT' and new.reserved is distinct from 0)
      or (tg_op = 'UPDATE' and new.reserved is distinct from old.reserved) then
      raise exception 'Reserved seats are managed by reservation operations.' using errcode = '42501';
    end if;
  end if;
  if new.capacity is null and new.status::text = 'Fully Booked' then
    new.status := 'Open';
  elsif new.capacity is not null and new.status::text in ('Open', 'Published') and new.reserved >= new.capacity then
    new.status := 'Fully Booked';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_orientation_seat_count() from public;
drop trigger if exists guard_orientation_seat_count on public.orientations;
create trigger guard_orientation_seat_count
before insert or update on public.orientations
for each row execute function public.guard_orientation_seat_count();

drop policy "Public can view bookable orientations" on public.orientations;
create policy "Public can view bookable orientations"
on public.orientations for select to anon, authenticated
using (status::text in ('Open', 'Published')
  and public.orientation_starts_at(date, start_time::text) > now()
  and (capacity is null or reserved < capacity));

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
  if exists (
    select 1 from public.reservations r
    where r.orientation_id = p_orientation_id and r.status::text <> 'Cancelled'
      and (lower(trim(r.email)) = lower(trim(p_email))
        or regexp_replace(r.phone, '[^0-9]', '', 'g') = v_phone)
  ) then
    raise exception 'A reservation already exists for this schedule using this email or phone number.' using errcode = '23505';
  end if;

  -- A full random UUID gives 122 random bits, fits the existing 50-char column,
  -- and is protected by the existing unique reference index.
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
    v_orientation.date, v_orientation.start_time::text, v_orientation.end_time::text, v_created_at;
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

  -- Every booking/status operation acquires locks in orientation -> reservation
  -- order. Opposite ordering can deadlock concurrent bookings and cancellations.
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
      where r.orientation_id = v_orientation_id and r.id <> p_reservation_id
        and r.status::text <> 'Cancelled'
        and (lower(trim(r.email)) = lower(trim(v_reservation.email))
          or regexp_replace(r.phone, '[^0-9]', '', 'g') = regexp_replace(v_reservation.phone, '[^0-9]', '', 'g'))
    ) then
      raise exception 'A reservation already exists for this schedule using this email or phone number.' using errcode = '23505';
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

  -- Assignment uses the column's native type, supporting text and enum schemas.
  v_reservation.status := p_status;
  update public.reservations set status = v_reservation.status where id = p_reservation_id;
end;
$$;


-- Pending reservations already occupy seats: confirmation must not change counts.
update public.reservations r set status = 'Confirmed'
from public.orientations o
where r.orientation_id = o.id and r.status::text = 'Pending'
  and public.orientation_starts_at(o.date, o.start_time::text) > now();

revoke all on function public.book_orientation(bigint,text,text,text,text,text,text,text) from public;
grant execute on function public.book_orientation(bigint,text,text,text,text,text,text,text) to anon, authenticated;
revoke all on function public.set_reservation_status(bigint,text) from public;
grant execute on function public.set_reservation_status(bigint,text) to authenticated;
notify pgrst, 'reload schema';
