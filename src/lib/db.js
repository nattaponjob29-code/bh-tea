import { supabase } from './supabase.js';

// ─── Transform helpers ────────────────────────────────────────────────────────

function fromRecord(r) {
  return {
    id: r.id, type: r.type,
    date: r.date, time: r.time,
    branchId: r.branch_id, menuId: r.menu_id,
    qty: r.qty, unit: r.unit,
    status: r.status, reason: r.reason || '',
    note: r.note || '',
    materialLots: r.material_lots || {},
    materialBreakdown: r.material_breakdown || [],
    freezeTemp: r.freeze_temp ?? null,
    backdated: r.backdated || false,
    producer: r.producer || '',
    tester: r.tester || '',
    by: r.by_user || '',
  };
}

function toRecord(r) {
  return {
    id: r.id, type: r.type,
    date: r.date, time: r.time,
    branch_id: r.branchId || null, menu_id: r.menuId,
    qty: r.qty, unit: r.unit,
    status: r.status || null, reason: r.reason || null,
    note: r.note || null,
    material_lots: r.materialLots || null,
    material_breakdown: r.materialBreakdown?.length ? r.materialBreakdown : null,
    freeze_temp: r.freezeTemp ?? null,
    backdated: r.backdated || false,
    producer: r.producer || null,
    tester: r.tester || null,
    by_user: r.by || null,
  };
}

function buildBomMap(rows, hasQty) {
  const map = {};
  (rows || []).forEach(r => {
    if (!map[r.menu_id]) map[r.menu_id] = [];
    map[r.menu_id].push(hasQty
      ? { code: r.ingredient_code, qty: r.qty_per_gram }
      : { code: r.ingredient_code });
  });
  return map;
}

// ─── Fetch records (paged + windowed) ─────────────────────────────────────────

// วันที่ย้อนหลัง n วัน → 'YYYY-MM-DD' (ใช้กำหนดหน้าต่างข้อมูลล่าสุด)
function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// สร้าง query records พร้อมกรองช่วงวันที่ + เรียงเสถียร (tiebreaker = id)
// since = เอาตั้งแต่วันนี้ (date >= since), before = เอาก่อนวันนี้ (date < before)
function recordsQuery(withCount, { since, before } = {}) {
  let q = supabase.from('records').select('*', withCount ? { count: 'exact' } : undefined);
  if (since)  q = q.gte('date', since);
  if (before) q = q.lt('date', before);
  return q
    .order('date', { ascending: false })
    .order('time', { ascending: false })
    .order('id', { ascending: false });
}

// PostgREST จำกัดการส่งข้อมูลสูงสุด 1,000 แถว/ครั้ง
// ดึงหน้าแรกพร้อมจำนวนรวม แล้วถ้ามีมากกว่านั้นค่อยยิงหน้าที่เหลือ "พร้อมกัน" (parallel)
async function fetchRecordsPaged(opts = {}) {
  const PAGE = 1000;
  const first = await recordsQuery(true, opts).range(0, PAGE - 1);
  if (first.error) throw new Error(first.error.message);

  let all = first.data || [];
  const total = first.count ?? all.length;
  if (total > PAGE) {
    const reqs = [];
    for (let from = PAGE; from < total; from += PAGE) {
      reqs.push(recordsQuery(false, opts).range(from, from + PAGE - 1));
    }
    const results = await Promise.all(reqs);
    for (const { data, error } of results) {
      if (error) throw new Error(error.message);
      if (data) all = all.concat(data);
    }
  }
  return all;
}

// ดึงประวัติเก่าตามช่วงวันที่ (ใช้ตอนผู้ใช้เลือกดูย้อนหลังเกินหน้าต่างเริ่มต้น)
// since = null → เอาทุกอย่างก่อน before (โหลดทั้งหมดที่เหลือ)
export async function fetchRecordsRange(since, before) {
  const rows = await fetchRecordsPaged({ since: since || undefined, before });
  return rows.map(fromRecord);
}

// ─── Fetch all store data ─────────────────────────────────────────────────────

