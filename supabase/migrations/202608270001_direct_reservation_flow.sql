-- Direct reservation flow: atomic bookings, safe confirmation lookup, and RLS.
-- Apply this migration to the production Supabase project before deploying the UI.

create extension if not exists pgcrypto;

alter table public.orientations enable row level security;
alter table public.reservations enable row level security;

grant select on public.orientations to anon, authenticated;
grant insert, update, delete on public.orientations to authenticated;
grant select, insert, update, delete on public.reservations to authenticated;

create unique index if not exists reservations_reference_number_unique
on public.reservations (reference_number);

-- Replace legacy policies so no earlier anonymous insert/select policy can bypass this model.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('orientations', 'reservations')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end;
$$;

create policy "Public can view bookable orientations"
on public.orientations
for select
to anon
using (
  status::text in ('Open', 'Published')
  and date >= current_date
  and reserved < capacity
);

create policy "Admins can manage orientations"
on public.orientations
for all
to authenticated
using (true)
with check (true);

create policy "Admins can manage reservations"
on public.reservations
for all
to authenticated
using (true)
with check (true);

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
  v_normalized_phone text;
begin
  if nullif(trim(p_full_name), '') is null
    or nullif(trim(p_phone), '') is null
    or nullif(trim(p_email), '') is null
    or nullif(trim(p_address), '') is null
    or nullif(trim(p_city), '') is null
    or nullif(trim(p_province), '') is null then
    raise exception 'All required applicant fields must be provided.' using errcode = '22023';
  end if;

  v_normalized_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');

  select o.*
  into v_orientation
  from public.orientations o
  where o.id = p_orientation_id
  for update;

  if not found then
    raise exception 'Selected orientation event is unavailable.' using errcode = 'P0002';
  end if;

  if v_orientation.date < current_date
    or v_orientation.status::text not in ('Open', 'Published')
    or v_orientation.reserved >= v_orientation.capacity then
    raise exception 'Selected orientation event is no longer available.' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.reservations r
    where r.orientation_id = p_orientation_id
      and r.status::text <> 'Cancelled'
      and (
        lower(trim(r.email)) = lower(trim(p_email))
        or regexp_replace(r.phone, '[^0-9]', '', 'g') = v_normalized_phone
      )
  ) then
    raise exception 'A reservation already exists for this schedule using this email or phone number.' using errcode = '23505';
  end if;

  loop
    v_reference := 'BGA-' || to_char(current_date, 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    exit when not exists (
      select 1 from public.reservations r where r.reference_number = v_reference
    );
  end loop;

  insert into public.reservations (
    orientation_id,
    reference_number,
    full_name,
    phone,
    email,
    address,
    city,
    province,
    notes,
    status
  ) values (
    p_orientation_id,
    v_reference,
    trim(p_full_name),
    trim(p_phone),
    lower(trim(p_email)),
    trim(p_address),
    trim(p_city),
    trim(p_province),
    coalesce(trim(p_notes), ''),
    'Pending'
  )
  returning created_at into v_created_at;

  update public.orientations o
  set
    reserved = o.reserved + 1,
    status = case
      when o.reserved + 1 >= o.capacity then 'Fully Booked'
      else o.status
    end
  where o.id = p_orientation_id;

  return query
  select
    v_reference,
    trim(p_full_name),
    'Pending'::text,
    v_orientation.title::text,
    v_orientation.branch::text,
    v_orientation.venue::text,
    v_orientation.date,
    v_orientation.start_time::text,
    v_orientation.end_time::text,
    v_created_at;
end;
$$;

create or replace function public.lookup_reservation_confirmation(
  p_reference_number text,
  p_phone text
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
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    r.reference_number::text,
    r.full_name::text,
    r.status::text,
    o.title::text,
    o.branch::text,
    o.venue::text,
    o.date,
    o.start_time::text,
    o.end_time::text,
    r.created_at
  from public.reservations r
  join public.orientations o on o.id = r.orientation_id
  where upper(trim(r.reference_number)) = upper(trim(p_reference_number))
    and regexp_replace(r.phone, '[^0-9]', '', 'g') = regexp_replace(p_phone, '[^0-9]', '', 'g')
  limit 1;
$$;

create or replace function public.set_reservation_status(
  p_reservation_id bigint,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reservation public.reservations%rowtype;
  v_orientation public.orientations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_status not in ('Pending', 'Confirmed', 'Cancelled') then
    raise exception 'Invalid reservation status.' using errcode = '22023';
  end if;

  select r.* into v_reservation
  from public.reservations r
  where r.id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reservation not found.' using errcode = 'P0002';
  end if;

  select o.* into v_orientation
  from public.orientations o
  where o.id = v_reservation.orientation_id
  for update;

  if v_reservation.status::text = 'Cancelled' and p_status <> 'Cancelled' then
    if v_orientation.reserved >= v_orientation.capacity then
      raise exception 'The orientation is already fully booked.' using errcode = 'P0001';
    end if;

    update public.orientations o
    set
      reserved = o.reserved + 1,
      status = case when o.reserved + 1 >= o.capacity then 'Fully Booked' else o.status end
    where o.id = v_orientation.id;
  elsif v_reservation.status::text <> 'Cancelled' and p_status = 'Cancelled' then
    update public.orientations o
    set
      reserved = greatest(0, o.reserved - 1),
      status = case when o.status::text = 'Fully Booked' then 'Open' else o.status end
    where o.id = v_orientation.id;
  end if;

  update public.reservations r
  set status = case p_status
    when 'Pending' then 'Pending'
    when 'Confirmed' then 'Confirmed'
    when 'Cancelled' then 'Cancelled'
  end
  where r.id = p_reservation_id;
end;
$$;

revoke all on function public.book_orientation(bigint, text, text, text, text, text, text, text) from public;
grant execute on function public.book_orientation(bigint, text, text, text, text, text, text, text) to anon, authenticated;

revoke all on function public.lookup_reservation_confirmation(text, text) from public;
grant execute on function public.lookup_reservation_confirmation(text, text) to anon, authenticated;

revoke all on function public.set_reservation_status(bigint, text) from public;
grant execute on function public.set_reservation_status(bigint, text) to authenticated;
