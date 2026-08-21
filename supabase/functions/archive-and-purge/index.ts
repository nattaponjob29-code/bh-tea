// archive-and-purge — Edge Function
// ทุกวันที่ 1: export records ที่เก่ากว่า "ต้นเดือนที่แล้ว" เป็น CSV เก็บใน Storage
// (bucket: record-archives) แล้วจึงลบแถวชุดเดิมออกจากตาราง records
//
// นโยบายเก็บข้อมูล: เก็บ 2 เดือนล่าสุด (เดือนนี้ + เดือนที่แล้ว)
//   รันวันที่ 1 ส.ค. → cutoff = 1 ก.ค. → ลบ date < 2026-07-01 (มิ.ย. และเก่ากว่า)
//
// ความปลอดภัย:
//   - ลบ "เฉพาะ id ชุดที่ export สำเร็จ" เท่านั้น (กันเคส backdated แทรกระหว่างทำงาน)
//   - ลบต่อเมื่อ upload CSV สำเร็จแล้ว
//   - รองรับ dry_run: { "dry_run": true } → export อย่างเดียว ไม่ลบ (ไว้ทดสอบก่อนใช้จริง)
//   - ตรวจ header x-purge-secret ให้ตรงกับ env PURGE_SECRET กันคนอื่นยิงเล่น

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "record-archives";
const CHUNK = 1000; // เพดาน PostgREST ต่อครั้ง

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// cutoff = วันที่ 1 ของ "เดือนที่แล้ว" ตามเวลาไทย (UTC+7) → 'YYYY-MM-01'
function cutoffBangkok(now: Date): string {
  const bkk = new Date(now.getTime() + 7 * 3600 * 1000);
  const c = new Date(Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth() - 1, 1));
  return c.toISOString().slice(0, 10);
}

function toCSV(rows: Record<string, unknown>[]): string {
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(",")];
  for (const r of rows) lines.push(cols.map((c) => esc(r[c])).join(","));
  return lines.join("\n");
}

Deno.serve(async (req) => {
  // ── auth (optional secret) ──
  const secret = Deno.env.get("PURGE_SECRET");
  if (secret && req.headers.get("x-purge-secret") !== secret) {
    return json({ error: "unauthorized" }, 401);
  }

  let dryRun = false;
  let testCutoff: string | null = null;
  try {
    const body = await req.json();
    dryRun = body?.dry_run === true;
    // dry_run เท่านั้นถึงจะรับ cutoff override ได้ (ไว้ทดสอบ CSV กับวันที่ที่มีข้อมูลจริง — ไม่ลบ)
    if (dryRun && typeof body?.cutoff === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.cutoff)) {
      testCutoff = body.cutoff;
    }
  } catch { /* no body = live run */ }

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supa = createClient(url, key);

  const now = new Date();
  const cutoff = testCutoff ?? cutoffBangkok(now); // ลบ date < cutoff

  // ── 1) ดึงทุกแถวที่ date < cutoff (แบ่งหน้า) ──
  const all: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += CHUNK) {
    const { data, error } = await supa
      .from("records")
      .select("*")
      .lt("date", cutoff)
      .order("date", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + CHUNK - 1);
    if (error) return json({ error: `select failed: ${error.message}` }, 500);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < CHUNK) break;
  }

  if (all.length === 0) {
    return json({ ok: true, cutoff, rows: 0, deleted: 0, message: `ไม่มีแถวเก่ากว่า ${cutoff}` });
  }

  // ── 2) สร้าง CSV แล้ว upload เข้า Storage ──
  const csv = toCSV(all);
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const path = `records_before_${cutoff}_run${stamp}.csv`;
  const up = await supa.storage
    .from(BUCKET)
    .upload(path, new Blob([csv], { type: "text/csv" }), { upsert: true });
  if (up.error) return json({ error: `upload failed: ${up.error.message}` }, 500);

  if (dryRun) {
    return json({ ok: true, dry_run: true, cutoff, rows: all.length, archived: path, deleted: 0 });
  }

  // ── 3) ลบ "เฉพาะ id ที่ export แล้ว" ทีละก้อน ──
  const ids = all.map((r) => r.id as string);
  let deleted = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const { error, count } = await supa
      .from("records")
      .delete({ count: "exact" })
      .in("id", slice);
    if (error) {
      return json({ error: `archived OK but delete failed at chunk ${i}: ${error.message}`, archived: path, deleted }, 500);
    }
    deleted += count ?? slice.length;
  }

  return json({ ok: true, cutoff, rows: all.length, archived: path, deleted });
});
