import { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { AppShell, PageHeader, StatCard, Icon, Empty, Bars, SearchBox, useToast, Modal } from '../components/ui.jsx';
import { SplitHistoryPage, DefectHistoryPage } from '../components/History.jsx';
import { DefectMaterialDashboard } from './Area.jsx';
import {
  saveBranch, deleteBranch, saveMenu, deleteMenu,
  saveIngredient, deleteIngredient, saveBomProd, saveBomDefect, updateProfile,
  fetchRecordStats,
} from '../lib/db.js';
import { useEnsureRecordsLoaded } from '../context/StoreContext.jsx';
import { ROLE_OPTIONS, ROLE_TH, ROLE_COLOR } from '../lib/constants.js';
import { todayISO, fmtNum } from '../lib/helpers.js';

/* ---------- Shared helper: call admin API routes ---------- */
async function callAdminAPI(path, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const resp = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'API error');
  return data;
}

/* ---------- Admin Overview ---------- */
function SysRow({ label, value, ok }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: ok ? 'var(--ok)' : 'var(--warn)', boxShadow: ok ? '0 0 8px var(--ok)' : '0 0 8px var(--warn)' }} />
        <span style={{ fontSize: 14 }}>{label}</span>
      </div>
      <span style={{ fontSize: 13, color: 'var(--ink-3)' }} className="font-mono">{value}</span>
    </div>
  );
}

function AdminOverview({ store, refresh }) {
  const prod = store.records.filter(r => r.type === 'production');
  const defects = store.records.filter(r => r.type === 'defect');
  const menusWithBom = Object.keys(store.bomProd || {}).filter(k => (store.bomProd[k] || []).length > 0).length;

  // กราฟผลิต 14 วัน → ต้องมั่นใจว่ามีข้อมูลย้อนหลังครบ 14 วัน (โหลดเพิ่มถ้าหน้าต่างเริ่มต้นสั้นกว่า)
  const trendFrom = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 13); return d.toISOString().slice(0, 10); }, []);
  useEnsureRecordsLoaded(trendFrom);

  // นับยอดรวมทั้งหมดจาก DB (egress ~0) — แอปโหลดมาแค่ข้อมูลล่าสุด store.records จึงไม่ใช่ยอดรวม
  const [stats, setStats] = useState(null);
  useEffect(() => { fetchRecordStats().then(setStats).catch(() => {}); }, []);
  const totalProd = stats?.production ?? prod.length;
  const totalRecords = stats?.total ?? store.records.length;
  const passRate = stats
    ? (stats.production ? Math.round(stats.passedProduction / stats.production * 100) : 0)
    : (prod.length ? Math.round(prod.filter(r => r.status === 'passed').length / prod.length * 100) : 0);

  const trend = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i));
      const iso = d.toISOString().slice(0, 10);
      return prod.filter(r => r.date === iso).length;
    });
  }, [prod]);

  return (
    <>
      <PageHeader
        eyebrow="System Admin"
        title="ภาพรวมระบบ"
        subtitle="ดูสุขภาพระบบ จัดการ master data และตั้งค่าหลังบ้าน"
        right={
          <button className="btn ghost" onClick={refresh}>
            <Icon name="refresh" size={14} /> รีเฟรชข้อมูล
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18, marginBottom: 22 }} className="fade-up">
        <StatCard label="สาขา"       value={store.branches.length}   sub="ที่เปิดใช้งาน"       icon="store"   accent="var(--amber)" />
        <StatCard label="เมนู"       value={store.menus.length}      sub={`${menusWithBom}/${store.menus.length} มี BOM`} icon="menu" accent="var(--matcha)" />
        <StatCard label="ผู้ใช้งาน"  value={store.users.length}      sub={ROLE_OPTIONS.map(r => store.users.filter(u => u.role === r).length).join(' · ')} icon="user" accent="var(--info)" />
        <StatCard label="ล็อตผลิตรวม" value={fmtNum(totalProd)}    sub={`${passRate}% pass`}  icon="factory" accent="var(--tea)" trend={trend} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
        <div className="card" style={{ padding: '24px 26px' }}>
          <h3 className="font-display" style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>การผลิตรวม 14 วันย้อนหลัง</h3>
          <Bars data={trend} color="var(--amber)" height={200}
            labels={Array.from({ length: 14 }, (_, i) => {
              const d = new Date(); d.setDate(d.getDate() - (13 - i));
              return d.toLocaleDateString('th-TH', { day: '2-digit' });
            })} />
        </div>
        <div className="card" style={{ padding: '24px 26px' }}>
          <h3 className="font-display" style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>สถานะระบบ</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SysRow label="Database"     value="Supabase · PostgreSQL" ok />
            <SysRow label="Records"      value={`${totalRecords} entries`} ok />
            <SysRow label="Users"        value={`${store.users.length} คน`} ok />
            <SysRow label="BOM coverage" value={`${menusWithBom}/${store.menus.length} เมนู`} ok={menusWithBom === store.menus.length} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <DefectMaterialDashboard records={defects} store={store} />
      </div>
    </>
  );
}

