-- เพิ่ม role 'Test' ให้ตาราง profiles
-- รันใน Supabase Dashboard → SQL Editor (ครั้งเดียว) — จำเป็นก่อนสร้างผู้ใช้ role Test
-- Test = เหมือน Branch ทุกอย่าง แต่การเขียนข้อมูลถูกบล็อกฝั่งแอป (ไม่ลง DB จริง)
-- ============================================================

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add  constraint profiles_role_check
  check (role in ('Branch', 'Area', 'QC', 'Admin', 'Test'));