// โหลดเฉพาะข้อมูลล่าสุด (ค่าเริ่มต้น 60 วัน) ตอนเปิดแอป — ลด egress/disk IO
// sinceDays = null → โหลดประวัติทั้งหมด
export async function fetchStore({ sinceDays = 60 } = {}) {
  const since = sinceDays ? daysAgoISO(sinceDays) : null;
  const [
    { data: branches, error: e1 },
    { data: menus, error: e2 },
    { data: ingredients, error: e3 },
    { data: bomProdRows, error: e4 },
    { data: bomDefectRows, error: e5 },
    { data: profiles, error: e6 },
    records,
  ] = await Promise.all([
    supabase.from('branches').select('*').order('id'),
    supabase.from('menus').select('*').order('id'),
    supabase.from('ingredients').select('*').order('code'),
    supabase.from('bom_prod').select('*'),
    supabase.from('bom_defect').select('*'),
    supabase.from('profiles').select('*').order('username'),
    fetchRecordsPaged(since ? { since } : {}),
  ]);

  const errors = [e1, e2, e3, e4, e5, e6].filter(Boolean);
  if (errors.length) throw new Error(errors[0].message);

  return {
    branches: branches || [],
    menus: menus || [],
    ingredients: ingredients || [],
    bomProd: buildBomMap(bomProdRows, false),
    bomDefect: buildBomMap(bomDefectRows, true),
    users: (profiles || []).map(p => ({
      id: p.id, username: p.username, role: p.role,
      branchId: p.branch_id || '', areas: p.areas || [], label: p.label || '',
    })),
    records: (records || []).map(fromRecord),
    // วันที่เก่าสุดที่ "มีข้อมูลครบ" ในเครื่อง — null = โหลดครบทั้งหมดแล้ว
    recordsSince: since,
  };
}

// นับจำนวน records ทั้งหมด (ไม่ดึงข้อมูลแถว — egress ~0) สำหรับสถิติรวมของ Admin
export async function fetchRecordStats() {
  const countOnly = () => supabase.from('records').select('id', { count: 'exact', head: true });
  const [tot, prod, passed] = await Promise.all([
    countOnly(),
    countOnly().eq('type', 'production'),
    countOnly().eq('type', 'production').eq('status', 'passed'),
  ]);
  if (tot.error || prod.error || passed.error) {
    throw new Error((tot.error || prod.error || passed.error).message);
  }
  return {
    total: tot.count ?? 0,
    production: prod.count ?? 0,
    passedProduction: passed.count ?? 0,
  };
}

// ─── Records ──────────────────────────────────────────────────────────────────

export async function insertRecord(rec) {
  const { error } = await supabase.from('records').insert(toRecord(rec));
  if (error) throw new Error(error.message);
}

export async function insertRecords(recs) {
  const { error } = await supabase.from('records').insert(recs.map(toRecord));
  if (error) throw new Error(error.message);
}

export async function deleteRecord(id) {
  const { error } = await supabase.from('records').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteRecords(ids) {
  if (!ids || ids.length === 0) return;
  const { error } = await supabase.from('records').delete().in('id', ids);
  if (error) throw new Error(error.message);
}

// ─── Branches ─────────────────────────────────────────────────────────────────

export async function saveBranch(branch) {
  const { error } = await supabase.from('branches').upsert(branch, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export async function deleteBranch(id) {
  const { error } = await supabase.from('branches').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Menus ────────────────────────────────────────────────────────────────────

export async function saveMenu(menu) {
  const { error } = await supabase.from('menus').upsert(menu, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export async function deleteMenu(id) {
  await Promise.all([
    supabase.from('bom_prod').delete().eq('menu_id', id),
    supabase.from('bom_defect').delete().eq('menu_id', id),
  ]);
  const { error } = await supabase.from('menus').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Ingredients ──────────────────────────────────────────────────────────────

export async function saveIngredient(ing) {
  const { error } = await supabase.from('ingredients').upsert(ing, { onConflict: 'code' });
  if (error) throw new Error(error.message);
}

export async function deleteIngredient(code) {
  await Promise.all([
    supabase.from('bom_prod').delete().eq('ingredient_code', code),
    supabase.from('bom_defect').delete().eq('ingredient_code', code),
  ]);
  const { error } = await supabase.from('ingredients').delete().eq('code', code);
  if (error) throw new Error(error.message);
}

// ─── BOM ──────────────────────────────────────────────────────────────────────

export async function saveBomProd(menuId, lines) {
  await supabase.from('bom_prod').delete().eq('menu_id', menuId);
  if (!lines.length) return;
  const { error } = await supabase.from('bom_prod').insert(
    lines.map(b => ({ menu_id: menuId, ingredient_code: b.code }))
  );
  if (error) throw new Error(error.message);
}

export async function saveBomDefect(menuId, lines) {
  await supabase.from('bom_defect').delete().eq('menu_id', menuId);
  if (!lines.length) return;
  const { error } = await supabase.from('bom_defect').insert(
    lines.map(b => ({ menu_id: menuId, ingredient_code: b.code, qty_per_gram: b.qty }))
  );
  if (error) throw new Error(error.message);
}

// ─── Profiles (update role/branch/areas/label — password via API route) ───────

export async function updateProfile(id, patch) {
  const row = {};
  if (patch.role !== undefined)     row.role = patch.role;
  if (patch.branchId !== undefined) row.branch_id = patch.branchId || null;
  if (patch.areas !== undefined)    row.areas = patch.areas;
  if (patch.label !== undefined)    row.label = patch.label;
  const { error } = await supabase.from('profiles').update(row).eq('id', id);
  if (error) throw new Error(error.message);
}
