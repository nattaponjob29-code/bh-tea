-- ตาราง stock_receiving — บันทึกสินค้ารับเข้า (ใช้คำนวณ Inventory Usage / In-transit / Suggest เบิก)
-- รันใน Supabase Dashboard → SQL Editor (ครั้งเดียว) ก่อนใช้แท็บ "เติมสินค้ารับเข้า"
-- ============================================================

create table if not exists stock_receiving (
  id              uuid primary key default gen_random_uuid(),
  branch_id       text references branches(id) on delete cascade,
  date            date not null,
  ingredient_code text references ingredients(code) on delete cascade,
  qty             numeric not null,
  by_user         text,
  created_at      timestamptz default now()
);

create index if not exists stock_receiving_lookup on stock_receiving (branch_id, date);
create index if not exists stock_receiving_code    on stock_receiving (ingredient_code);

alter table stock_receiving enable row level security;

drop policy if exists "auth read stock_receiving"   on stock_receiving;
drop policy if exists "auth insert stock_receiving" on stock_receiving;
drop policy if exists "auth delete stock_receiving" on stock_receiving;

create policy "auth read stock_receiving"   on stock_receiving for select using (auth.role() = 'authenticated');
create policy "auth insert stock_receiving" on stock_receiving for insert with check (auth.role() = 'authenticated');
create policy "auth delete stock_receiving" on stock_receiving for delete using (auth.role() = 'authenticated');
