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

// ─── Records: ranged fetch for History detail ─────────────────────────────────
// ดึงเฉพาะแถวในช่วงวันที่/สาขาที่เลือก (ไม่โหลดทั้งตาราง) — ใช้ในหน้าประวัติ
// limit 1000 = เพดาน PostgREST ต่อครั้ง; total = จำนวนจริงในช่วง (count)
export async function fetchRecords({ from, to, branchIds, type, limit = 1000, offset = 0 } = {}) {
  let q = supabase.from('records').select('*', { count: 'exact' });
  if (from) q = q.gte('date', from);
  if (to)   q = q.lte('date', to);
  if (type) q = q.eq('type', type);
  if (branchIds && branchIds.length) q = q.in('branch_id', branchIds);
  q = q.order('date', { ascending: false })
       .order('time', { ascending: false })
       .order('id', { ascending: false })
       .range(offset, offset + limit - 1);
  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  return { rows: (data || []).map(fromRecord), total: count ?? (data?.length || 0) };
}

// ─── Server-side aggregations (RPC) ───────────────────────────────────────────
// คำนวณ/สรุปที่ Postgres แล้วส่งกลับแค่ผลก้อนเล็ก — ลด egress มหาศาล
const branchArg = (ids) => (ids && ids.length ? ids : null);

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

export async function statsKpi(from, to, branchIds) {
  const d = await rpc('stats_kpi', { d_from: from, d_to: to, p_branches: branchArg(branchIds) });
  const r = d?.[0] || {};
  return { prod: +r.prod || 0, passed: +r.passed || 0, failed: +r.failed || 0, defect: +r.defect || 0, defectQty: +r.defect_qty || 0 };
}

export async function statsDaily(from, to, branchIds) {
  const d = await rpc('stats_daily', { d_from: from, d_to: to, p_branches: branchArg(branchIds) });
  return (d || []).map(r => ({
    date: r.d, prod: +r.prod || 0, passed: +r.passed || 0, failed: +r.failed || 0, defect: +r.defect || 0,
  }));
}

export async function statsByBranch(from, to, branchIds) {
  const d = await rpc('stats_by_branch', { d_from: from, d_to: to, p_branches: branchArg(branchIds) });
  return (d || []).map(r => ({
    branchId: r.branch_id, prod: +r.prod || 0, passed: +r.passed || 0, failed: +r.failed || 0, defect: +r.defect || 0,
  }));
}

export async function statsByMenu(from, to, branchIds) {
  const d = await rpc('stats_by_menu', { d_from: from, d_to: to, p_branches: branchArg(branchIds) });
  return (d || []).map(r => ({
    menuId: r.menu_id, prod: +r.prod || 0, passed: +r.passed || 0, failed: +r.failed || 0,
    defect: +r.defect || 0, defectQty: +r.defect_qty || 0,
  }));
}

// kind = 'failed' (ไม่ผ่าน QC) | 'defect' (ของเสีย) → [[reason, count], ...]
export async function statsReasons(from, to, kind, branchIds) {
  const d = await rpc('stats_reasons', { d_from: from, d_to: to, p_kind: kind, p_branches: branchArg(branchIds) });
  return (d || []).map(r => [r.reason, +r.n || 0]);
}

export async function defectByMaterial(from, to, branchIds) {
  const d = await rpc('defect_by_material', { d_from: from, d_to: to, p_branches: branchArg(branchIds) });
  return (d || []).map(r => ({
    code: r.code, qty: +r.qty || 0, occurrences: +r.occurrences || 0, totalGrams: +r.total_grams || 0,
  }));
}

// จำนวนบันทึกทั้งหมดรายสาขา (all-time) → { branchId: n } — ใช้ในหน้า Admin จัดการสาขา
export async function branchRecordCounts() {
  const d = await rpc('branch_record_counts', {});
  const map = {};
  (d || []).forEach(r => { map[r.branch_id] = +r.n || 0; });
  return map;
}

// ─── Fetch reference data (small tables — ไม่ดึง records) ─────────────────────
export async function fetchStore() {
  const [
    { data: branches, error: e1 },
    { data: menus, error: e2 },
    { data: ingredients, error: e3 },
    { data: bomProdRows, error: e4 },
    { data: bomDefectRows, error: e5 },
    { data: profiles, error: e6 },
  ] = await Promise.all([
    supabase.from('branches').select('*').order('id'),
    supabase.from('menus').select('*').order('id'),
    supabase.from('ingredients').select('*').order('code'),
    supabase.from('bom_prod').select('*'),
    supabase.from('bom_defect').select('*'),
    supabase.from('profiles').select('*').order('username'),
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
  };
}

// นับยอดรวมทั้งหมดจาก DB (egress ~0) — สำหรับสถิติ "ทั้งหมด" ของ Admin
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

// ─── Records mutations ────────────────────────────────────────────────────────

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
