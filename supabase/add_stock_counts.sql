-- ตาราง stock_counts — บันทึกผลตรวจนับสต็อกรายวัตถุดิบ
-- รันใน Supabase Dashboard → SQL Editor (ครั้งเดียว) ก่อนใช้ฟีเจอร์ตรวจนับสต็อก
-- 1 แถว = การนับวัตถุดิบ 1 ตัว ในวันหนึ่งของสาขาหนึ่ง (นับซ้ำ = อัปเดตแถวเดิม)
-- ============================================================

create table if not exists stock_counts (
  id              uuid primary key default gen_random_uuid(),
  branch_id       text references branches(id) on delete cascade,
  date            date not null,
  cycle           text check (cycle in ('daily', 'weekly', 'monthly')),
  ingredient_code text references ingredients(code) on delete cascade,
  counted_qty     numeric not null,
  prev_qty        numeric,                       -- ยอด "ครั้งก่อน" ณ ตอนนับ (ไว้ดูส่วนต่างในรายงาน)
  counter         text,                          -- ชื่อผู้ตรวจนับ
  note            text,
  status          text not null default 'final' check (status in ('draft', 'final')),
  by_user         text,
  created_at      timestamptz default now(),
  unique (branch_id, date, ingredient_code)      -- นับซ้ำวันเดิม = upsert ทับ
);

create index if not exists stock_counts_lookup on stock_counts (branch_id, date);
create index if not exists stock_counts_code    on stock_counts (ingredient_code);

alter table stock_counts enable row level security;

drop policy if exists "auth read stock_counts"   on stock_counts;
drop policy if exists "auth insert stock_counts" on stock_counts;
drop policy if exists "auth update stock_counts" on stock_counts;
drop policy if exists "auth delete stock_counts" on stock_counts;

create policy "auth read stock_counts"   on stock_counts for select using (auth.role() = 'authenticated');
create policy "auth insert stock_counts" on stock_counts for insert with check (auth.role() = 'authenticated');
create policy "auth update stock_counts" on stock_counts for update using (auth.role() = 'authenticated');
create policy "auth delete stock_counts" on stock_counts for delete using (auth.role() = 'authenticated');
