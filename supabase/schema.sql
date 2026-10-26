-- Ghoomo 360: database setup.
-- Paste this whole file into Supabase -> SQL Editor -> New query -> Run. Running it again later is safe.

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  business text,
  phone text,
  logo_key text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles: owner reads" on public.profiles;
drop policy if exists "profiles: owner inserts" on public.profiles;
drop policy if exists "profiles: owner updates" on public.profiles;
create policy "profiles: owner reads" on public.profiles for select using (auth.uid() = id);
create policy "profiles: owner inserts" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: owner updates" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
revoke all on public.profiles from anon;

-- ---------------------------------------------------------------- tours
create table if not exists public.tours (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'My property' check (char_length(title) <= 120),
  slug text not null unique default substr(md5(gen_random_uuid()::text), 1, 10),
  data jsonb not null default '{"v":1,"rooms":[]}'::jsonb,
  rooms int not null default 0,
  cover_key text,
  views int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tours_owner_updated on public.tours (owner, updated_at desc);
alter table public.tours enable row level security;

-- a broker sees and changes only their own tours
drop policy if exists "tours: owner reads" on public.tours;
drop policy if exists "tours: owner inserts" on public.tours;
drop policy if exists "tours: owner updates" on public.tours;
drop policy if exists "tours: owner deletes" on public.tours;
create policy "tours: owner reads" on public.tours for select using (auth.uid() = owner);
create policy "tours: owner inserts" on public.tours for insert with check (auth.uid() = owner);
create policy "tours: owner updates" on public.tours for update using (auth.uid() = owner) with check (auth.uid() = owner);
create policy "tours: owner deletes" on public.tours for delete using (auth.uid() = owner);

-- only these columns can be written from the app; views, slug and owner are managed by the database
revoke all on public.tours from anon;
revoke insert, update on public.tours from authenticated;
grant insert (title, data, rooms, cover_key) on public.tours to authenticated;
grant update (title, data, rooms, cover_key) on public.tours to authenticated;

-- updated_at changes when the tour itself changes (not when someone views it)
create or replace function public.tours_touch() returns trigger language plpgsql as $$
begin
  if (new.title, new.data, new.rooms, new.cover_key) is distinct from (old.title, old.data, old.rooms, old.cover_key) then
    new.updated_at := now();
  end if;
  return new;
end $$;
drop trigger if exists tours_touch on public.tours;
create trigger tours_touch before update on public.tours for each row execute function public.tours_touch();

-- safety net until paid plans exist: at most 200 tours per account
create or replace function public.tours_limit() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.tours where owner = new.owner) >= 200 then
    raise exception 'Tour limit reached (200)' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists tours_limit on public.tours;
create trigger tours_limit before insert on public.tours for each row execute function public.tours_limit();

-- ---------------------------------------------------------------- public access through share links
-- anyone with the link can open the tour (and the view is counted); nothing else is public
create or replace function public.get_public_tour(p_slug text)
returns table (id uuid, title text, data jsonb, rooms int, owner_name text, business text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  update public.tours t set views = t.views + 1 where t.slug = p_slug;
  return query
    select t.id, t.title, t.data, t.rooms, p.name, p.business
    from public.tours t left join public.profiles p on p.id = t.owner
    where t.slug = p_slug;
end $$;

-- title and cover photo only, for the WhatsApp / social preview of a shared link
create or replace function public.get_public_tour_meta(p_slug text)
returns table (title text, rooms int, cover_key text)
language sql stable security definer set search_path = public as $$
  select t.title, t.rooms, t.cover_key from public.tours t where t.slug = p_slug;
$$;

revoke all on function public.get_public_tour(text) from public;
revoke all on function public.get_public_tour_meta(text) from public;
grant execute on function public.get_public_tour(text) to anon, authenticated;
grant execute on function public.get_public_tour_meta(text) to anon, authenticated;
