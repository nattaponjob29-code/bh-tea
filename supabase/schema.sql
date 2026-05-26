-- BH Tea Production Log · Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Branches (สาขา)
create table if not exists branches (
  id        text primary key,      -- e.g. BR01
  name      text not null,
  area      text not null,         -- e.g. BKK-Central
  created_at timestamptz default now()
);

-- Menus (เมนู)
create table if not exists menus (
  id        text primary key,      -- e.g. M01
  name      text not null,
  category  text not null,
  yield     numeric not null default 0,
  unit      text not null default '',
  created_at timestamptz default now()
);

-- Ingredients / Materials (วัตถุดิบ)
create table if not exists ingredients (
  code      text primary key,      -- e.g. RM001
  name      text not null,
  unit      text not null,
  created_at timestamptz default now()
);

-- BOM Prod — ingredient codes used in production (for lot traceability)
-- No qty needed; qty_per_gram only in bom_defect
create table if not exists bom_prod (
  menu_id         text references menus(id) on delete cascade,
  ingredient_code text references ingredients(code) on delete cascade,
  primary key (menu_id, ingredient_code)
);

-- BOM Defect — ingredient + qty_per_gram for damage calculation
create table if not exists bom_defect (
  menu_id         text references menus(id) on delete cascade,
  ingredient_code text references ingredients(code) on delete cascade,
  qty_per_gram    numeric not null default 0,
  primary key (menu_id, ingredient_code)
);

-- Production & Defect Records
create table if not exists records (
  id                  text primary key,  -- e.g. LOT-20260527-1234 or DEF-20260527-1234
  type                text not null check (type in ('production', 'defect')),
  date                date not null,
  time                text,
  branch_id           text references branches(id) on delete set null,
  menu_id             text references menus(id) on delete set null,
  qty                 numeric,
  unit                text,
  status              text,             -- 'passed' | 'failed' (production only)
  reason              text,
  material_lots       jsonb,            -- { [ingredient_code]: "lot-number" }
  material_breakdown  jsonb,
  freeze_temp         numeric,
  backdated           boolean default false,
  producer            text,
  tester              text,
  note                text,
  by_user             uuid references auth.users(id) on delete set null,
  created_at          timestamptz default now()
);

-- User Profiles (one row per Supabase auth user)
create table if not exists profiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  username  text unique not null,
  role      text not null check (role in ('Branch', 'Area', 'QC', 'Admin')),
  branch_id text references branches(id) on delete set null,
  areas     text[] default '{}',
  label     text default '',
  created_at timestamptz default now()
);

-- ============================================================
-- TRIGGER: auto-create profile placeholder on signup
-- (The real profile is created by api/create-user.js)
-- This just ensures no orphan auth users cause crashes.
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, username, role, label)
  values (
    new.id,
    split_part(new.email, '@', 1),
    case when new.email = 'admin@bh.local' then 'Admin' else 'Branch' end,
    case when new.email = 'admin@bh.local' then 'ผู้ดูแลระบบ' else '' end
  )
  on conflict (id) do update set
    role  = excluded.role,
    label = excluded.label;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table branches    enable row level security;
alter table menus       enable row level security;
alter table ingredients enable row level security;
alter table bom_prod    enable row level security;
alter table bom_defect  enable row level security;
alter table records     enable row level security;
alter table profiles    enable row level security;

-- Drop existing policies first (safe to re-run)
drop policy if exists "auth read branches"       on branches;
drop policy if exists "auth read menus"          on menus;
drop policy if exists "auth read ingredients"    on ingredients;
drop policy if exists "auth read bom_prod"       on bom_prod;
drop policy if exists "auth read bom_defect"     on bom_defect;
drop policy if exists "auth read records"        on records;
drop policy if exists "auth read profiles"       on profiles;
drop policy if exists "auth insert records"      on records;
drop policy if exists "auth delete own records"  on records;
drop policy if exists "auth update own profile"  on profiles;

-- Authenticated users can read everything
create policy "auth read branches"    on branches    for select using (auth.role() = 'authenticated');
create policy "auth read menus"       on menus       for select using (auth.role() = 'authenticated');
create policy "auth read ingredients" on ingredients for select using (auth.role() = 'authenticated');
create policy "auth read bom_prod"    on bom_prod    for select using (auth.role() = 'authenticated');
create policy "auth read bom_defect"  on bom_defect  for select using (auth.role() = 'authenticated');
create policy "auth read records"     on records     for select using (auth.role() = 'authenticated');
create policy "auth read profiles"    on profiles    for select using (auth.role() = 'authenticated');

-- Records: anyone authenticated can insert/delete their own
create policy "auth insert records"     on records for insert with check (auth.role() = 'authenticated');
create policy "auth delete own records" on records for delete using (by_user = auth.uid());

-- Profiles: users can update their own profile
create policy "auth update own profile" on profiles for update using (id = auth.uid());

-- Profiles: admin can update any profile (needed for assigning branches/roles)
create or replace function is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'Admin'
  );
$$;

drop policy if exists "admin update any profile" on profiles;
create policy "admin update any profile" on profiles
  for update to authenticated
  using (is_admin())
  with check (is_admin());

-- Admin writes (branches, menus, ingredients, bom) are done via service role
-- from Vercel API routes — no client-side RLS write policies needed for those.
-- But we do need service role bypass, which is built into Supabase.

-- profiles: service role insert/update (for api/create-user.js)
-- These are handled by service_role key in the API — no additional RLS needed.
