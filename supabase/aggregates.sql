-- BH Tea Production Log · Server-side Aggregation Functions
-- วิ่งใน Supabase Dashboard → SQL Editor → New Query → Run
-- ⚠️  รันได้ซ้ำ (drop + create) — ปลอดภัย
--
-- เหตุผล: ข้อมูลจริง ~1,900 ล็อต/วัน (หลักหมื่นแถว/สัปดาห์)
-- การดึงแถวดิบมานับในเบราว์เซอร์ทำให้ egress พุ่งจนโดนระงับ
-- ย้ายการ "นับ/รวม" มาทำที่ Postgres แล้วส่งกลับแค่ผลสรุปก้อนเล็ก
--
-- security invoker (ค่าเริ่มต้น) → RLS "auth read records" ยังคุมสิทธิ์ตามเดิม
-- มี drop ก่อน create เผื่ออนาคตเปลี่ยนชนิดคอลัมน์ที่ return (create or replace เปลี่ยนไม่ได้)
-- ============================================================

drop function if exists stats_kpi(date, date, text[]);
drop function if exists stats_daily(date, date, text[]);
drop function if exists stats_by_branch(date, date, text[]);
drop function if exists stats_by_menu(date, date, text[]);
drop function if exists stats_reasons(date, date, text, text[]);
drop function if exists defect_by_material(date, date, text[]);
drop function if exists branch_record_counts();

-- ── 1) KPI รวมในช่วงเวลา (+ กรองสาขาได้) ──────────────────────
create function stats_kpi(d_from date, d_to date, p_branches text[] default null)
returns table(prod bigint, passed bigint, failed bigint, defect bigint, defect_qty numeric)
language sql stable
as $$
  select
    count(*) filter (where type = 'production')                          as prod,
    count(*) filter (where type = 'production' and status = 'passed')    as passed,
    count(*) filter (where type = 'production' and status = 'failed')    as failed,
    count(*) filter (where type = 'defect')                              as defect,
    coalesce(sum(qty) filter (where type = 'defect'), 0)                 as defect_qty
  from records
  where date >= d_from and date <= d_to
    and (p_branches is null or branch_id = any(p_branches));
$$;

-- ── 2) ยอดรายวัน (สำหรับกราฟ) ─────────────────────────────────
create function stats_daily(d_from date, d_to date, p_branches text[] default null)
returns table(d date, prod bigint, passed bigint, failed bigint, defect bigint)
language sql stable
as $$
  select
    date as d,
    count(*) filter (where type = 'production')                          as prod,
    count(*) filter (where type = 'production' and status = 'passed')    as passed,
    count(*) filter (where type = 'production' and status = 'failed')    as failed,
    count(*) filter (where type = 'defect')                              as defect
  from records
  where date >= d_from and date <= d_to
    and (p_branches is null or branch_id = any(p_branches))
  group by date
  order by date;
$$;

-- ── 3) ยอดรายสาขา ─────────────────────────────────────────────
create function stats_by_branch(d_from date, d_to date, p_branches text[] default null)
returns table(branch_id text, prod bigint, passed bigint, failed bigint, defect bigint)
language sql stable
as $$
  select
    branch_id,
    count(*) filter (where type = 'production')                          as prod,
    count(*) filter (where type = 'production' and status = 'passed')    as passed,
    count(*) filter (where type = 'production' and status = 'failed')    as failed,
    count(*) filter (where type = 'defect')                              as defect
  from records
  where date >= d_from and date <= d_to
    and (p_branches is null or branch_id = any(p_branches))
  group by branch_id;
$$;

-- ── 4) ยอดรายเมนู (+ ปริมาณของเสียรวมรายเมนู) ─────────────────
create function stats_by_menu(d_from date, d_to date, p_branches text[] default null)
returns table(menu_id text, prod bigint, passed bigint, failed bigint, defect bigint, defect_qty numeric)
language sql stable
as $$
  select
    menu_id,
    count(*) filter (where type = 'production')                          as prod,
    count(*) filter (where type = 'production' and status = 'passed')    as passed,
    count(*) filter (where type = 'production' and status = 'failed')    as failed,
    count(*) filter (where type = 'defect')                              as defect,
    coalesce(sum(qty) filter (where type = 'defect'), 0)                 as defect_qty
  from records
  where date >= d_from and date <= d_to
    and (p_branches is null or branch_id = any(p_branches))
  group by menu_id;
$$;

-- ── 5) สาเหตุสูงสุด ────────────────────────────────────────────
-- p_kind = 'failed'  → สาเหตุ "ไม่ผ่าน QC" (production + status failed)
-- p_kind = 'defect'  → สาเหตุของเสีย (defect)
create function stats_reasons(d_from date, d_to date, p_kind text, p_branches text[] default null)
returns table(reason text, n bigint)
language sql stable
as $$
  select reason, count(*) as n
  from records
  where date >= d_from and date <= d_to
    and reason is not null and reason <> ''
    and (
      (p_kind = 'failed' and type = 'production' and status = 'failed')
      or (p_kind = 'defect' and type = 'defect')
    )
    and (p_branches is null or branch_id = any(p_branches))
  group by reason
  order by n desc;
$$;

-- ── 6) เสียหายรายวัตถุดิบ (join BOM defect แล้วคูณปริมาณ) ───────
create function defect_by_material(d_from date, d_to date, p_branches text[] default null)
returns table(code text, qty numeric, occurrences bigint, total_grams numeric)
language sql stable
as $$
  select
    b.ingredient_code            as code,
    sum(r.qty * b.qty_per_gram)  as qty,
    count(*)                     as occurrences,
    sum(r.qty)                   as total_grams
  from records r
  join bom_defect b on b.menu_id = r.menu_id
  where r.type = 'defect'
    and r.date >= d_from and r.date <= d_to
    and (p_branches is null or r.branch_id = any(p_branches))
  group by b.ingredient_code
  order by qty desc;
$$;

-- ── 7) จำนวนบันทึกทั้งหมดรายสาขา (all-time, egress ~0) ─────────
-- ใช้ในหน้า Admin → จัดการสาขา (แสดง "X records" ต่อสาขา)
create function branch_record_counts()
returns table(branch_id text, n bigint)
language sql stable
as $$
  select branch_id, count(*) as n
  from records
  where branch_id is not null
  group by branch_id;
$$;

-- ── สิทธิ์เรียกใช้งาน ──────────────────────────────────────────
grant execute on function stats_kpi(date, date, text[])           to authenticated;
grant execute on function stats_daily(date, date, text[])         to authenticated;
grant execute on function stats_by_branch(date, date, text[])     to authenticated;
grant execute on function stats_by_menu(date, date, text[])       to authenticated;
grant execute on function stats_reasons(date, date, text, text[]) to authenticated;
grant execute on function defect_by_material(date, date, text[])  to authenticated;
grant execute on function branch_record_counts()                  to authenticated;
