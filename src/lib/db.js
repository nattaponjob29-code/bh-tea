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

// ─── Fetch all store data ─────────────────────────────────────────────────────

// PostgREST จำกัดการส่งข้อมูลสูงสุด 1,000 แถว/ครั้ง
// ดึงจำนวนทั้งหมดก่อน แล้วยิงทุกหน้า "พร้อมกัน" (parallel) ให้เร็วที่สุด
async function fetchAllRecords() {
  const PAGE = 1000;
  const { count, error: cErr } = await supabase
    .from('records').select('id', { count: 'exact', head: true });
  if (cErr) throw new Error(cErr.message);

  const pages = Math.max(1, Math.ceil((count || 0) / PAGE));
  const reqs = [];
  for (let i = 0; i < pages; i++) {
    reqs.push(
      supabase.from('records').select('*')
        .order('date', { ascending: false })
        .order('time', { ascending: false })
        .order('id', { ascending: false })   // tiebreaker — แบ่งหน้าให้เสถียร ไม่ซ้ำ/ตกหล่น
        .range(i * PAGE, i * PAGE + PAGE - 1)
    );
  }
  const results = await Promise.all(reqs);
  const all = [];
  for (const { data, error } of results) {
    if (error) throw new Error(error.message);
    if (data) all.push(...data);
  }
  return all;
}

export async function fetchStore() {
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
    fetchAllRecords(),
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
