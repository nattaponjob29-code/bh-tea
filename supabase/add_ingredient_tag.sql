-- เพิ่มคอลัมน์ Tag รอบตรวจนับสต็อก ให้ตาราง ingredients
-- รันใน Supabase Dashboard → SQL Editor (ครั้งเดียว) — จำเป็นก่อนใช้ Tag ในหน้า Admin วัตถุดิบ
-- ค่าที่รับ: daily / weekly / monthly / consumable (ว่างได้ = ยังไม่ระบุ)
-- ============================================================

alter table ingredients
  add column if not exists count_tag text
  check (count_tag in ('daily', 'weekly', 'monthly', 'consumable'));
