-- เพิ่มคอลัมน์ stock_pilot ให้ตาราง branches — เปิด/ปิดฟีเจอร์ตรวจนับสต็อก+เคลื่อนไหวสินค้า รายสาขา
-- รันใน Supabase Dashboard → SQL Editor (ครั้งเดียว) ก่อนใช้สวิตช์ในหน้า Admin → จัดการสาขา
-- ============================================================

alter table branches
  add column if not exists stock_pilot boolean not null default false;