/* ---------- Branches CRUD ---------- */
function AdminBranches({ store, refresh }) {
  const toast = useToast();
  const [openAdd, setOpenAdd] = useState(false);
  const [openBulk, setOpenBulk] = useState(false);
  const [openDeleteSel, setOpenDeleteSel] = useState(false);
  const [form, setForm] = useState({ id: '', name: '', area: '' });
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const allSelected = store.branches.length > 0 && selectedIds.size === store.branches.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(store.branches.map(b => b.id)));
  };
  const toggleOne = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const submit = async () => {
    if (!form.id || !form.name || !form.area) return toast('กรอกข้อมูลให้ครบ', 'bad');
    if (!editing && store.branches.find(b => b.id === form.id)) return toast('รหัสสาขาซ้ำ', 'bad');
    setSaving(true);
    try {
      await saveBranch({ id: form.id, name: form.name, area: form.area });
      await refresh();
      toast(editing ? 'แก้ไขสาขาแล้ว' : 'เพิ่มสาขาแล้ว', 'ok');
      setOpenAdd(false); setEditing(null); setForm({ id: '', name: '', area: '' });
    } catch (e) { toast(e.message, 'bad'); }
    finally { setSaving(false); }
  };

  const onEdit = (b) => { setEditing(b.id); setForm(b); setOpenAdd(true); };
  const onDelete = async (id) => {
    if (!window.confirm('ลบสาขานี้?')) return;
    try { await deleteBranch(id); await refresh(); toast('ลบเรียบร้อย', 'ok'); }
    catch (e) { toast(e.message, 'bad'); }
  };

  const onDeleteSelected = async () => {
    setSaving(true);
    let ok = 0, fail = 0;
    for (const id of selectedIds) {
      try { await deleteBranch(id); ok++; }
      catch { fail++; }
    }
    await refresh();
    toast(`ลบ ${ok} สาขา${fail ? ` (ล้มเหลว ${fail})` : ''}`, ok > 0 ? 'ok' : 'bad');
    setSelectedIds(new Set());
    setOpenDeleteSel(false);
    setSaving(false);
  };

  const parseBulkRows = (text) => {
    const rows = [], errs = [];
    text.split('\n').forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const parts = trimmed.split(',').map(p => p.trim());
      if (parts.length < 3) { errs.push(`บรรทัด ${i + 1}: ต้องมี 3 คอลัมน์ (รหัส,ชื่อ,เขต)`); return; }
      const [id, name, area] = parts;
      if (!id || !name || !area) { errs.push(`บรรทัด ${i + 1}: ข้อมูลไม่ครบ`); return; }
      rows.push({ id: id.toUpperCase(), name, area });
    });
    return { rows, errs };
  };

  const submitBulk = async () => {
    const { rows, errs } = parseBulkRows(bulkText);
    if (errs.length > 0) return toast(errs[0] + (errs.length > 1 ? ` (+${errs.length - 1} อื่น)` : ''), 'bad');
    if (!rows.length) return toast('ไม่มีข้อมูลที่จะนำเข้า', 'bad');
    setSaving(true);
    let ok = 0, fail = 0;
    for (const b of rows) {
      try { await saveBranch(b); ok++; }
      catch { fail++; }
    }
    await refresh();
    toast(`นำเข้าสำเร็จ ${ok} สาขา${fail ? ` (ล้มเหลว ${fail})` : ''}`, ok > 0 ? 'ok' : 'bad');
    setOpenBulk(false); setBulkText('');
    setSaving(false);
  };

  return (
    <>
      <PageHeader
        eyebrow="Master Data" title="จัดการสาขา"
        subtitle={selectedIds.size > 0 ? `เลือก ${selectedIds.size} สาขา` : `มี ${store.branches.length} สาขาในระบบ`}
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            {selectedIds.size > 0 && (
              <button className="btn danger" onClick={() => setOpenDeleteSel(true)}>
                <Icon name="trash" size={14} /> ลบที่เลือก ({selectedIds.size})
              </button>
            )}
            <button className="btn ghost" onClick={() => { setBulkText(''); setOpenBulk(true); }}>
              <Icon name="upload" size={14} /> นำเข้าหลายสาขา
            </button>
            <button className="btn amber" onClick={() => { setEditing(null); setForm({ id: '', name: '', area: '' }); setOpenAdd(true); }}>
              <Icon name="plus" size={14} /> เพิ่มสาขาใหม่
            </button>
          </div>
        }
      />
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="t">
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: 'center' }}>
                <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected; }}
                  onChange={toggleAll} style={{ cursor: 'pointer', width: 15, height: 15 }} />
              </th>
              <th>รหัส</th><th>ชื่อสาขา</th><th>เขต / พื้นที่</th>
              <th style={{ textAlign: 'right' }}>กิจกรรม</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {store.branches.map(b => {
              const cnt = store.records.filter(r => r.branchId === b.id).length;
              const checked = selectedIds.has(b.id);
              return (
                <tr key={b.id} style={{ background: checked ? 'color-mix(in oklch, var(--amber) 6%, transparent)' : undefined }}>
                  <td style={{ textAlign: 'center' }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleOne(b.id)}
                      style={{ cursor: 'pointer', width: 15, height: 15 }} />
                  </td>
                  <td className="font-mono" style={{ fontSize: 13, color: 'var(--ink)' }}>{b.id}</td>
                  <td style={{ fontWeight: 500 }}>{b.name}</td>
                  <td><span className="badge">{b.area}</span></td>
                  <td className="num" style={{ textAlign: 'right' }}>{cnt.toLocaleString()} records</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn ghost sm" onClick={() => onEdit(b)} style={{ marginRight: 6 }}><Icon name="edit" size={12} /></button>
                    <button className="btn ghost sm" onClick={() => onDelete(b.id)}><Icon name="trash" size={12} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal เพิ่มทีละสาขา */}
      <Modal open={openAdd} onClose={() => { setOpenAdd(false); setEditing(null); }} title={editing ? 'แก้ไขสาขา' : 'เพิ่มสาขาใหม่'}
        footer={<><button className="btn ghost" onClick={() => { setOpenAdd(false); setEditing(null); }}>ยกเลิก</button><button className="btn amber" onClick={submit} disabled={saving}><Icon name="check" size={14} /> บันทึก</button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label className="field"><span>รหัสสาขา</span><input className="inp" value={form.id} onChange={e => setForm({ ...form, id: e.target.value.toUpperCase() })} placeholder="BR08" disabled={!!editing} /></label>
          <label className="field"><span>ชื่อสาขา</span><input className="inp" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="สาขา..." /></label>
          <label className="field"><span>เขต / พื้นที่ (Area)</span><input className="inp" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} placeholder="BKK-Central / Upcountry / ..." /></label>
        </div>
      </Modal>

      {/* Modal นำเข้าหลายสาขา */}
      <Modal open={openBulk} onClose={() => setOpenBulk(false)} title="นำเข้าหลายสาขา"
        footer={<><button className="btn ghost" onClick={() => setOpenBulk(false)}>ยกเลิก</button><button className="btn amber" onClick={submitBulk} disabled={saving || !bulkText.trim()}><Icon name="upload" size={14} /> {saving ? 'กำลังนำเข้า...' : 'นำเข้า'}</button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', background: 'var(--paper)', padding: '10px 14px', borderRadius: 10, lineHeight: 1.8 }}>
            แต่ละบรรทัด = <code style={{ background: 'var(--line)', padding: '1px 6px', borderRadius: 4 }}>รหัส, ชื่อสาขา, เขต</code><br />
            <code style={{ fontSize: 12 }}>BR08, สาขาใหม่, BKK-Central</code>
          </div>
          <label className="field">
            <span>วางข้อมูลสาขา</span>
            <textarea className="inp" rows={10} value={bulkText} onChange={e => setBulkText(e.target.value)}
              placeholder={'BR08, สาขาฟิวเจอร์พาร์ค, BKK-North\nBR09, สาขาเซ็นทรัลพระราม 9, BKK-Central\nBR10, สาขาเมกาบางนา, BKK-East'}
              style={{ fontFamily: 'monospace', fontSize: 13, resize: 'vertical' }} />
          </label>
        </div>
      </Modal>

      {/* Modal ยืนยันลบที่เลือก */}
      <Modal open={openDeleteSel} onClose={() => setOpenDeleteSel(false)} title="ยืนยันลบสาขาที่เลือก" width={480}
        footer={<><button className="btn ghost" onClick={() => setOpenDeleteSel(false)}>ยกเลิก</button><button className="btn danger" onClick={onDeleteSelected} disabled={saving}><Icon name="trash" size={14} /> {saving ? 'กำลังลบ...' : `ลบ ${selectedIds.size} สาขา`}</button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
          <div style={{ padding: '12px 16px', background: 'rgba(176,70,52,.08)', border: '1px solid rgba(176,70,52,.25)', borderRadius: 10, color: 'var(--bad)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="alert" size={16} style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>ลบ {selectedIds.size} สาขาที่เลือก?</div>
              <div style={{ fontSize: 13 }}>การกระทำนี้ไม่สามารถย้อนกลับได้ · ข้อมูลการผลิตที่ผูกกับสาขาเหล่านี้จะยังคงอยู่</div>
            </div>
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {store.branches.filter(b => selectedIds.has(b.id)).map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: 'var(--bg)', borderRadius: 8, fontSize: 13 }}>
                <span className="font-mono" style={{ color: 'var(--ink-2)', minWidth: 48 }}>{b.id}</span>
                <span style={{ flex: 1 }}>{b.name}</span>
                <span className="badge">{b.area}</span>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}

/* ---------- Menus CRUD ---------- */
function AdminMenus({ store, refresh }) {
  const toast = useToast();
  const [openAdd, setOpenAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ id: '', name: '', category: '', yield: '', unit: '' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.id || !form.name || !form.category || !form.yield || !form.unit) return toast('กรอกให้ครบ', 'bad');
    if (!editing && store.menus.find(m => m.id === form.id)) return toast('รหัสเมนูซ้ำ', 'bad');
    setSaving(true);
    try {
      await saveMenu({ id: form.id, name: form.name, category: form.category, yield: Number(form.yield), unit: form.unit });
      await refresh();
      toast(editing ? 'แก้ไขเมนูแล้ว' : 'เพิ่มเมนูแล้ว', 'ok');
      setOpenAdd(false); setEditing(null); setForm({ id: '', name: '', category: '', yield: '', unit: '' });
    } catch (e) { toast(e.message, 'bad'); }
    finally { setSaving(false); }
  };

  const onEdit = (m) => { setEditing(m.id); setForm({ ...m, yield: String(m.yield) }); setOpenAdd(true); };
  const onDelete = async (id) => {
    if (!window.confirm('ลบเมนูนี้?')) return;
    try { await deleteMenu(id); await refresh(); toast('ลบเรียบร้อย', 'ok'); }
    catch (e) { toast(e.message, 'bad'); }
  };

  return (
    <>
      <PageHeader
        eyebrow="Master Data" title="จัดการเมนู" subtitle={`มี ${store.menus.length} เมนูในระบบ`}
        right={<button className="btn amber" onClick={() => { setEditing(null); setForm({ id: '', name: '', category: '', yield: '', unit: '' }); setOpenAdd(true); }}><Icon name="plus" size={14} /> เพิ่มเมนูใหม่</button>}
      />
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="t">
          <thead><tr><th>รหัส</th><th>ชื่อเมนู</th><th>หมวด</th><th style={{ textAlign: 'right' }}>Yield ต่อล็อต</th><th>BOM</th><th style={{ width: 120 }}></th></tr></thead>
          <tbody>
            {store.menus.map(m => {
              const bp = (store.bomProd?.[m.id]) || [];
              const bd = (store.bomDefect?.[m.id]) || [];
              return (
                <tr key={m.id}>
                  <td className="font-mono" style={{ fontSize: 13 }}>{m.id}</td>
                  <td style={{ fontWeight: 500 }}>{m.name}</td>
                  <td><span className="badge">{m.category}</span></td>
                  <td className="num" style={{ textAlign: 'right' }}>{m.yield.toLocaleString()} {m.unit}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span className={`badge ${bp.length ? 'ok' : 'bad'}`}><span className="dot" />ผลิต {bp.length}</span>
                      <span className={`badge ${bd.length ? 'info' : 'bad'}`}><span className="dot" />เสีย {bd.length}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn ghost sm" onClick={() => onEdit(m)} style={{ marginRight: 6 }}><Icon name="edit" size={12} /></button>
                    <button className="btn ghost sm" onClick={() => onDelete(m.id)}><Icon name="trash" size={12} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Modal open={openAdd} onClose={() => { setOpenAdd(false); setEditing(null); }} title={editing ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}
        footer={<><button className="btn ghost" onClick={() => { setOpenAdd(false); setEditing(null); }}>ยกเลิก</button><button className="btn amber" onClick={submit} disabled={saving}><Icon name="check" size={14} /> บันทึก</button></>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label className="field" style={{ gridColumn: '1/-1' }}><span>รหัสเมนู</span><input className="inp" value={form.id} onChange={e => setForm({ ...form, id: e.target.value.toUpperCase() })} placeholder="M13" disabled={!!editing} /></label>
          <label className="field" style={{ gridColumn: '1/-1' }}><span>ชื่อเมนู</span><input className="inp" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <label className="field"><span>หมวด</span><input className="inp" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="เบส / 3.3 / ท็อปปิ้ง" /></label>
          <label className="field"><span>Yield ต่อล็อต</span><input type="number" className="inp" value={form.yield} onChange={e => setForm({ ...form, yield: e.target.value })} /></label>
          <label className="field" style={{ gridColumn: '1/-1' }}><span>หน่วย</span><input className="inp" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="มล. / กรัม / แก้ว" /></label>
        </div>
      </Modal>
    </>
  );
}

/* ---------- Materials CRUD ---------- */
function AdminMaterials({ store, refresh }) {
  const toast = useToast();
  const [openAdd, setOpenAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: '', name: '', unit: '' });
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.code || !form.name || !form.unit) return toast('กรอกให้ครบ', 'bad');
    if (!editing && store.ingredients.find(i => i.code === form.code)) return toast('รหัสซ้ำ', 'bad');
    setSaving(true);
    try {
      await saveIngredient({ code: form.code, name: form.name, unit: form.unit });
      await refresh();
      toast(editing ? 'แก้ไขแล้ว' : 'เพิ่มวัตถุดิบแล้ว', 'ok');
      setOpenAdd(false); setEditing(null); setForm({ code: '', name: '', unit: '' });
    } catch (e) { toast(e.message, 'bad'); }
    finally { setSaving(false); }
  };

  const onEdit = (i) => { setEditing(i.code); setForm(i); setOpenAdd(true); };
  const onDelete = async (code) => {
    if (!window.confirm('ลบวัตถุดิบนี้?')) return;
    try { await deleteIngredient(code); await refresh(); toast('ลบเรียบร้อย', 'ok'); }
    catch (e) { toast(e.message, 'bad'); }
  };

  const filtered = store.ingredients.filter(i => {
    if (!q) return true;
    return (i.code + ' ' + i.name).toLowerCase().includes(q.toLowerCase());
  });

  const usage = useMemo(() => {
    const u = {};
    Object.values(store.bomProd || {}).forEach(arr => arr.forEach(b => { u[b.code] = (u[b.code] || 0) + 1; }));
    Object.values(store.bomDefect || {}).forEach(arr => arr.forEach(b => { u[b.code] = (u[b.code] || 0) + 1; }));
    return u;
  }, [store.bomProd, store.bomDefect]);

  return (
    <>
      <PageHeader
        eyebrow="Master Data" title="วัตถุดิบ" subtitle={`มี ${store.ingredients.length} รายการ · รหัสสินค้า · ชื่อ · หน่วย`}
        right={<button className="btn amber" onClick={() => { setEditing(null); setForm({ code: '', name: '', unit: '' }); setOpenAdd(true); }}><Icon name="plus" size={14} /> เพิ่มวัตถุดิบ</button>}
      />
      <div style={{ maxWidth: 380, marginBottom: 16 }}>
        <SearchBox value={q} onChange={setQ} placeholder="ค้นหารหัส หรือชื่อวัตถุดิบ..." />
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="t">
          <thead><tr><th>รหัสสินค้า</th><th>ชื่อวัตถุดิบ</th><th>หน่วย</th><th style={{ textAlign: 'right' }}>ใช้ในเมนู</th><th style={{ width: 120 }}></th></tr></thead>
          <tbody>
            {filtered.map(i => (
              <tr key={i.code}>
                <td className="font-mono" style={{ fontSize: 13, color: 'var(--ink)' }}>{i.code}</td>
                <td style={{ fontWeight: 500 }}>{i.name}</td>
                <td><span className="badge">{i.unit}</span></td>
                <td className="num" style={{ textAlign: 'right' }}>{usage[i.code] || 0} เมนู</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn ghost sm" onClick={() => onEdit(i)} style={{ marginRight: 6 }}><Icon name="edit" size={12} /></button>
                  <button className="btn ghost sm" onClick={() => onDelete(i.code)}><Icon name="trash" size={12} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={openAdd} onClose={() => { setOpenAdd(false); setEditing(null); }} title={editing ? 'แก้ไขวัตถุดิบ' : 'เพิ่มวัตถุดิบใหม่'}
        footer={<><button className="btn ghost" onClick={() => { setOpenAdd(false); setEditing(null); }}>ยกเลิก</button><button className="btn amber" onClick={submit} disabled={saving}><Icon name="check" size={14} /> บันทึก</button></>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label className="field"><span>รหัสสินค้า</span><input className="inp" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="RM015" disabled={!!editing} /></label>
          <label className="field"><span>หน่วย</span><input className="inp" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="กรัม / มล." /></label>
          <label className="field" style={{ gridColumn: '1/-1' }}><span>ชื่อวัตถุดิบ</span><input className="inp" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        </div>
      </Modal>
    </>
  );
}

/* ---------- BOM linking ---------- */
function AdminBOM({ store, refresh }) {
  const toast = useToast();
  const [mode, setMode] = useState('prod');
  const [selectedId, setSelectedId] = useState(store.menus[0]?.id || null);
  const [newCode, setNewCode] = useState('');
  const [newQty, setNewQty] = useState('');
  const [saving, setSaving] = useState(false);

  const selected = store.menus.find(m => m.id === selectedId);
  const isProd = mode === 'prod';
  const bomKey = isProd ? 'bomProd' : 'bomDefect';
  const bom = (store[bomKey]?.[selectedId]) || [];

  const addLine = async () => {
    if (!newCode) return toast('เลือกวัตถุดิบ', 'bad');
    if (!isProd && !newQty) return toast('กรอกปริมาณต่อกรัม', 'bad');
    if (bom.find(b => b.code === newCode)) return toast('วัตถุดิบนี้อยู่ใน BOM นี้แล้ว', 'warn');
    const newItem = isProd ? { code: newCode } : { code: newCode, qty: Number(newQty) };
    const newBom = [...bom, newItem];
    setSaving(true);
    try {
      if (isProd) await saveBomProd(selectedId, newBom);
      else await saveBomDefect(selectedId, newBom);
      await refresh();
      setNewCode(''); setNewQty('');
      toast('เพิ่มเข้า BOM แล้ว', 'ok');
    } catch (e) { toast(e.message, 'bad'); }
    finally { setSaving(false); }
  };

  const removeLine = async (code) => {
    const newBom = bom.filter(b => b.code !== code);
    try {
      if (isProd) await saveBomProd(selectedId, newBom);
      else await saveBomDefect(selectedId, newBom);
      await refresh();
      toast('ลบ BOM line แล้ว', 'ok');
    } catch (e) { toast(e.message, 'bad'); }
  };

  const updateQty = async (code, qty) => {
    const newBom = bom.map(b => b.code === code ? { ...b, qty: Number(qty) || 0 } : b);
    try {
      await saveBomDefect(selectedId, newBom);
      await refresh();
    } catch (e) { toast(e.message, 'bad'); }
  };

  return (
    <>
      <PageHeader
        eyebrow="Bill of Materials"
        title="ผูก BOM เมนู ↔ วัตถุดิบ"
        subtitle="แยก 2 ฟีเจอร์ — ผูกวัตถุดิบที่ใช้ในการผลิต และผูกอัตราคำนวณของเสีย"
      />

      <div style={{ display: 'inline-flex', padding: 4, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 99, marginBottom: 20 }} className="fade-up">
        {[
          { k: 'prod',   l: 'ผูกบอมล็อตการผลิต',    ic: 'factory' },
          { k: 'defect', l: 'ผูกบอมวัตถุดิบเสียหาย', ic: 'alert' },
        ].map(t => (
          <button key={t.k} onClick={() => setMode(t.k)} style={{
            padding: '10px 18px', borderRadius: 99, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            background: mode === t.k ? 'var(--paper)' : 'transparent',
            color: mode === t.k ? 'var(--ink)' : 'var(--ink-3)',
            boxShadow: mode === t.k ? 'var(--shadow-sm)' : 'none',
            fontSize: 14, fontWeight: mode === t.k ? 600 : 500,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            transition: 'all 140ms', whiteSpace: 'nowrap',
          }}>
            <Icon name={t.ic} size={14} />{t.l}
          </button>
        ))}
      </div>

      <div style={{
        marginBottom: 18, padding: '12px 16px',
        background: isProd ? 'rgba(201,138,60,.08)' : 'rgba(176,70,52,.08)',
        border: `1px dashed ${isProd ? 'var(--amber)' : 'var(--bad)'}`,
        borderRadius: 12, fontSize: 13, color: 'var(--ink-2)',
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <Icon name="sparkle" size={14} style={{ marginTop: 2, color: isProd ? 'var(--amber)' : 'var(--bad)' }} />
        <div>
          {isProd ? (
            <><b>ผูกบอมล็อตการผลิต</b> — ไม่ต้องระบุปริมาณ ใช้สำหรับให้พนักงานกรอกล็อตวัตถุดิบตอนบันทึกการผลิต</>
          ) : (
            <>
              <b>ผูกบอมวัตถุดิบเสียหาย</b> — ต้องระบุปริมาณ <b>ต่อกรัมของผลิตภัณฑ์</b> เช่น 0.001 ถุง/กรัม ใช้แปลงปริมาณของเสียเป็นจำนวนวัตถุดิบ
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
                สูตรคำนวณ: <span className="font-mono">จำนวนวัตถุดิบที่เสีย = ปริมาณของเสีย(กรัม) × ปริมาณต่อกรัม</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 22 }}>
        <div className="card" style={{ padding: 14, height: 'fit-content', maxHeight: '75vh', overflow: 'auto' }}>
          <div style={{ padding: '8px 10px 12px', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>เมนู ({store.menus.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {store.menus.map(m => {
              const bn = (store[bomKey]?.[m.id] || []).length;
              const isSel = selectedId === m.id;
              return (
                <button key={m.id} onClick={() => setSelectedId(m.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10,
                  background: isSel ? 'var(--ink)' : 'transparent',
                  color: isSel ? '#fffdf7' : 'var(--ink-2)',
                  border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                  transition: 'all 140ms',
                }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 9, opacity: .6, letterSpacing: '.06em', textTransform: 'uppercase' }}>{m.category}</span>
                    <span style={{ fontWeight: 500 }}>{m.name}</span>
                  </span>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 999,
                    background: bn ? (isSel ? 'rgba(255,253,247,.2)' : 'var(--bg-2)') : 'rgba(176,70,52,.15)',
                    color: bn ? (isSel ? '#fffdf7' : 'var(--ink-3)') : 'var(--bad)',
                    fontWeight: 500,
                  }}>{bn}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          {selected ? (
            <>
              <div className="card" style={{ padding: '22px 26px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>{selected.category} · {selected.id}</div>
                    <h3 className="font-display" style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>{selected.name}</h3>
                  </div>
                  <span className={`badge ${bom.length ? (isProd ? 'ok' : 'info') : 'bad'}`}><span className="dot" />{bom.length} วัตถุดิบ</span>
                </div>
              </div>

              <div className="card" style={{ padding: '20px 24px', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                  เพิ่มวัตถุดิบเข้า BOM {isProd ? 'ผลิต' : 'เสียหาย'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isProd ? '1fr 100px' : '1fr 180px 100px', gap: 10 }}>
                  <select className="inp" value={newCode} onChange={e => setNewCode(e.target.value)}>
                    <option value="">— เลือกวัตถุดิบ —</option>
                    {store.ingredients.map(i => <option key={i.code} value={i.code}>{i.code} · {i.name}</option>)}
                  </select>
                  {!isProd && (
                    <div style={{ position: 'relative' }}>
                      <input type="number" step="0.0001" className="inp" value={newQty} onChange={e => setNewQty(e.target.value)} placeholder="0.001" />
                      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--ink-3)' }}>
                        {newCode ? `${store.ingredients.find(i => i.code === newCode)?.unit}/g` : '/g'}
                      </span>
                    </div>
                  )}
                  <button className="btn" onClick={addLine} disabled={saving} style={{ justifyContent: 'center' }}>
                    <Icon name="plus" size={14} /> เพิ่ม
                  </button>
                </div>
              </div>

              <div className="card" style={{ overflow: 'hidden' }}>
                {bom.length === 0
                  ? <Empty icon="link" title={`ยังไม่มี BOM ${isProd ? 'ผลิต' : 'เสียหาย'}`} subtitle="เพิ่มวัตถุดิบรายการแรกข้างบน" />
                  : (
                    <table className="t">
                      <thead>
                        <tr>
                          <th>รหัส</th><th>วัตถุดิบ</th>
                          {!isProd && <th style={{ textAlign: 'right' }}>ปริมาณต่อกรัม</th>}
                          <th>หน่วย</th><th style={{ width: 80 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {bom.map(b => {
                          const ing = store.ingredients.find(i => i.code === b.code);
                          return (
                            <tr key={b.code}>
                              <td className="font-mono" style={{ fontSize: 13, color: 'var(--ink)' }}>{b.code}</td>
                              <td style={{ fontWeight: 500 }}>{ing?.name || '—'}</td>
                              {!isProd && (
                                <td style={{ textAlign: 'right' }}>
                                  <input type="number" step="0.0001" className="inp"
                                    style={{ width: 140, padding: '7px 10px', textAlign: 'right', fontFamily: 'Space Grotesk' }}
                                    defaultValue={b.qty}
                                    onBlur={e => updateQty(b.code, e.target.value)}
                                  />
                                </td>
                              )}
                              <td><span className="badge">{ing?.unit}</span></td>
                              <td style={{ textAlign: 'right' }}>
                                <button className="btn ghost sm" onClick={() => removeLine(b.code)}><Icon name="trash" size={12} /></button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
              </div>
            </>
          ) : <Empty title="เลือกเมนูทางซ้ายเพื่อเริ่ม" />}
        </div>
      </div>
    </>
  );
}

/* ---------- User management helpers ---------- */
function emptyUser() {
  return { username: '', password: '', role: 'Branch', branchId: '', areas: [], label: '' };
}

function validateUser(u, existingUsers, editingId) {
  if (!u.username || !u.username.trim()) return 'ระบุ username';
  if (!editingId && (!u.password || !u.password.trim())) return 'ระบุรหัสผ่าน';
  if (!u.role) return 'ระบุ role';
  if (!editingId && existingUsers.some(x => x.username.toLowerCase() === u.username.toLowerCase())) return `username "${u.username}" ซ้ำ`;
  if (u.role === 'Branch' && !u.branchId) return 'Branch ต้องเลือกสาขา';
  if (u.role === 'Area' && (!u.areas || u.areas.length === 0)) return 'Area ต้องเลือกพื้นที่อย่างน้อย 1 อัน';
  return null;
}

function parseUsersCSV(text, branches, allAreas) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const lines = text.split(/\r?\n/);
  const rows = [], warnings = [];
  const branchIds = new Set(branches.map(b => b.id));
  const areaSet = new Set(allAreas);
  let headerSeen = false;
  let colIdx = { username: 0, password: 1, role: 2, branchId: 3, areas: 4, label: 5 };

  lines.forEach((line, lineNo) => {
    const raw = line.trim();
    if (!raw || raw.startsWith('#')) return;
    const cells = splitCSVRow(raw);
    if (!cells.length) return;
    const lower = cells.map(c => c.toLowerCase().trim());
    if (!headerSeen && (lower.includes('username') || lower.includes('user'))) {
      lower.forEach((name, idx) => {
        if (name === 'username' || name === 'user') colIdx.username = idx;
        else if (name === 'password' || name === 'pass') colIdx.password = idx;
        else if (name === 'role') colIdx.role = idx;
        else if (name === 'branchid' || name === 'branch') colIdx.branchId = idx;
        else if (name === 'areas' || name === 'area') colIdx.areas = idx;
        else if (name === 'label' || name === 'name' || name === 'displayname') colIdx.label = idx;
      });
      headerSeen = true;
      return;
    }
    const get = (k) => (cells[colIdx[k]] || '').trim();
    const username = get('username');
    const password = get('password');
    let role = get('role');
    const branchId = get('branchId');
    const areasRaw = get('areas');
    const label = get('label');
    if (!username) return;

    const roleMatch = ROLE_OPTIONS.find(r => r.toLowerCase() === role.toLowerCase());
    if (!roleMatch) { warnings.push(`บรรทัด ${lineNo + 1}: role "${role}" ไม่ถูกต้อง — ใช้ Branch แทน`); role = 'Branch'; }
    else role = roleMatch;

    let bId = '';
    if (role === 'Branch') {
      if (branchId && branchIds.has(branchId)) bId = branchId;
      else if (branchId) warnings.push(`บรรทัด ${lineNo + 1}: branchId "${branchId}" ไม่พบในระบบ`);
    }

    let areas = [];
    if (role === 'Area') {
      areasRaw.split(/[|;,]/).map(a => a.trim()).filter(Boolean).forEach(a => {
        if (areaSet.has(a)) areas.push(a);
        else warnings.push(`บรรทัด ${lineNo + 1}: พื้นที่ "${a}" ไม่พบในระบบ`);
      });
    }
    rows.push({ username, password, role, branchId: bId, areas, label });
  });
  return { rows, warnings };
}

function splitCSVRow(line) {
  const out = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuote = false;
      else cur += ch;
    } else {
      if (ch === ',') { out.push(cur); cur = ''; }
      else if (ch === '"') inQuote = true;
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function RoleStat({ label, n, color, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      textAlign: 'left', padding: '16px 18px', borderRadius: 14, cursor: 'pointer',
      background: active ? color : 'var(--paper)', color: active ? '#fffdf7' : 'var(--ink)',
      border: `1px solid ${active ? color : 'var(--line)'}`, fontFamily: 'inherit',
      transition: 'all 200ms', boxShadow: active ? 'var(--shadow)' : 'var(--shadow-sm)',
      transform: active ? 'translateY(-1px)' : 'none',
    }}>
      <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', opacity: active ? .8 : .6, marginBottom: 6 }}>{label}</div>
      <div className="num font-display" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1 }}>{n}</div>
    </button>
  );
}

function UserFormFields({ form, setForm, branches, areas, disableUser }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <label className="field">
        <span>Username</span>
        <input className="inp" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} disabled={disableUser} />
      </label>
      <label className="field">
        <span>{disableUser ? 'รหัสผ่านใหม่ (ว่าง = ไม่เปลี่ยน)' : 'รหัสผ่าน'}</span>
        <input className="inp" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={disableUser ? 'เว้นว่างถ้าไม่เปลี่ยน' : '••••••'} />
      </label>
      <label className="field" style={{ gridColumn: '1/-1' }}>
        <span>ชื่อแสดง</span>
        <input className="inp" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="ชื่อ-นามสกุล / ชื่อเล่น" />
      </label>
      <label className="field" style={{ gridColumn: '1/-1' }}>
        <span>Role</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {ROLE_OPTIONS.map(r => (
            <button key={r} type="button" onClick={() => setForm({ ...form, role: r, branchId: '', areas: [] })} style={{
              padding: '12px 8px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
              background: form.role === r ? ROLE_COLOR[r] : 'var(--paper)',
              color: form.role === r ? '#fffdf7' : 'var(--ink)',
              border: `1px solid ${form.role === r ? ROLE_COLOR[r] : 'var(--line-2)'}`,
              fontSize: 13, fontWeight: 500, transition: 'all 140ms',
            }}>{ROLE_TH[r]}</button>
          ))}
        </div>
      </label>
      {form.role === 'Branch' && (
        <label className="field fade-up" style={{ gridColumn: '1/-1' }}>
          <span>ผูกสาขา</span>
          <select className="inp" value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })}>
            <option value="">— เลือกสาขา —</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.id} · {b.name}</option>)}
          </select>
        </label>
      )}
      {form.role === 'Area' && (
        <label className="field fade-up" style={{ gridColumn: '1/-1' }}>
          <span>ผูกพื้นที่ (เลือกได้หลายอัน)</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {areas.map(a => {
              const active = (form.areas || []).includes(a);
              return (
                <button key={a} type="button" className={`chip ${active ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, areas: active ? form.areas.filter(x => x !== a) : [...(form.areas || []), a] })}>
                  {a}
                </button>
              );
            })}
          </div>
        </label>
      )}
    </div>
  );
}

const inputCellStyle = { padding: '7px 10px', fontSize: 13 };

function BulkRow({ i, row, onChange, onRemove, branches, areas }) {
  return (
    <tr>
      <td style={{ color: 'var(--ink-3)', fontSize: 12 }}>{i + 1}</td>
      <td><input className="inp" style={inputCellStyle} value={row.username} onChange={e => onChange({ username: e.target.value })} placeholder="username" /></td>
      <td><input className="inp" style={inputCellStyle} value={row.password} onChange={e => onChange({ password: e.target.value })} placeholder="password" /></td>
      <td>
        <select className="inp" style={inputCellStyle} value={row.role} onChange={e => onChange({ role: e.target.value, branchId: '', areas: [] })}>
          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_TH[r]}</option>)}
        </select>
      </td>
      <td>
        {row.role === 'Branch' ? (
          <select className="inp" style={inputCellStyle} value={row.branchId} onChange={e => onChange({ branchId: e.target.value })}>
            <option value="">— เลือกสาขา —</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.id} · {b.name}</option>)}
          </select>
        ) : row.role === 'Area' ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {areas.map(a => {
              const active = (row.areas || []).includes(a);
              return (
                <button key={a} type="button" className={`chip ${active ? 'active' : ''}`}
                  style={{ padding: '4px 10px', fontSize: 11 }}
                  onClick={() => onChange({ areas: active ? row.areas.filter(x => x !== a) : [...(row.areas || []), a] })}>
                  {a}
                </button>
              );
            })}
          </div>
        ) : <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>เข้าถึงได้ทุกสาขา</span>}
      </td>
      <td><input className="inp" style={inputCellStyle} value={row.label} onChange={e => onChange({ label: e.target.value })} placeholder="ชื่อแสดง" /></td>
      <td><button className="btn ghost sm" onClick={onRemove}><Icon name="x" size={12} /></button></td>
    </tr>
  );
}

/* ---------- Admin Users ---------- */
function AdminUsers({ store, refresh }) {
  const toast = useToast();
  const [openSingle, setOpenSingle] = useState(false);
  const [openBulk, setOpenBulk] = useState(false);
  const [editing, setEditing] = useState(null); // userId string
  const [singleForm, setSingleForm] = useState(emptyUser());
  const [filterRole, setFilterRole] = useState('all');
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);
  const [bulkRows, setBulkRows] = useState(() => Array.from({ length: 5 }).map(emptyUser));
  const fileInputRef = useRef(null);

  const allAreas = useMemo(() => Array.from(new Set(store.branches.map(b => b.area))), [store.branches]);

  const filtered = store.users.filter(u => {
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (q && !(u.username + ' ' + (u.label || '') + ' ' + (u.branchId || '')).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const counts = useMemo(() => {
    const out = { all: store.users.length };
    ROLE_OPTIONS.forEach(r => { out[r] = store.users.filter(u => u.role === r).length; });
    return out;
  }, [store.users]);

  const submitSingle = async () => {
    const err = validateUser(singleForm, store.users, editing);
    if (err) return toast(err, 'bad');
    setSaving(true);
    try {
      if (editing) {
        await updateProfile(editing, { role: singleForm.role, branchId: singleForm.branchId, areas: singleForm.areas, label: singleForm.label });
        if (singleForm.password) await callAdminAPI('/api/update-password', { userId: editing, password: singleForm.password });
      } else {
        await callAdminAPI('/api/create-user', singleForm);
      }
      await refresh();
      toast(editing ? 'แก้ไขผู้ใช้แล้ว' : 'เพิ่มผู้ใช้แล้ว', 'ok');
      setOpenSingle(false); setEditing(null); setSingleForm(emptyUser());
    } catch (e) { toast(e.message, 'bad'); }
    finally { setSaving(false); }
  };

  const submitBulk = async () => {
    const valid = [], errors = [], usernamesInBatch = new Set();
    bulkRows.forEach((row, i) => {
      if (!row.username && !row.password && !row.label) return;
      const err = validateUser(row, [...store.users, ...valid], null);
      if (err) { errors.push(`แถว ${i + 1}: ${err}`); return; }
      if (usernamesInBatch.has(row.username.toLowerCase())) { errors.push(`แถว ${i + 1}: username ซ้ำในชุดนี้`); return; }
      valid.push({ ...row }); usernamesInBatch.add(row.username.toLowerCase());
    });
    if (errors.length) { toast(errors[0] + (errors.length > 1 ? ` (+${errors.length - 1} อื่นๆ)` : ''), 'bad'); return; }
    if (valid.length === 0) { toast('ยังไม่ได้กรอกข้อมูลใดเลย', 'warn'); return; }
    setSaving(true);
    try {
      for (const row of valid) await callAdminAPI('/api/create-user', row);
      await refresh();
      toast(`เพิ่มผู้ใช้ ${valid.length} คนสำเร็จ`, 'ok');
      setOpenBulk(false); setBulkRows(Array.from({ length: 5 }).map(emptyUser));
    } catch (e) { toast(e.message, 'bad'); }
    finally { setSaving(false); }
  };

  const onEdit = (u) => {
    setEditing(u.id);
    setSingleForm({ username: u.username, password: '', role: u.role, branchId: u.branchId || '', areas: u.areas || [], label: u.label || '' });
    setOpenSingle(true);
  };

  const onDelete = async (u) => {
    if (!window.confirm(`ลบผู้ใช้ "${u.username}"?`)) return;
    try {
      await callAdminAPI('/api/delete-user', { userId: u.id });
      await refresh(); toast('ลบเรียบร้อย', 'ok');
    } catch (e) { toast(e.message, 'bad'); }
  };

  const downloadTemplate = () => {
    const lines = [
      '# TeaLog · Template เพิ่มผู้ใช้',
      '# คอลัมน์: username,password,role,branchId,areas,label',
      '# role ต้องเป็น: Branch | Area | QC | Admin',
      '# Branch ระบุ branchId · Area ระบุ areas คั่นด้วย |',
      `# รหัสสาขาที่มี: ${store.branches.map(b => b.id).join(', ')}`,
      `# พื้นที่ที่มี: ${allAreas.join(', ')}`,
      'username,password,role,branchId,areas,label',
      `branch02,P@ssw0rd,Branch,${store.branches[1]?.id || 'BR02'},,พนักงาน สาขา 02`,
      `areaBkk,P@ssw0rd,Area,,${allAreas.slice(0, 2).join('|')},Area Manager BKK`,
      'qc02,P@ssw0rd,QC,,,QC อุษา',
      'admin02,P@ssw0rd,Admin,,,Admin สำรอง',
    ];
    const csv = '﻿' + lines.join('\r\n') + '\r\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `tealog-users-template-${todayISO()}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('ดาวน์โหลด template แล้ว', 'ok');
  };

  const onFileChosen = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseUsersCSV(text, store.branches, allAreas);
      if (parsed.rows.length === 0) { toast('ไม่พบข้อมูลในไฟล์', 'bad'); return; }
      setBulkRows(parsed.rows);
      const warnMsg = parsed.warnings.length ? ` (มีข้อควรตรวจสอบ ${parsed.warnings.length})` : '';
      toast(`อัพโหลด ${parsed.rows.length} แถว${warnMsg}`, parsed.warnings.length ? 'warn' : 'ok');
    } catch (err) { toast('อ่านไฟล์ไม่สำเร็จ: ' + err.message, 'bad'); }
    finally { e.target.value = ''; }
  };

  const fillBulkTemplate = () => {
    setBulkRows([
      { username: 'branch02', password: 'P@ssw0rd', role: 'Branch', branchId: store.branches[1]?.id || '', areas: [], label: 'พนักงาน สาขา 02' },
      { username: 'branch03', password: 'P@ssw0rd', role: 'Branch', branchId: store.branches[2]?.id || '', areas: [], label: 'พนักงาน สาขา 03' },
      { username: 'areaBkk',  password: 'P@ssw0rd', role: 'Area',   branchId: '', areas: [allAreas[0] || ''], label: 'Area Manager BKK' },
      { username: 'qc02',     password: 'P@ssw0rd', role: 'QC',     branchId: '', areas: [], label: 'QC อุษา' },
      { username: 'admin02',  password: 'P@ssw0rd', role: 'Admin',  branchId: '', areas: [], label: 'Admin สำรอง' },
    ]);
  };

  return (
    <>
      <PageHeader
        eyebrow="User Management" title="จัดการผู้ใช้" subtitle={`มีผู้ใช้ ${store.users.length} คน · กำหนดสิทธิ์ตาม Role`}
        right={
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn ghost" onClick={() => { setSingleForm(emptyUser()); setEditing(null); setOpenSingle(true); }}><Icon name="plus" size={14} /> เพิ่มทีละคน</button>
            <button className="btn amber" onClick={() => setOpenBulk(true)}><Icon name="plus" size={14} /> เพิ่มหลายคนพร้อมกัน</button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }} className="fade-up">
        <RoleStat label="ทั้งหมด" n={counts.all} color="var(--ink)" active={filterRole === 'all'} onClick={() => setFilterRole('all')} />
        {ROLE_OPTIONS.map(r => (
          <RoleStat key={r} label={ROLE_TH[r]} n={counts[r]} color={ROLE_COLOR[r]} active={filterRole === r} onClick={() => setFilterRole(r)} />
        ))}
      </div>

      <div style={{ maxWidth: 380, marginBottom: 14 }}>
        <SearchBox value={q} onChange={setQ} placeholder="ค้นหา username, ชื่อ..." />
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {filtered.length === 0
          ? <Empty icon="user" title="ไม่พบผู้ใช้" subtitle="ลองล้างตัวกรองหรือเพิ่มผู้ใช้ใหม่" />
          : (
            <table className="t">
              <thead>
                <tr><th>Username</th><th>ชื่อแสดง</th><th>Role</th><th>สาขา / พื้นที่</th><th style={{ width: 130 }}></th></tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const branch = u.branchId ? store.branches.find(b => b.id === u.branchId) : null;
                  return (
                    <tr key={u.id}>
                      <td className="font-mono" style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{u.username}</td>
                      <td>{u.label || <span style={{ color: 'var(--ink-3)' }}>—</span>}</td>
                      <td>
                        <span className="badge" style={{ background: `color-mix(in oklch, ${ROLE_COLOR[u.role]} 18%, transparent)`, color: ROLE_COLOR[u.role], fontWeight: 500 }}>
                          <span className="dot" />{ROLE_TH[u.role]}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                        {u.role === 'Branch' && branch && branch.name}
                        {u.role === 'Branch' && !branch && <span style={{ color: 'var(--bad)' }}>ยังไม่ผูกสาขา</span>}
                        {u.role === 'Area' && (u.areas || []).length > 0 && (u.areas || []).map(a => <span key={a} className="badge" style={{ marginRight: 4 }}>{a}</span>)}
                        {u.role === 'Area' && (u.areas || []).length === 0 && <span style={{ color: 'var(--bad)' }}>ยังไม่ผูกพื้นที่</span>}
                        {(u.role === 'QC' || u.role === 'Admin') && <span style={{ color: 'var(--ink-3)' }}>ทุกสาขา</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn ghost sm" onClick={() => onEdit(u)} style={{ marginRight: 6 }}><Icon name="edit" size={12} /></button>
                        <button className="btn ghost sm" onClick={() => onDelete(u)}><Icon name="trash" size={12} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
      </div>

      {/* Single modal */}
      <Modal open={openSingle} onClose={() => { setOpenSingle(false); setEditing(null); }} title={editing ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'} width={520}
        footer={<><button className="btn ghost" onClick={() => { setOpenSingle(false); setEditing(null); }}>ยกเลิก</button><button className="btn amber" onClick={submitSingle} disabled={saving}><Icon name="check" size={14} /> บันทึก</button></>}>
        <UserFormFields form={singleForm} setForm={setSingleForm} branches={store.branches} areas={allAreas} disableUser={!!editing} />
      </Modal>

      {/* Bulk modal */}
      <Modal open={openBulk} onClose={() => setOpenBulk(false)} title="เพิ่มผู้ใช้หลายคนพร้อมกัน" width={1100}
        footer={<>
          <span style={{ marginRight: 'auto', fontSize: 13, color: 'var(--ink-3)' }}>
            <Icon name="sparkle" size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />
            กรอกแถวว่างจะถูกข้าม · กดปุ่ม "+ เพิ่มแถว" ด้านล่างสำหรับเพิ่มอีก
          </span>
          <button className="btn ghost" onClick={() => setOpenBulk(false)}>ยกเลิก</button>
          <button className="btn amber" onClick={submitBulk} disabled={saving}><Icon name="check" size={14} /> เพิ่มทั้งหมด</button>
        </>}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, fontSize: 13, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn ghost sm" onClick={downloadTemplate}><Icon name="arrow-down" size={12} /> ดาวน์โหลด Template CSV</button>
            <button className="btn ghost sm" onClick={() => fileInputRef.current?.click()}><Icon name="arrow-up" size={12} /> อัพโหลดไฟล์ CSV</button>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={onFileChosen} style={{ display: 'none' }} />
            <div style={{ width: 1, height: 24, background: 'var(--line-2)' }} />
            <button className="btn ghost sm" onClick={fillBulkTemplate}><Icon name="sparkle" size={12} /> ตัวอย่าง</button>
            <button className="btn ghost sm" onClick={() => setBulkRows(Array.from({ length: 5 }).map(emptyUser))}><Icon name="x" size={12} /> เคลียร์</button>
          </div>
          <div style={{ color: 'var(--ink-3)' }}>{bulkRows.filter(r => r.username).length} แถวพร้อมบันทึก</div>
        </div>

        <div style={{ padding: '10px 14px', background: 'var(--bg)', border: '1px dashed var(--line-2)', borderRadius: 10, fontSize: 12, color: 'var(--ink-3)', marginBottom: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="sparkle" size={14} style={{ marginTop: 2, color: 'var(--amber)' }} />
          <div>
            <div style={{ color: 'var(--ink-2)', fontWeight: 500, marginBottom: 2 }}>รูปแบบไฟล์ CSV</div>
            <div>คอลัมน์: <span className="font-mono">username, password, role, branchId, areas, label</span> · role = <span className="font-mono">Branch|Area|QC|Admin</span> · หลาย areas คั่นด้วย <span className="font-mono">|</span></div>
          </div>
        </div>

        <div style={{ overflow: 'auto', maxHeight: '60vh', border: '1px solid var(--line)', borderRadius: 12 }}>
          <table className="t" style={{ minWidth: 1000 }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--paper)', zIndex: 1 }}>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>Username *</th><th>รหัสผ่าน *</th><th style={{ width: 140 }}>Role *</th>
                <th>ผูกสาขา / พื้นที่</th><th>ชื่อแสดง</th><th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {bulkRows.map((row, i) => (
                <BulkRow key={i} i={i} row={row}
                  onChange={p => setBulkRows(rows => rows.map((r, idx) => idx === i ? { ...r, ...p } : r))}
                  onRemove={() => setBulkRows(rs => rs.filter((_, idx) => idx !== i))}
                  branches={store.branches} areas={allAreas}
                />
              ))}
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 14, background: 'var(--bg)' }}>
                  <button className="btn ghost sm" onClick={() => setBulkRows(rs => [...rs, emptyUser()])}>
                    <Icon name="plus" size={12} /> เพิ่มแถว
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
}

/* ---------- AdminView ---------- */
export function AdminView({ user, store, refresh, onLogout }) {
  const [page, setPage] = useState('overview');

  const nav = [
    { key: 'overview',      label: 'ภาพรวมระบบ',   icon: 'dashboard' },
    { key: 'users',         label: 'จัดการผู้ใช้',  icon: 'user' },
    { key: 'branches',      label: 'จัดการสาขา',   icon: 'store' },
    { key: 'menus',         label: 'จัดการเมนู',    icon: 'menu' },
    { key: 'materials',     label: 'วัตถุดิบ',      icon: 'box' },
    { key: 'bom',           label: 'ผูก BOM',       icon: 'link' },
    { key: 'history',       label: 'ประวัติการผลิต', icon: 'history' },
    { key: 'defectHistory', label: 'ประวัติเสียหาย', icon: 'trash' },
  ];

  return (
    <AppShell user={user} onLogout={onLogout} nav={nav} current={page} onNav={setPage}>
      {page === 'overview'      && <AdminOverview  store={store} refresh={refresh} />}
      {page === 'users'         && <AdminUsers     store={store} refresh={refresh} />}
      {page === 'branches'      && <AdminBranches  store={store} refresh={refresh} />}
      {page === 'menus'         && <AdminMenus     store={store} refresh={refresh} />}
      {page === 'materials'     && <AdminMaterials store={store} refresh={refresh} />}
      {page === 'bom'           && <AdminBOM       store={store} refresh={refresh} />}
      {page === 'history'       && <SplitHistoryPage records={store.records} store={store} title="ประวัติการผลิตทั้งระบบ" eyebrow="Admin · Production" showBranch showBranchFilter refresh={refresh} />}
      {page === 'defectHistory' && <DefectHistoryPage records={store.records} store={store} title="ประวัติเสียหายทั้งระบบ" eyebrow="Admin · Defects" showBranch showBranchFilter refresh={refresh} />}
    </AppShell>
  );
}
