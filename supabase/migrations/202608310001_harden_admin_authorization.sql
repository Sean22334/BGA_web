-- Restrict administrative access to an explicit allowlist of Supabase users.
-- Provision the first administrator after this migration; see README.md.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on table public.admin_users from anon, authenticated;
grant select on table public.admin_users to authenticated;

drop policy if exists "Admins can view own membership" on public.admin_users;
create policy "Admins can view own membership"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Remove legacy policies so a previous permissive rule cannot bypass the
-- explicit admin allowlist.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('orientations', 'reservations')
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      policy_row.policyname,
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

create policy "Allowlisted admins can manage orientations"
on public.orientations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Allowlisted admins can manage reservations"
on public.reservations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Harden optional CMS tables when they exist in the project. Public users can
-- only read published content; only allowlisted administrators can mutate it.
do $$
declare
  table_name text;
  policy_row record;
begin
  foreach table_name in array array[
    'cms_programs',
    'cms_branches',
    'cms_gallery',
    'cms_testimonials',
    'cms_faqs',
    'cms_stats',
    'cms_partners'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      -- Older stats schemas have no publication flag. Introduce one closed by
      -- default so existing private/draft records never become public implicitly.
      execute format('alter table public.%I add column if not exists is_published boolean not null default false', table_name);

      for policy_row in
        select policyname
        from pg_policies
        where schemaname = 'public' and tablename = table_name
      loop
        execute format('drop policy if exists %I on public.%I', policy_row.policyname, table_name);
      end loop;

      execute format('grant select on table public.%I to anon', table_name);
      execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
      execute format(
        'create policy %I on public.%I for select to anon using ((to_jsonb(%I)->>''is_published'') in (''true'', ''1''))',
        'Public can read published ' || table_name,
        table_name,
        table_name
      );
      execute format(
        'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
        'Allowlisted admins can manage ' || table_name,
        table_name
      );
    end if;
  end loop;

  if to_regclass('public.site_settings') is not null then
    alter table public.site_settings enable row level security;

    for policy_row in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = 'site_settings'
    loop
      execute format('drop policy if exists %I on public.site_settings', policy_row.policyname);
    end loop;

    grant select on table public.site_settings to anon;
    grant select, insert, update, delete on table public.site_settings to authenticated;

    create policy "Public can read site settings"
    on public.site_settings
    for select
    to anon
    using (true);

    create policy "Allowlisted admins can manage site settings"
    on public.site_settings
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());
  end if;
end;
$$;

drop policy if exists "Public can read CMS media" on storage.objects;
create policy "Public can read CMS media"
on storage.objects
for select
to anon
using (bucket_id = 'cms-media');

drop policy if exists "Allowlisted admins can manage CMS media" on storage.objects;
create policy "Allowlisted admins can manage CMS media"
on storage.objects
for all
to authenticated
using (bucket_id = 'cms-media' and public.is_admin())
with check (bucket_id = 'cms-media' and public.is_admin());

-- Restrictive policies prevent a legacy broad storage policy from granting
-- non-admin writes to cms-media, without disturbing policies for other buckets.
drop policy if exists "Restrict authenticated CMS media access" on storage.objects;
create policy "Restrict authenticated CMS media access"
on storage.objects
as restrictive
for all
to authenticated
using (bucket_id <> 'cms-media' or public.is_admin())
with check (bucket_id <> 'cms-media' or public.is_admin());

drop policy if exists "Restrict anonymous CMS media inserts" on storage.objects;
create policy "Restrict anonymous CMS media inserts"
on storage.objects
as restrictive
for insert
to anon
with check (bucket_id <> 'cms-media');

drop policy if exists "Restrict anonymous CMS media updates" on storage.objects;
create policy "Restrict anonymous CMS media updates"
on storage.objects
as restrictive
for update
to anon
using (bucket_id <> 'cms-media')
with check (bucket_id <> 'cms-media');

drop policy if exists "Restrict anonymous CMS media deletes" on storage.objects;
create policy "Restrict anonymous CMS media deletes"
on storage.objects
as restrictive
for delete
to anon
using (bucket_id <> 'cms-media');

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
  if not public.is_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
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

  if not found then
    raise exception 'Orientation not found.' using errcode = 'P0002';
  end if;

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

revoke all on function public.set_reservation_status(bigint, text) from public;
grant execute on function public.set_reservation_status(bigint, text) to authenticated;
