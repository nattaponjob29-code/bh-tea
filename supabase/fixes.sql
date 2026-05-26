-- BH Tea Production Log · Live Database Fixes
-- วิ่งใน Supabase Dashboard → SQL Editor → New Query → Run
-- ⚠️  รันครั้งเดียว — ไม่ต้องรันซ้ำ

-- ============================================================
-- FIX 1: records.id → text  (แก้ error "invalid input syntax for type uuid")
-- LOT-YYYYMMDD-XXXX และ DEF-YYYYMMDD-XXXX ต้องเป็น text ไม่ใช่ uuid
-- ============================================================
alter table records alter column id type text;

-- ============================================================
-- FIX 2: Admin สามารถแก้ไข profile ของ user อื่นได้
-- แก้ปัญหา "ผูกสาขาแล้วแต่ไม่บันทึก" เพราะ RLS บล็อก
-- ============================================================
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

-- ============================================================
-- FIX 3: Trigger สร้าง profile อัตโนมัติ
-- admin@bh.local → role Admin, label ผู้ดูแลระบบ (ไม่กลายเป็น Branch อีกต่อไป)
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
