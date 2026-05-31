import { useState, useMemo } from 'react';
import { AppShell, PageHeader, Icon, StatCard, Empty, Modal, useToast, useIsMobile } from '../components/ui.jsx';
import { HistoryView, DefectHistoryPage } from '../components/History.jsx';
import { todayISO, nowHM, fmtDateTH, fmtNum, greetingTH } from '../lib/helpers.js';
import { DEFECT_REASONS, FAIL_REASONS } from '../lib/constants.js';
import { insertRecord, insertRecords } from '../lib/db.js';

export function BranchView({ user, store, refresh, onLogout }) {
  const [page, setPage] = useState('home');
  const branch = store.branches.find(b => b.id === user.branchId);
  const myRecords = store.records.filter(r => r.branchId === user.branchId);

  const nav = [
    { key: 'home',          label: 'หน้าหลัก',        icon: 'dashboard' },
    { key: 'produce',       label: 'บันทึกล็อตผลิต',    icon: 'factory' },
    { key: 'defect',        label: 'บันทึกของเสียหาย',  icon: 'alert' },
    { key: 'history',       label: 'ประวัติการผลิต',    icon: 'history' },
    { key: 'defectHistory', label: 'ประวัติเสียหาย',    icon: 'trash' },
  ];

  return (
    <AppShell user={user} onLogout={onLogout} nav={nav} current={page} onNav={setPage}>
      {page === 'home'          && <BranchHome user={user} branch={branch} records={myRecords} go={setPage} store={store} />}
      {page === 'produce'       && <BranchProduce user={user} store={store} refresh={refresh} />}
      {page === 'defect'        && <BranchDefect user={user} store={store} refresh={refresh} />}
      {page === 'history'       && <BranchHistory records={myRecords} store={store} refresh={refresh} />}
      {page === 'defectHistory' && <DefectHistoryPage records={myRecords} store={store} title="ประวัติเสียหายของสาขา" eyebrow="Defect History" showBranch={false} refresh={refresh} />}
    </AppShell>
  );
}

function BranchHome({ user, branch, records, go, store }) {
  const isMobile = useIsMobile();
  const today = todayISO();
  const todayProd = records.filter(r => r.type === 'production' && r.date === today);
  const todayDef  = records.filter(r => r.type === 'defect'     && r.date === today);
  const todayPass = todayProd.filter(r => r.status === 'passed').length;
  const todayFail = todayProd.filter(r => r.status === 'failed').length;
  const passRate  = todayProd.length ? Math.round(todayPass / todayProd.length * 100) : 0;

  const trend = useMemo(() => {
    const arr = [];
    for (let d = 6; d >= 0; d--) {
      const day = new Date(); day.setDate(day.getDate() - d);
      const iso = day.toISOString().slice(0, 10);
      arr.push(records.filter(r => r.type === 'production' && r.date === iso).length);
    }
    return arr;
  }, [records]);

  const recent = records.slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 5);

  return (
    <>
      <PageHeader
        eyebrow={branch?.name}
        title={greetingTH() + ', ' + (user.label || user.username).split(' ')[0]}
        subtitle={`วันนี้ ${fmtDateTH(today)} · มาเริ่มบันทึกล็อตการผลิตของวันนี้กันเลย`}
        right={
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn ghost" onClick={() => go('history')}><Icon name="history" size={14} /> ดูประวัติ</button>
            <button className="btn amber" onClick={() => go('produce')}><Icon name="plus" size={14} /> บันทึกล็อตใหม่</button>
          </div>
        }
      />
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isMobile ? 12 : 18, marginBottom: 24 }} className="fade-up">
        <StatCard label="ล็อตวันนี้"   value={todayProd.length} icon="factory" accent="var(--amber)"  trend={trend} />
        <StatCard label="ผ่าน QC"      value={todayPass} sub={`${passRate}% ของวันนี้`} icon="check" accent="var(--matcha)" />
        <StatCard label="ไม่ผ่าน QC"   value={todayFail} sub="ต้องแก้ไข" icon="alert" accent="var(--bad)" />
        <StatCard label="ของเสียหาย"   value={todayDef.length} sub={`รวม ${records.filter(r => r.type === 'defect').length} ครั้ง`} icon="trash" accent="var(--info)" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 18 }}>
        <div className="card" style={{ padding: '22px 26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 className="font-display" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>กิจกรรมล่าสุด</h3>
            <button className="btn ghost sm" onClick={() => go('history')}>ดูทั้งหมด</button>
          </div>
          {recent.length === 0 ? <Empty title="ยังไม่มีการบันทึก" subtitle='กดปุ่ม "บันทึกล็อตใหม่" เพื่อเริ่ม' /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {recent.map(r => <RecordRow key={r.id} r={r} store={store} />)}
            </div>
          )}
        </div>
        <div className="card" style={{ padding: '22px 26px' }}>
          <h3 className="font-display" style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>เริ่มทำงานวันนี้</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <QuickAction onClick={() => go('produce')} icon="factory" color="var(--amber)" title="บันทึกล็อตการผลิต" desc="เริ่มล็อตใหม่ของวันนี้" />
            <QuickAction onClick={() => go('defect')} icon="alert" color="var(--bad)" title="บันทึกของเสียหาย" desc="ลงทะเบียนของเสียจากการผลิต" />
            <QuickAction onClick={() => go('history')} icon="history" color="var(--info)" title="ดูประวัติย้อนหลัง" desc="ค้นหาล็อตที่เคยบันทึก" />
          </div>
        </div>
      </div>
    </>
  );
}

