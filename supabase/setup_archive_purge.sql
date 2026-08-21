-- BH Tea · ตั้งระบบ Archive-and-Purge อัตโนมัติ (รันทุกวันที่ 1)
-- รันใน Supabase Dashboard → SQL Editor  (รันครั้งเดียวตอนตั้งค่า)
-- ⚠️ ก่อนรัน: deploy Edge Function `archive-and-purge` และตั้ง secret ให้เรียบร้อยก่อน
-- ============================================================

-- 1) Extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2) Storage bucket เก็บไฟล์ CSV (private)
insert into storage.buckets (id, name, public)
values ('record-archives', 'record-archives', false)
on conflict (id) do nothing;

-- 3) ตั้งเวลา: 01:00 UTC ของวันที่ 1 = 08:00 น. เวลาไทย
--    ⚠️ URL ใช้ slug จริงของฟังก์ชันคือ "super-responder" (ชื่อ display = archive-and-purge)
--    แทนค่า <SERVICE_ROLE_KEY> ให้ตรงกับของจริงก่อนรัน (Settings → API → service_role)
--    (service_role key เป็น JWT ที่ผ่าน Verify JWT ได้ → ไม่ต้องปิด Verify JWT)
select cron.schedule(
  'archive-and-purge-monthly',
  '0 1 1 * *',
  $$
  select net.http_post(
    url     := 'https://rjjiazclbzertpibutcd.supabase.co/functions/v1/super-responder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- ── คำสั่งช่วยจัดการ (ไว้ใช้ภายหลัง) ─────────────────────────
-- ดูงานที่ตั้งไว้:   select * from cron.job;
-- ดูประวัติการรัน:  select * from cron.job_run_details order by start_time desc limit 20;
-- ยกเลิกงานนี้:      select cron.unschedule('archive-and-purge-monthly');
