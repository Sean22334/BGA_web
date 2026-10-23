-- BGA pending production changes, prepared 2026-10-23.
-- Run in the intended Supabase project's SQL Editor as database owner.
-- Verify a restorable database backup before running the entire file.
-- Existing admin/booking objects must already be installed.
-- This is a one-time rollout script, not a new migration to apply separately.
-- On any error, stop and inspect it; do not run selected later statements.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
do $$
begin
  if to_regclass('public.admin_users') is null
     or to_regprocedure('public.is_admin()') is null
     or to_regprocedure('public.book_orientation(bigint,text,text,text,text,text,text,text)') is null then
    raise exception 'Required existing admin/booking objects are missing; stop and inspect the schema.';
  end if;
  if to_regprocedure('public.orientation_starts_at(date,text)') is not null
     or exists (select 1 from pg_trigger where tgrelid = to_regclass('public.orientations') and tgname = 'guard_orientation_seat_count' and not tgisinternal) then
    raise exception 'Booking integrity is already installed or partially present; stop and inspect before reapplying.';
  end if;
end;
$$;

-- Source: supabase/migrations/202609140001_booking_integrity.sql
-- Additive follow-up: preserve installed migrations while tightening booking
-- integrity, client write privileges, and public reads for signed-in customers.

create or replace function public.orientation_starts_at(p_date date, p_time text)
returns timestamptz
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  if p_date is null or nullif(trim(p_time), '') is null
    or trim(p_time) !~ '^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?([[:space:]]*[AaPp][Mm])?$' then
    return null;
  end if;
  return (p_date + trim(p_time)::time) at time zone 'Asia/Manila';
exception when invalid_datetime_format or datetime_field_overflow then
  return null;
end;
$$;

revoke all on function public.orientation_starts_at(date, text) from public;
grant execute on function public.orientation_starts_at(date, text) to anon, authenticated;

-- NOT VALID preserves existing records for manual review, while enforcing
-- these constraints immediately for every newly inserted or updated record.
alter table public.orientations
  add constraint orientations_capacity_integrity
  check (capacity is not null and reserved is not null and capacity > 0 and reserved >= 0 and reserved <= capacity) not valid,
  add constraint orientations_status_integrity
  check (status is not null and status::text in ('Draft', 'Published', 'Open', 'Closed', 'Fully Booked')) not valid,
  add constraint orientations_start_integrity
  check (public.orientation_starts_at(date, start_time::text) is not null) not valid;

alter table public.reservations
  add constraint reservations_status_integrity
  check (status is not null and status::text in ('Pending', 'Confirmed', 'Cancelled')) not valid;

-- Counts are maintained by the privileged booking/status functions, not by a
-- client-supplied orientation payload. Admins may still edit schedule/capacity.
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
  if new.status::text in ('Open', 'Published') and new.reserved >= new.capacity then
    new.status := 'Fully Booked';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_orientation_seat_count() from public;
create trigger guard_orientation_seat_count
before insert or update on public.orientations
for each row execute function public.guard_orientation_seat_count();

-- Direct reservation writes could bypass the seat counter and duplicate checks.
-- Admins read records normally, and change status using set_reservation_status.
revoke all on public.reservations from public, anon, authenticated;
grant select on public.reservations to authenticated;

drop policy "Public can view bookable orientations" on public.orientations;
create policy "Public can view bookable orientations"
on public.orientations for select to anon, authenticated
using (
  status::text in ('Open', 'Published')
  and public.orientation_starts_at(date, start_time::text) > now()
  and reserved < capacity
);

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
    or coalesce(v_orientation.reserved >= v_orientation.capacity, true) then
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
    trim(p_address), trim(p_city), trim(p_province), coalesce(trim(p_notes), ''), 'Pending'
  ) returning created_at into v_created_at;

  update public.orientations o
  set reserved = o.reserved + 1,
    status = case when o.reserved + 1 >= o.capacity then 'Fully Booked' else o.status end
  where o.id = p_orientation_id;

  return query select v_reference, trim(p_full_name), 'Pending'::text,
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
    if v_orientation.reserved >= v_orientation.capacity then
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
      status = case when o.reserved + 1 >= o.capacity then 'Fully Booked' else o.status end
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