function QuickAction({ icon, color, title, desc, onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--line)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 200ms' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = 'none'; }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `color-mix(in oklch, ${color} 18%, white)`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={icon} size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{desc}</div>
      </div>
      <Icon name="chevron" size={16} style={{ transform: 'rotate(-90deg)', color: 'var(--ink-3)' }} />
    </button>
  );
}

export function RecordRow({ r, store, showBranch }) {
  const menu = store.menus.find(m => m.id === r.menuId);
  const branch = showBranch ? store.branches.find(b => b.id === r.branchId) : null;
  const isProd = r.type === 'production';
  const passed = r.status === 'passed';
  const dot = isProd ? (passed ? 'var(--ok)' : 'var(--bad)') : 'var(--warn)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 6px', borderBottom: '1px solid var(--line)' }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: `color-mix(in oklch, ${dot} 15%, white)`, color: dot, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={isProd ? 'factory' : 'alert'} size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{menu?.name}</span>
          {isProd ? (
            <span className={`badge ${passed ? 'ok' : 'bad'}`}><span className="dot" />{passed ? 'ผ่าน' : 'ไม่ผ่าน'}</span>
          ) : (
            <span className="badge warn"><span className="dot" />ของเสีย</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          <span className="font-mono">{r.id}</span> · {r.qty.toLocaleString()} {r.unit} · {r.time}
          {branch && <> · {branch.name}</>}
          {r.reason && <> · {r.reason}</>}
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{fmtDateTH(r.date)}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--line)' }}>
      <span style={{ color: 'var(--ink-3)' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function BranchProduce({ user, store, refresh }) {
  const toast = useToast();
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cat, setCat] = useState('all');
  const [saving, setSaving] = useState(false);

  function emptyForm() {
    return { status: 'passed', reason: '', note: '', freezeTemp: '', timeMode: 'now', date: todayISO(), time: nowHM(), materialLots: {}, producer: '', tester: '' };
  }

  const categories = ['all', ...new Set(store.menus.map(m => m.category))];
  const menus = cat === 'all' ? store.menus : store.menus.filter(m => m.category === cat);
  const bomLines = selected ? (store.bomProd?.[selected.id] || []) : [];
  const needsFreeze = selected && /ไข่มุกโมจิ/.test(selected.name);

  const pick = (m) => {
    setSelected(m);
    const lots = {};
    (store.bomProd?.[m.id] || []).forEach(b => { lots[b.code] = ''; });
    setForm(f => ({ ...f, materialLots: lots, freezeTemp: '' }));
  };

  const setLot = (code, val) => setForm(f => ({ ...f, materialLots: { ...f.materialLots, [code]: val } }));

  const submit = async () => {
    if (!selected) return toast('กรุณาเลือกเมนู', 'bad');
    const missingLots = bomLines.filter(b => !form.materialLots[b.code] || !String(form.materialLots[b.code]).trim());
    if (missingLots.length) {
      const ing = store.ingredients.find(i => i.code === missingLots[0].code);
      return toast(`กรุณากรอกล็อตของ ${ing?.name || missingLots[0].code}`, 'bad');
    }
    if (needsFreeze) {
      if (!form.freezeTemp || !form.freezeTemp.trim()) return toast('กรุณาวัดอุณหภูมิแช่แข็งของไข่มุก', 'bad');
      const temps = form.freezeTemp.split(',').map(s => Number(s.trim()));
      if (temps.some(t => !Number.isFinite(t))) return toast('อุณหภูมิไม่ถูกต้อง — กรอกตัวเลข คั่นด้วย , เช่น -18, -17', 'bad');
    }
    let date = todayISO(), time = nowHM();
    if (form.timeMode === 'back') {
      if (!form.date || !form.time) return toast('กรอกวัน/เวลาบันทึกย้อนหลัง', 'bad');
      if (form.date > todayISO()) return toast('วันที่ต้องไม่ใช่อนาคต', 'bad');
      date = form.date; time = form.time;
    }
    if (form.status === 'failed' && !form.reason) return toast('ระบุสาเหตุไม่ผ่าน', 'bad');
    if (!form.producer.trim()) return toast('กรอกชื่อผู้ผลิต', 'bad');
    if (!form.tester.trim())   return toast('กรอกชื่อผู้ทดสอบ', 'bad');

    const rec = {
      id: `LOT-${date.replace(/-/g, '')}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      type: 'production', date, time,
      branchId: user.branchId, menuId: selected.id,
      qty: selected.yield, unit: selected.unit,
      status: form.status, reason: form.reason, note: form.note,
      materialLots: form.materialLots,
      freezeTemp: needsFreeze ? form.freezeTemp.trim() : null,
      backdated: form.timeMode === 'back',
      producer: form.producer.trim(), tester: form.tester.trim(),
      by: user.id,
    };
    setSaving(true);
    try {
      await insertRecord(rec);
      await refresh();
      toast(`บันทึก ${rec.id} สำเร็จ`, 'ok');
      setSelected(null); setForm(emptyForm()); setConfirmOpen(false);
    } catch (e) {
      toast('บันทึกไม่สำเร็จ: ' + e.message, 'bad');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Production Log" title="บันทึกล็อตการผลิต" subtitle="เลือกเมนูที่ผลิต กรอกรายละเอียด แล้วบันทึกเข้าระบบ" />
      <div style={{ maxWidth: 760, margin: '0 auto' }} className="fade-up">
        <div className="card" style={{ padding: '28px 30px' }}>
          <h3 className="font-display" style={{ margin: '0 0 18px', fontSize: 20, fontWeight: 600 }}>รายละเอียดการผลิต</h3>
          <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500, letterSpacing: '.02em', textTransform: 'uppercase', marginBottom: 10 }}>เลือกเมนูที่ผลิต</div>
            <div style={{ display: 'flex', gap: 0, marginBottom: 14, padding: 4, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 99, overflow: 'hidden' }}>
              {categories.map(c => (
                <button key={c} onClick={() => setCat(c)} style={{ flex: 1, padding: '9px 12px', borderRadius: 99, border: 'none', background: cat === c ? 'var(--paper)' : 'transparent', color: cat === c ? 'var(--ink)' : 'var(--ink-3)', boxShadow: cat === c ? 'var(--shadow-sm)' : 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: cat === c ? 600 : 500, cursor: 'pointer', transition: 'all 140ms', whiteSpace: 'nowrap' }}>
                  {c === 'all' ? 'ทั้งหมด' : c}
                </button>
              ))}
            </div>
            <select className="inp" value={selected?.id || ''} onChange={e => { const m = store.menus.find(x => x.id === e.target.value); if (m) pick(m); else setSelected(null); }} style={{ fontSize: 15, padding: '14px' }}>
              <option value="">— เลือกเมนู —</option>
              {menus.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500, letterSpacing: '.02em', textTransform: 'uppercase' }}>วัตถุดิบ &amp; ล็อต</span>
                  {bomLines.length > 0 && <span className="badge"><span className="dot" />{bomLines.length} รายการ</span>}
                </div>
                {bomLines.length === 0 ? (
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(201,138,60,.08)', border: '1px dashed var(--line-2)', fontSize: 13, color: 'var(--ink-3)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <Icon name="alert" size={14} style={{ marginTop: 2, color: 'var(--warn)' }} />
                    <div>ยังไม่มี BOM ผูกกับเมนูนี้ — แจ้ง Admin เพื่อผูกวัตถุดิบ<br /><span style={{ color: 'var(--ink-3)' }}>สามารถบันทึกล็อตต่อได้ แต่ไม่มี traceability วัตถุดิบ</span></div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {bomLines.map(b => {
                      const ing = store.ingredients.find(i => i.code === b.code);
                      const filled = !!(form.materialLots[b.code] || '').trim();
                      return (
                        <div key={b.code} style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 10, alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: filled ? 'var(--paper)' : 'var(--bg)', border: `1px solid ${filled ? 'var(--line)' : 'var(--line-2)'}`, transition: 'all 140ms' }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ing?.name || b.code}</div>
                          <input className="inp" style={{ padding: '8px 12px', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }} placeholder="ล็อตวัตถุดิบ" value={form.materialLots[b.code] || ''} onChange={e => setLot(b.code, e.target.value)} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {needsFreeze && (() => {
                const raw = form.freezeTemp || '';
                const hasVal = raw.trim() !== '';
                const parts = hasVal ? raw.split(',').map(s => s.trim()) : [];
                const parsedAll = parts.length > 0 && parts.every(s => s !== '' && Number.isFinite(Number(s)));
                const temps = parsedAll ? parts.map(Number) : [];
                const allOK = parsedAll && temps.every(t => t <= -18);
                const anyAbove = parsedAll && temps.some(t => t > -18);
                const borderColor = !hasVal ? 'var(--line-2)' : !parsedAll ? 'var(--bad)' : allOK ? 'var(--ok)' : 'var(--warn)';
                const bgColor    = !hasVal ? 'var(--paper)' : !parsedAll ? 'rgba(192,57,43,.04)' : allOK ? 'rgba(78,124,58,.05)' : 'rgba(201,138,60,.06)';
                return (
                  <label className="field fade-up">
                    <span>อุณหภูมิแช่แข็งไข่มุก <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(แนะนำ ≤ -18°C)</span></span>
                    <div style={{ position: 'relative' }}>
                      <input type="text" inputMode="decimal" className="inp"
                        value={raw}
                        onChange={e => setForm({ ...form, freezeTemp: e.target.value })}
                        placeholder="-18.0 หรือ -18, -17"
                        style={{ paddingRight: 80, fontFamily: 'Space Grotesk', borderColor, background: bgColor }}
                      />
                      <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        °C
                        {hasVal && parsedAll && (allOK
                          ? <Icon name="check" size={14} style={{ color: 'var(--ok)' }} />
                          : <Icon name="alert" size={14} style={{ color: 'var(--warn)' }} />)}
                      </span>
                    </div>
                    {hasVal && !parsedAll && (
                      <div style={{ fontSize: 12, color: 'var(--bad)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon name="alert" size={12} />รูปแบบไม่ถูกต้อง — กรอกตัวเลข คั่นด้วย , เช่น -18, -17
                      </div>
                    )}
                    {hasVal && parsedAll && anyAbove && (
                      <div style={{ fontSize: 12, color: 'var(--warn)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon name="alert" size={12} />อุณหภูมิบางถุงสูงกว่ามาตรฐาน — แนะนำให้แช่ที่ ≤ -18°C เพื่อคุณภาพไข่มุก
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 5 }}>
                      หากมีหลายถุง คั่นด้วยเครื่องหมาย , เช่น -18, -17
                    </div>
                  </label>
                );
              })()}

              <label className="field">
                <span>เวลาบันทึก</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[{ v: 'now', l: 'บันทึกทันที', ic: 'sparkle' }, { v: 'back', l: 'บันทึกย้อนหลัง', ic: 'history' }].map(o => (
                    <button key={o.v} onClick={() => setForm({ ...form, timeMode: o.v, date: todayISO(), time: nowHM() })} style={{ padding: '10px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', background: form.timeMode === o.v ? 'var(--ink)' : 'var(--paper)', color: form.timeMode === o.v ? '#fffdf7' : 'var(--ink)', border: `1px solid ${form.timeMode === o.v ? 'var(--ink)' : 'var(--line-2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 500, fontSize: 13, transition: 'all 140ms' }}>
                      <Icon name={o.ic} size={14} /> {o.l}
                    </button>
                  ))}
                </div>
                {form.timeMode === 'now' ? (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="calendar" size={12} />
                    <span>จะใช้เวลา <span className="num" style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{fmtDateTH(todayISO())} · {nowHM()}</span></span>
                  </div>
                ) : (
                  <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }} className="fade-up">
                    <input type="date" className="inp" value={form.date} max={todayISO()} onChange={e => setForm({ ...form, date: e.target.value })} />
                    <input type="time" className="inp" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
                  </div>
                )}
              </label>

              <label className="field">
                <span>ผลการเทสชิม</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[{ v: 'passed', l: 'ผ่าน', c: 'var(--ok)' }, { v: 'failed', l: 'ไม่ผ่าน', c: 'var(--bad)' }].map(o => (
                    <button key={o.v} onClick={() => setForm({ ...form, status: o.v })} style={{ padding: '12px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', background: form.status === o.v ? o.c : 'var(--paper)', color: form.status === o.v ? '#fffdf7' : 'var(--ink)', border: `1px solid ${form.status === o.v ? o.c : 'var(--line-2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 500, transition: 'all 140ms' }}>
                      <Icon name={o.v === 'passed' ? 'check' : 'x'} size={14} /> {o.l}
                    </button>
                  ))}
                </div>
              </label>

              {form.status === 'failed' && (
                <label className="field fade-up">
                  <span>สาเหตุที่ไม่ผ่าน</span>
                  <select className="inp" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}>
                    <option value="">— เลือก —</option>
                    {FAIL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label className="field">
                  <span>ผู้ผลิต</span>
                  <div style={{ position: 'relative' }}>
                    <Icon name="user" size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
                    <input className="inp" value={form.producer} onChange={e => setForm({ ...form, producer: e.target.value })} placeholder="ชื่อผู้ผลิตล็อตนี้" style={{ paddingLeft: 34 }} />
                  </div>
                </label>
                <label className="field">
                  <span>ผู้ทดสอบ</span>
                  <div style={{ position: 'relative' }}>
                    <Icon name="user" size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
                    <input className="inp" value={form.tester} onChange={e => setForm({ ...form, tester: e.target.value })} placeholder="ชื่อผู้ทดสอบชิม" style={{ paddingLeft: 34 }} />
                  </div>
                </label>
              </div>

              <label className="field">
                <span>หมายเหตุ (ไม่บังคับ)</span>
                <textarea className="inp" rows={2} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="รายละเอียดเพิ่มเติม..." />
              </label>

              <button className="btn amber" style={{ justifyContent: 'center', padding: '14px' }} onClick={() => setConfirmOpen(true)}>
                <Icon name="check" size={14} /> บันทึกล็อตการผลิต
              </button>
            </div>
          ) : (
            <Empty icon="cup" title="ยังไม่ได้เลือกเมนู" subtitle="เลือกหมวดและเมนูด้านบนเพื่อเริ่ม" />
          )}
        </div>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="ยืนยันบันทึกล็อต" width={620}
        footer={<>
          <button className="btn ghost" onClick={() => setConfirmOpen(false)}>ยกเลิก</button>
          <button className="btn amber" onClick={submit} disabled={saving}><Icon name="check" size={14} /> {saving ? 'กำลังบันทึก...' : 'ยืนยัน'}</button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
          <Row label="เมนู" value={selected?.name} />
          {needsFreeze && <Row label="อุณหภูมิแช่แข็ง" value={`${form.freezeTemp} °C`} />}
          <Row label="ผลการเทสชิม" value={form.status === 'passed' ? 'ผ่าน' : `ไม่ผ่าน (${form.reason})`} />
          <Row label="ผู้ผลิต" value={form.producer} />
          <Row label="ผู้ทดสอบ" value={form.tester} />
          <Row label="เวลา" value={form.timeMode === 'back' ? `${fmtDateTH(form.date)} · ${form.time} (ย้อนหลัง)` : `${fmtDateTH(todayISO())} · ${nowHM()}`} />
          <Row label="บันทึกโดย" value={user.label || user.username} />
          {bomLines.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 500 }}>ล็อตวัตถุดิบที่ใช้</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {bomLines.map(b => {
                  const ing = store.ingredients.find(i => i.code === b.code);
                  return (
                    <div key={b.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 13 }}>
                      <span style={{ color: 'var(--ink-2)' }}>{ing?.name || b.code}</span>
                      <span className="font-mono" style={{ color: 'var(--ink)', fontWeight: 500 }}>{form.materialLots[b.code] || '—'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

function BranchDefect({ user, store, refresh }) {
  const toast = useToast();
  const [items, setItems] = useState([{ menuId: '', grams: '' }]);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [cat, setCat] = useState('all');

  const categories = ['all', ...new Set(store.menus.map(m => m.category))];
  const filteredMenus = cat === 'all' ? store.menus : store.menus.filter(m => m.category === cat);

  const updateItem = (i, patch) => setItems(arr => arr.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const addRow = () => setItems(arr => [...arr, { menuId: '', grams: '' }]);
  const removeRow = (i) => setItems(arr => arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr);

  const totalGrams = items.reduce((s, it) => s + Number(it.grams || 0), 0);
  const validRows = items.filter(it => it.menuId && Number(it.grams || 0) > 0);

  const submit = async () => {
    if (validRows.length === 0) return toast('กรุณาเพิ่มอย่างน้อย 1 เมนูพร้อมจำนวนกรัม', 'bad');
    if (!reason) return toast('ระบุสาเหตุ', 'bad');
    const baseDate = todayISO(), baseTime = nowHM();
    const newRecs = validRows.map((it, idx) => {
      const menu = store.menus.find(m => m.id === it.menuId);
      const bom = store.bomDefect?.[menu.id] || [];
      const grams = Number(it.grams);
      const matBreakdown = bom.map(b => {
        const ing = store.ingredients.find(i => i.code === b.code);
        return { code: b.code, name: ing?.name || b.code, unit: ing?.unit || '', qty: grams * b.qty };
      });
      return {
        id: `DEF-${baseDate.replace(/-/g, '')}-${String(Math.floor(Math.random() * 9000) + 1000 + idx)}`,
        type: 'defect', date: baseDate, time: baseTime,
        branchId: user.branchId, menuId: menu.id,
        qty: grams, unit: 'กรัม',
        reason, note, materialBreakdown: matBreakdown,
        by: user.id,
      };
    });
    setSaving(true);
    try {
      await insertRecords(newRecs);
      await refresh();
      toast(`บันทึกของเสีย ${newRecs.length} รายการ`, 'warn');
      setItems([{ menuId: '', grams: '' }]); setReason(''); setNote('');
    } catch (e) {
      toast('บันทึกไม่สำเร็จ: ' + e.message, 'bad');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Defect Log" title="บันทึกของเสียหาย" subtitle="ลงบันทึกของเสียจากการผลิต — กรอกเป็นกรัม ระบบจะคำนวณวัตถุดิบที่เสียให้อัตโนมัติ" />
      <div className="fade-up">
        <div className="card" style={{ padding: '24px 26px', maxWidth: 720, margin: '0 auto' }}>
          <h3 className="font-display" style={{ margin: '0 0 18px', fontSize: 18, fontWeight: 600 }}>กรอกข้อมูลของเสีย</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500, letterSpacing: '.02em', textTransform: 'uppercase' }}>รายการเมนูที่เสีย</span>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>รวม <span className="num" style={{ color: 'var(--ink)', fontWeight: 500 }}>{fmtNum(totalGrams)}</span> กรัม</span>
            </div>
            <div style={{ display: 'flex', gap: 0, padding: 4, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 99, overflow: 'hidden' }}>
              {categories.map(c => (
                <button key={c} onClick={() => setCat(c)} style={{ flex: 1, padding: '9px 12px', borderRadius: 99, border: 'none', background: cat === c ? 'var(--paper)' : 'transparent', color: cat === c ? 'var(--ink)' : 'var(--ink-3)', boxShadow: cat === c ? 'var(--shadow-sm)' : 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: cat === c ? 600 : 500, cursor: 'pointer', transition: 'all 140ms', whiteSpace: 'nowrap' }}>
                  {c === 'all' ? 'ทั้งหมด' : c}
                </button>
              ))}
            </div>
            {items.map((it, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 36px', gap: 8, alignItems: 'center' }}>
                <select className="inp" value={it.menuId} onChange={e => updateItem(i, { menuId: e.target.value })}>
                  <option value="">— เลือกเมนู —</option>
                  {filteredMenus.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  {it.menuId && !filteredMenus.find(m => m.id === it.menuId) && (() => {
                    const m = store.menus.find(m => m.id === it.menuId);
                    return m ? <option key={m.id} value={m.id}>{m.name}</option> : null;
                  })()}
                </select>
                <div style={{ position: 'relative' }}>
                  <input type="number" className="inp" value={it.grams} onChange={e => updateItem(i, { grams: e.target.value })} placeholder="0" style={{ paddingRight: 36, fontFamily: 'Space Grotesk', textAlign: 'right' }} />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--ink-3)' }}>กรัม</span>
                </div>
                <button className="btn ghost sm" onClick={() => removeRow(i)} disabled={items.length === 1} style={{ padding: '7px 10px' }}><Icon name="x" size={12} /></button>
              </div>
            ))}
            <button className="btn ghost sm" onClick={addRow} style={{ alignSelf: 'flex-start' }}><Icon name="plus" size={12} /> เพิ่มเมนู</button>
          </div>
          <label className="field" style={{ marginBottom: 14, marginTop: 6 }}>
            <span>สาเหตุของเสีย</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {DEFECT_REASONS.map(r => <button key={r} className={`chip ${reason === r ? 'active' : ''}`} onClick={() => setReason(r)}>{r}</button>)}
            </div>
          </label>
          <label className="field" style={{ marginBottom: 14 }}>
            <span>หมายเหตุ</span>
            <textarea className="inp" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="คำอธิบายเพิ่มเติม..." />
          </label>
          <button className="btn danger" style={{ justifyContent: 'center', padding: '14px', width: '100%' }} onClick={submit} disabled={saving}>
            <Icon name="alert" size={14} /> {saving ? 'กำลังบันทึก...' : `บันทึกของเสีย ${validRows.length > 0 ? `(${validRows.length} รายการ)` : ''}`}
          </button>
        </div>
      </div>
    </>
  );
}

function BranchHistory({ records, store, refresh }) {
  return (
    <>
      <PageHeader eyebrow="History" title="ประวัติการผลิต" subtitle="ดูประวัติการผลิตของสาขา · ลบ / Export ได้" />
      <HistoryView mode="production" records={records} store={store} sectionTitle="ประวัติการผลิต" sectionIcon="factory" showBranch={false} refresh={refresh} />
    </>
  );
}