-- Public content should remain readable when a customer has a Supabase session.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'cms_programs', 'cms_branches', 'cms_gallery', 'cms_testimonials',
    'cms_faqs', 'cms_stats', 'cms_partners'
  ] loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I add column if not exists is_published boolean not null default false', table_name);
      execute format('drop policy if exists %I on public.%I',
        'Public can read published ' || table_name, table_name);
      execute format('create policy %I on public.%I for select to anon, authenticated using ((to_jsonb(%I)->>''is_published'') in (''true'', ''1''))',
        'Public can read published ' || table_name, table_name, table_name);
    end if;
  end loop;
  if to_regclass('public.site_settings') is not null then
    alter policy "Public can read site settings" on public.site_settings to anon, authenticated;
  end if;
end;
$$;

alter policy "Public can read CMS media" on storage.objects to anon, authenticated;
drop policy "Restrict authenticated CMS media access" on storage.objects;
create policy "Restrict authenticated CMS media inserts"
on storage.objects as restrictive for insert to authenticated
with check (bucket_id <> 'cms-media' or public.is_admin());
create policy "Restrict authenticated CMS media updates"
on storage.objects as restrictive for update to authenticated
using (bucket_id <> 'cms-media' or public.is_admin())
with check (bucket_id <> 'cms-media' or public.is_admin());
create policy "Restrict authenticated CMS media deletes"
on storage.objects as restrictive for delete to authenticated
using (bucket_id <> 'cms-media' or public.is_admin());

revoke all on function public.book_orientation(bigint, text, text, text, text, text, text, text) from public;
grant execute on function public.book_orientation(bigint, text, text, text, text, text, text, text) to anon, authenticated;
revoke all on function public.set_reservation_status(bigint, text) from public;
grant execute on function public.set_reservation_status(bigint, text) to authenticated;


-- Source: supabase/migrations/202610230001_complete_cms_collections.sql
-- Existing CMS projects may predate the statistics and partners collections.
-- Create these collections without publishing any unverified content.
create table if not exists public.cms_stats (
  id bigint generated by default as identity primary key,
  stat_key text not null unique,
  value text not null,
  label text not null,
  icon text not null default 'Award',
  display_order integer not null default 0,
  is_published boolean not null default false
);

create table if not exists public.cms_partners (
  id bigint generated by default as identity primary key,
  name text not null unique,
  logo_url text,
  display_order integer not null default 0,
  is_published boolean not null default false
);

do $$
declare
  table_name text;
  policy_row record;
begin
  foreach table_name in array array['cms_stats', 'cms_partners'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
    execute format('grant select on table public.%I to anon', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    -- Supersede legacy policies just as the preceding authorization migration does.
    for policy_row in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = table_name
    loop
      execute format('drop policy %I on public.%I', policy_row.policyname, table_name);
    end loop;
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using ((to_jsonb(%I)->>''is_published'') in (''true'', ''1''))',
      'Public can read published ' || table_name, table_name, table_name
    );
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      'Allowlisted admins can manage ' || table_name, table_name
    );
    execute format('grant usage, select on sequence %s to authenticated',
      pg_get_serial_sequence('public.' || table_name, 'id'));
  end loop;
end;
$$;

notify pgrst, 'reload schema';

commit;

select * from (values
  ('start-time function', to_regprocedure('public.orientation_starts_at(date,text)') is not null),
  ('CMS stats table', to_regclass('public.cms_stats') is not null),
  ('CMS partners table', to_regclass('public.cms_partners') is not null),
  ('seat-count trigger', exists (select 1 from pg_trigger where tgrelid = to_regclass('public.orientations') and tgname = 'guard_orientation_seat_count' and not tgisinternal))
) as checks(object_name, exists_in_database);
