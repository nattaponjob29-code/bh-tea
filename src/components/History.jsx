import { useState, useMemo, useRef, useEffect, Fragment } from 'react';
import { Icon, SearchBox, Empty, Modal, useToast } from './ui.jsx';
import { fmtDateTH, fmtNum, todayISO, csvCell } from '../lib/helpers.js';
import { deleteRecord, deleteRecords } from '../lib/db.js';

export function DateQuickPresets({ setFrom, setTo, compact = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const apply = (n) => {
    if (n === 'all') { setFrom(''); setTo(''); }
    else if (n === 'today') { const t = todayISO(); setFrom(t); setTo(t); }
    else {
      const t = todayISO();
      const d = new Date(t + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - (n - 1));
      setFrom(d.toISOString().slice(0, 10));
      setTo(t);
    }
    setOpen(false);
  };

  const presets = [
    { l: 'วันนี้',       v: 'today' },
    { l: '7 วันล่าสุด',  v: 7 },
    { l: '30 วันล่าสุด', v: 30 },
    { l: 'ทั้งหมด',      v: 'all' },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn ghost" onClick={() => setOpen(o => !o)} style={{ padding: compact ? '10px 12px' : '10px 14px' }}>
        <Icon name="calendar" size={14} />
        {!compact && <> ช่วงเวลา <Icon name="chevron" size={12} /></>}
      </button>
      {open && (
        <div className="card fade-up" style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 50, padding: 6, minWidth: 180, boxShadow: 'var(--shadow-lg)' }}>
          {presets.map(p => (
            <button key={p.v} onClick={() => apply(p.v)} style={{
              display: 'block', width: '100%', padding: '9px 12px', borderRadius: 8,
              background: 'transparent', border: 'none', textAlign: 'left',
              fontFamily: 'inherit', fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer', transition: 'all 100ms',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {p.l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Tag({ k, v, color }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 99, fontSize: 12 }}>
      {k && <span style={{ color: 'var(--ink-3)' }}>{k}:</span>}
      <span style={{ color: color || 'var(--ink)', fontWeight: 500 }}>{v}</span>
    </div>
  );
}

function DetailPanel({ record, store, mode, lotEntries }) {
  const r = record;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: mode === 'defect' ? '1.2fr 1fr' : '1fr', gap: 14, paddingTop: 6 }}>
      {mode === 'production' && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 8 }}>
            ล็อตวัตถุดิบ ({lotEntries.length})
          </div>
          {lotEntries.length === 0 ? (
            <div style={{ padding: '12px 14px', background: 'var(--paper)', border: '1px dashed var(--line-2)', borderRadius: 10, fontSize: 13, color: 'var(--ink-3)' }}>
              ไม่ได้บันทึกล็อตวัตถุดิบไว้
            </div>
          ) : (
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
              <table className="t" style={{ fontSize: 13 }}>
                <thead><tr><th>รหัส</th><th>วัตถุดิบ</th><th>ล็อต</th></tr></thead>
                <tbody>
                  {lotEntries.map(([code, lot]) => {
                    const ing = store.ingredients.find(i => i.code === code);
                    return (
                      <tr key={code}>
                        <td className="font-mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>{code}</td>
                        <td style={{ fontWeight: 500 }}>{ing?.name || '—'}</td>
                        <td className="font-mono" style={{ color: 'var(--ink)', fontWeight: 500 }}>{lot}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {r.producer && <Tag k="ผู้ผลิต" v={r.producer} />}
            {r.tester   && <Tag k="ผู้ทดสอบ" v={r.tester} />}
            {r.freezeTemp != null && <Tag k="อุณหภูมิ" v={`${r.freezeTemp}°C`} />}
            {r.backdated && <Tag k="" v="บันทึกย้อนหลัง" color="var(--warn)" />}
            {r.by && <Tag k="บันทึกโดย" v={r.by} />}
          </div>
          {r.note && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 13, color: 'var(--ink-2)' }}>
              <div style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4, fontWeight: 500 }}>หมายเหตุ</div>
              {r.note}
            </div>
          )}
        </div>
      )}
      {mode === 'defect' && (
        <>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 8 }}>
              วัตถุดิบที่เสีย ({(r.materialBreakdown || []).length})
            </div>
            {(r.materialBreakdown || []).length === 0 ? (
              <div style={{ padding: '12px 14px', background: 'var(--paper)', border: '1px dashed var(--line-2)', borderRadius: 10, fontSize: 13, color: 'var(--ink-3)' }}>
                ยังไม่ผูก BOM เสียหาย — ไม่มีการคำนวณ
              </div>
            ) : (
              <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
                <table className="t" style={{ fontSize: 13 }}>
                  <thead><tr><th>รหัส</th><th>วัตถุดิบ</th><th style={{ textAlign: 'right' }}>จำนวน</th></tr></thead>
                  <tbody>
                    {r.materialBreakdown.map(x => (
                      <tr key={x.code}>
                        <td className="font-mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>{x.code}</td>
                        <td style={{ fontWeight: 500 }}>{x.name}</td>
                        <td className="num" style={{ textAlign: 'right', color: 'var(--bad)', fontWeight: 500 }}>{x.qty.toFixed(3)} <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 400 }}>{x.unit}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 8 }}>รายละเอียด</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {r.reason && <Tag k="สาเหตุ" v={r.reason} color="var(--warn)" />}
              {r.by     && <Tag k="บันทึกโดย" v={r.by} />}
              {r.note   && (
                <div style={{ padding: '10px 14px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 13, color: 'var(--ink-2)' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4, fontWeight: 500 }}>หมายเหตุ</div>
                  {r.note}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function exportRecordsCSV(records, store, mode) {
  const head = mode === 'defect'
    ? ['ID', 'วันที่', 'เวลา', 'สาขา', 'เมนู', 'ปริมาณ (กรัม)', 'สาเหตุ', 'หมายเหตุ', 'วัตถุดิบที่เสีย', 'ผู้บันทึก']
    : ['ID', 'วันที่', 'เวลา', 'สาขา', 'เมนู', 'ปริมาณ', 'หน่วย', 'ผล', 'สาเหตุไม่ผ่าน', 'ผู้ผลิต', 'ผู้ทดสอบ', 'อุณหภูมิ°C', 'ย้อนหลัง', 'ล็อตวัตถุดิบ', 'หมายเหตุ'];
  const rows = [head];
  records.forEach(r => {
    const m = store.menus.find(x => x.id === r.menuId);
    const b = store.branches.find(x => x.id === r.branchId);
    if (mode === 'defect') {
      const matStr = (r.materialBreakdown || []).map(x => `${x.code} ${x.name} ${x.qty.toFixed(2)}${x.unit}`).join(' | ');
      rows.push([r.id, r.date, r.time, b?.name || '', m?.name || '', r.qty, r.reason || '', r.note || '', matStr, r.by || '']);
    } else {
      const lots = r.materialLots ? Object.entries(r.materialLots).map(([code, lot]) => `${code}:${lot}`).join(' | ') : '';
      rows.push([r.id, r.date, r.time, b?.name || '', m?.name || '', r.qty, r.unit, r.status === 'passed' ? 'ผ่าน' : 'ไม่ผ่าน', r.reason || '', r.producer || '', r.tester || '', r.freezeTemp != null ? r.freezeTemp : '', r.backdated ? 'ใช่' : '', lots, r.note || '']);
    }
  });
  return '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
}

export function HistoryView({ records, store, sectionTitle, sectionIcon = 'history', mode = 'all', showBranch = true, showBranchFilter = false, refresh, title, eyebrow, branches }) {
  const toast = useToast();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState(() => todayISO());
  const [to, setTo] = useState(() => todayISO());
  const [branchFilter, setBranchFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const branchList = branches || store.branches;

  const scopedRecords = useMemo(() => {
    if (mode === 'production') return records.filter(r => r.type === 'production');
    if (mode === 'defect')     return records.filter(r => r.type === 'defect');
    return records;
  }, [records, mode]);

  const filtered = useMemo(() => {
    return scopedRecords.filter(r => {
      if (mode === 'production') {
        if (tab === 'passed' && r.status !== 'passed') return false;
        if (tab === 'failed' && r.status !== 'failed') return false;
      }
      if (q) {
        const menu = store.menus.find(m => m.id === r.menuId)?.name || '';
        const branch = store.branches.find(b => b.id === r.branchId)?.name || '';
        const lots = r.materialLots ? Object.values(r.materialLots).join(' ') : '';
        const hay = (r.id + ' ' + menu + ' ' + branch + ' ' + (r.reason || '') + ' ' + (r.producer || '') + ' ' + (r.tester || '') + ' ' + lots + ' ' + (r.note || '')).toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (from && r.date < from) return false;
      if (to && r.date > to) return false;
      if (showBranchFilter && branchFilter !== 'all' && r.branchId !== branchFilter) return false;
      return true;
    }).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [scopedRecords, tab, q, from, to, branchFilter, store, showBranchFilter, mode]);

  const counts = useMemo(() => {
    if (mode === 'production') {
      return { all: scopedRecords.length, passed: scopedRecords.filter(r => r.status === 'passed').length, failed: scopedRecords.filter(r => r.status === 'failed').length };
    }
    return { all: scopedRecords.length };
  }, [scopedRecords, mode]);

  const onDelete = async (rec) => {
    setDeleting(true);
    try {
      await deleteRecord(rec.id);
      refresh && await refresh();
      toast(`ลบ ${rec.id} แล้ว`, 'ok');
      setDeleteTarget(null);
    } catch (e) {
      toast('ลบไม่สำเร็จ: ' + e.message, 'bad');
    } finally {
      setDeleting(false);
    }
  };

  const onDeleteAll = async () => {
    setDeleting(true);
    try {
      await deleteRecords(filtered.map(r => r.id));
      refresh && await refresh();
      toast(`ลบ ${filtered.length} รายการแล้ว`, 'ok');
      setDeleteAllOpen(false);
    } catch (e) {
      toast('ลบไม่สำเร็จ: ' + e.message, 'bad');
    } finally {
      setDeleting(false);
    }
  };

  const onExport = () => {
    const csv = exportRecordsCSV(filtered, store, mode);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mode === 'defect' ? 'defects' : 'production'}-${todayISO()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Export ${filtered.length} แถว`, 'ok');
  };

  const tabs = mode === 'production' ? [
    { k: 'all',    l: 'ทั้งหมด',  n: counts.all,    c: 'var(--ink)' },
    { k: 'passed', l: 'ผ่าน',     n: counts.passed, c: 'var(--ok)' },
    { k: 'failed', l: 'ไม่ผ่าน',  n: counts.failed, c: 'var(--bad)' },
  ] : null;

  const accent = mode === 'defect' ? 'var(--warn)' : 'var(--amber)';

  return (
    <>
      {(title || eyebrow) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, gap: 20 }} className="fade-up">
          <div>
            {eyebrow && <div style={{ fontSize: 12, color: 'var(--ink-3)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 500 }}>{eyebrow}</div>}
            <h1 className="font-display" style={{ margin: 0, fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{title}</h1>
          </div>
        </div>
      )}

      {/* Section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-end', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `color-mix(in oklch, ${accent} 16%, white)`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name={sectionIcon} size={18} />
          </div>
          <div>
            <h2 className="font-display" style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>{sectionTitle}</h2>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>
              <span className="num">{filtered.length}</span> รายการ · จากทั้งหมด <span className="num">{scopedRecords.length}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {refresh && filtered.length > 0 && (
            <button className="btn danger" onClick={() => setDeleteAllOpen(true)}>
              <Icon name="trash" size={14} /> {isMobile ? `ลบ (${filtered.length})` : `ลบทั้งหมด (${filtered.length})`}
            </button>
          )}
          <button className="btn ghost" onClick={onExport} disabled={filtered.length === 0}>
            <Icon name="arrow-down" size={14} /> {isMobile ? 'CSV' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      {tabs && (
        <div className="card" style={{ padding: '6px', marginBottom: 14, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {tabs.map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{
              padding: '9px 16px', borderRadius: 99, border: 'none', cursor: 'pointer',
              background: tab === t.k ? t.c : 'transparent',
              color: tab === t.k ? '#fffdf7' : 'var(--ink-2)',
              fontFamily: 'inherit', fontSize: 13, fontWeight: tab === t.k ? 600 : 500,
              display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all 140ms',
            }}>
              {t.l}
              <span className="num" style={{ padding: '1px 8px', borderRadius: 99, fontSize: 11, background: tab === t.k ? 'rgba(255,253,247,.2)' : 'var(--bg-2)', color: tab === t.k ? '#fffdf7' : 'var(--ink-3)' }}>{t.n}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filter bar — responsive */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          <SearchBox value={q} onChange={setQ} placeholder="ค้นหา ID, เมนู, ล็อตวัตถุดิบ..." />
          {showBranchFilter && (
            <select className="inp" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
              <option value="all">ทุกสาขา</option>
              {branchList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
            <input type="date" className="inp" value={from} onChange={e => setFrom(e.target.value)} style={{ fontSize: 13, padding: '8px 8px' }} />
            <input type="date" className="inp" value={to} onChange={e => setTo(e.target.value)} style={{ fontSize: 13, padding: '8px 8px' }} />
            <DateQuickPresets setFrom={setFrom} setTo={setTo} compact />
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: showBranchFilter ? '1fr 200px 160px 160px auto' : '1fr 160px 160px auto', gap: 10, marginBottom: 14 }}>
          <SearchBox value={q} onChange={setQ} placeholder="ค้นหาล็อตวัตถุดิบ, ID, เมนู, ผู้ผลิต..." />
          {showBranchFilter && (
            <select className="inp" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
              <option value="all">ทุกสาขา</option>
              {branchList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <input type="date" className="inp" value={from} onChange={e => setFrom(e.target.value)} />
          <input type="date" className="inp" value={to} onChange={e => setTo(e.target.value)} />
          <DateQuickPresets setFrom={setFrom} setTo={setTo} />
        </div>
      )}

      {/* Records — card on mobile, table on desktop */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <Empty icon="search" title="ไม่พบข้อมูล" subtitle="ลองปรับตัวกรองหรือช่วงวันที่" />
        ) : isMobile ? (
          /* ── Mobile card layout ── */
          <div>
            {filtered.slice(0, 200).map((r, idx) => {
              const m = store.menus.find(x => x.id === r.menuId);
              const b = store.branches.find(x => x.id === r.branchId);
              const isProd = r.type === 'production';
              const lotEntries = r.materialLots ? Object.entries(r.materialLots).filter(([, v]) => v && String(v).trim()) : [];
              const matBd = r.materialBreakdown && r.materialBreakdown.length;
              const ql = q.trim().toLowerCase();
              const matchedLots = ql ? lotEntries.filter(([, lot]) => String(lot).toLowerCase().includes(ql)) : [];
              const expanded = expandedId === r.id;
              const hasDetail = lotEntries.length > 0 || (mode === 'defect' && matBd > 0) || r.note;

              return (
                <div key={r.id} style={{ borderBottom: idx < Math.min(filtered.length, 200) - 1 ? '1px solid var(--line)' : 'none', background: expanded ? 'var(--bg)' : undefined }}>
                  <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    {/* Expand toggle */}
                    <div style={{ paddingTop: 2, flexShrink: 0, width: 24 }}>
                      {hasDetail && (
                        <button
                          onClick={() => setExpandedId(expanded ? null : r.id)}
                          style={{ width: 24, height: 24, borderRadius: 6, background: expanded ? 'var(--ink)' : 'var(--bg-2)', color: expanded ? '#fffdf7' : 'var(--ink-2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 120ms' }}
                        >
                          <Icon name="chevron" size={11} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
                        </button>
                      )}
                    </div>

                    {/* Main content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Row 1: ID + badge + delete */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3, gap: 6 }}>
                        <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.id}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          {mode === 'production' && isProd && (
                            r.status === 'passed'
                              ? <span className="badge ok"><span className="dot" />ผ่าน</span>
                              : <span className="badge bad"><span className="dot" />ไม่ผ่าน</span>
                          )}
                          {refresh && (
                            <button className="btn ghost sm" onClick={() => setDeleteTarget(r)} title="ลบ">
                              <Icon name="trash" size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Menu name */}
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 5, lineHeight: 1.3 }}>
                        {m?.name || '—'}
                      </div>

                      {/* Date + time + branch */}
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', flexWrap: 'wrap', columnGap: 10, rowGap: 2, marginBottom: 4 }}>
                        <span>{fmtDateTH(r.date)}{r.time ? ` · ${r.time}` : ''}{r.backdated ? ' *' : ''}</span>
                        {showBranch && b?.name && <span style={{ color: 'var(--ink-2)' }}>{b.name}</span>}
                      </div>

                      {/* Qty */}
                      <div className="num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 3 }}>
                        {r.qty?.toLocaleString()} <span style={{ fontWeight: 400, color: 'var(--ink-3)', fontSize: 12 }}>{r.unit}</span>
                      </div>

                      {/* Reason / note */}
                      {(r.reason || r.note) && (
                        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.4 }}>
                          {r.reason || r.note}
                        </div>
                      )}

                      {/* Defect material summary */}
                      {mode === 'defect' && matBd > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--bad)', marginTop: 4 }}>
                          {r.materialBreakdown.slice(0, 2).map(x => `${x.name} ${x.qty.toFixed(1)}${x.unit}`).join(', ')}
                          {r.materialBreakdown.length > 2 && ` +${r.materialBreakdown.length - 2} อื่น`}
                        </div>
                      )}

                      {/* Matched lot highlights */}
                      {matchedLots.length > 0 && (
                        <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {matchedLots.map(([code, lot]) => {
                            const ing = store.ingredients.find(i => i.code === code);
                            return (
                              <span key={code} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, fontSize: 11, background: 'color-mix(in oklch, var(--amber) 18%, white)', color: '#8a5a17', fontWeight: 500 }}>
                                <span className="font-mono">{lot}</span>
                                <span style={{ opacity: .7 }}>· {ing?.name || code}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expanded && (
                    <div className="fade-in" style={{ padding: '4px 14px 16px 46px', background: 'var(--bg)', borderTop: '1px solid var(--line)' }}>
                      <DetailPanel record={r} store={store} mode={mode} lotEntries={lotEntries} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Desktop table layout ── */
          <div style={{ overflowX: 'auto' }}>
            <table className="t">
              <thead>
                <tr>
                  <th style={{ width: 28 }}></th>
                  <th>ID</th>
                  <th>วันที่ / เวลา</th>
                  {showBranch && <th>สาขา</th>}
                  <th>เมนู</th>
                  <th>ปริมาณ</th>
                  {mode === 'production' && <th>ผล</th>}
                  <th>{mode === 'defect' ? 'สาเหตุ / วัตถุดิบ' : 'หมายเหตุ'}</th>
                  {refresh && <th style={{ width: 60 }}></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map(r => {
                  const m = store.menus.find(x => x.id === r.menuId);
                  const b = store.branches.find(x => x.id === r.branchId);
                  const isProd = r.type === 'production';
                  const extras = [];
                  if (r.freezeTemp != null) extras.push(`🧊 ${r.freezeTemp}°C`);
                  if (r.backdated) extras.push('ย้อนหลัง');
                  if (r.producer)  extras.push(`ผลิต: ${r.producer}`);
                  if (r.tester)    extras.push(`ทดสอบ: ${r.tester}`);
                  const lotEntries = r.materialLots ? Object.entries(r.materialLots).filter(([, v]) => v && String(v).trim()) : [];
                  if (lotEntries.length) extras.push(`${lotEntries.length} ล็อตวัตถุดิบ`);
                  const matBd = r.materialBreakdown && r.materialBreakdown.length;
                  const ql = q.trim().toLowerCase();
                  const matchedLots = ql ? lotEntries.filter(([, lot]) => String(lot).toLowerCase().includes(ql)) : [];
                  const expanded = expandedId === r.id;
                  const hasDetail = lotEntries.length > 0 || (mode === 'defect' && matBd > 0) || r.note;
                  const colCount = 4 + (showBranch ? 1 : 0) + (mode === 'production' ? 1 : 0) + 1 + (refresh ? 1 : 0);

                  return (
                    <Fragment key={r.id}>
                      <tr style={{ background: expanded ? 'var(--bg)' : undefined }}>
                        <td style={{ padding: '4px' }}>
                          {hasDetail && (
                            <button onClick={() => setExpandedId(expanded ? null : r.id)} style={{ width: 24, height: 24, borderRadius: 6, background: expanded ? 'var(--ink)' : 'var(--bg-2)', color: expanded ? '#fffdf7' : 'var(--ink-2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', transition: 'all 120ms' }}>
                              <Icon name="chevron" size={12} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
                            </button>
                          )}
                        </td>
                        <td className="font-mono" style={{ color: 'var(--ink)', fontSize: 12 }}>{r.id}</td>
                        <td>
                          <div style={{ fontSize: 13 }}>{fmtDateTH(r.date)}</div>
                          <div className="num" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{r.time}{r.backdated && ' *'}</div>
                        </td>
                        {showBranch && <td>{b?.name}</td>}
                        <td>{m?.name}</td>
                        <td className="num">{r.qty.toLocaleString()} {r.unit}</td>
                        {mode === 'production' && (
                          <td>
                            {isProd && (r.status === 'passed'
                              ? <span className="badge ok"><span className="dot" />ผ่าน</span>
                              : <span className="badge bad"><span className="dot" />ไม่ผ่าน</span>)}
                          </td>
                        )}
                        <td style={{ color: 'var(--ink-3)', fontSize: 13, maxWidth: 340 }}>
                          <div>{r.reason || r.note || '—'}</div>
                          {matchedLots.length > 0 && (
                            <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {matchedLots.map(([code, lot]) => {
                                const ing = store.ingredients.find(i => i.code === code);
                                return (
                                  <span key={code} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, fontSize: 11, background: 'color-mix(in oklch, var(--amber) 18%, white)', color: '#8a5a17', fontWeight: 500 }}>
                                    <span className="font-mono">{lot}</span>
                                    <span style={{ opacity: .7 }}>· {ing?.name || code}</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {extras.length > 0 && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3, opacity: .85 }}>{extras.join(' · ')}</div>}
                          {mode === 'defect' && matBd > 0 && (
                            <div style={{ fontSize: 11, color: 'var(--bad)', marginTop: 3 }}>
                              {r.materialBreakdown.slice(0, 3).map(x => `${x.name} ${x.qty.toFixed(1)}${x.unit}`).join(', ')}
                              {r.materialBreakdown.length > 3 && ` +${r.materialBreakdown.length - 3} อื่น`}
                            </div>
                          )}
                        </td>
                        {refresh && (
                          <td style={{ textAlign: 'right' }}>
                            <button className="btn ghost sm" onClick={() => setDeleteTarget(r)} title="ลบ">
                              <Icon name="trash" size={12} />
                            </button>
                          </td>
                        )}
                      </tr>
                      {expanded && (
                        <tr className="fade-in">
                          <td></td>
                          <td colSpan={colCount - 1} style={{ padding: '4px 14px 18px', background: 'var(--bg)' }}>
                            <DetailPanel record={r} store={store} mode={mode} lotEntries={lotEntries} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > 200 && (
        <div style={{ textAlign: 'center', marginTop: 10, color: 'var(--ink-3)', fontSize: 12 }}>
          แสดง 200 รายการแรก จากทั้งหมด {filtered.length}
        </div>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="ยืนยันการลบ" width={460}
        footer={<>
          <button className="btn ghost" onClick={() => setDeleteTarget(null)}>ยกเลิก</button>
          <button className="btn danger" onClick={() => onDelete(deleteTarget)} disabled={deleting}>
            <Icon name="trash" size={14} /> {deleting ? 'กำลังลบ...' : 'ลบ'}
          </button>
        </>}>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--ink-2)' }}>
          ลบประวัตินี้ <span className="font-mono" style={{ color: 'var(--ink)', fontWeight: 500 }}>{deleteTarget?.id}</span> ออกจากระบบ? การกระทำนี้ไม่สามารถย้อนกลับได้
        </p>
      </Modal>

      <Modal open={deleteAllOpen} onClose={() => setDeleteAllOpen(false)} title="ยืนยันลบทั้งหมด" width={500}
        footer={<>
          <button className="btn ghost" onClick={() => setDeleteAllOpen(false)}>ยกเลิก</button>
          <button className="btn danger" onClick={onDeleteAll} disabled={deleting}>
            <Icon name="trash" size={14} /> {deleting ? 'กำลังลบ...' : `ลบ ${filtered.length} รายการ`}
          </button>
        </>}>
        <div style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--ink-2)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: '12px 16px', background: 'rgba(176,70,52,.08)', border: '1px solid rgba(176,70,52,.25)', borderRadius: 10, fontSize: 13, color: 'var(--bad)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="alert" size={16} style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>คำเตือน: ไม่สามารถย้อนกลับได้</div>
              <div>จะลบ <strong>{filtered.length} รายการ</strong> ที่กรองแสดงอยู่ออกจากระบบถาวร</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
            ช่วงวันที่: <strong style={{ color: 'var(--ink-2)' }}>{from || '—'} ถึง {to || '—'}</strong>
            {branchFilter !== 'all' && <> · สาขา: <strong style={{ color: 'var(--ink-2)' }}>{branchList.find(b => b.id === branchFilter)?.name}</strong></>}
          </div>
        </div>
      </Modal>
    </>
  );
}

export function SplitHistoryPage({ records, store, title, eyebrow, showBranch, showBranchFilter, refresh, branches }) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, gap: 20 }} className="fade-up">
        <div>
          {eyebrow && <div style={{ fontSize: 12, color: 'var(--ink-3)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 500 }}>{eyebrow}</div>}
          <h1 className="font-display" style={{ margin: 0, fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{title}</h1>
          <div style={{ marginTop: 8, fontSize: 15, color: 'var(--ink-3)' }}>ประวัติการผลิต · ลบและ Export ได้</div>
        </div>
      </div>
      <HistoryView mode="production" records={records} store={store}
        sectionTitle="ประวัติการผลิต" sectionIcon="factory"
        showBranch={showBranch} showBranchFilter={showBranchFilter} refresh={refresh} branches={branches} />
    </>
  );
}

export function DefectByMaterial({ records, store, showBranchFilter, branches }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [from, setFrom] = useState(() => todayISO());
  const [to, setTo] = useState(() => todayISO());
  const [branchFilter, setBranchFilter] = useState('all');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  const branchList = branches || store.branches;

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const filteredRecs = useMemo(() => records.filter(r => {
    if (from && r.date < from) return false;
    if (to && r.date > to) return false;
    if (showBranchFilter && branchFilter !== 'all' && r.branchId !== branchFilter) return false;
    return true;
  }), [records, from, to, branchFilter, showBranchFilter]);

  const breakdown = useMemo(() => {
    const map = {};
    filteredRecs.forEach(r => {
      const menu = store.menus.find(m => m.id === r.menuId);
      if (!menu) return;
      const bom = store.bomDefect?.[menu.id] || [];
      const grams = r.qty || 0;
      bom.forEach(b => {
        const used = grams * b.qty;
        if (!map[b.code]) {
          const ing = store.ingredients.find(i => i.code === b.code);
          map[b.code] = { code: b.code, name: ing?.name || b.code, unit: ing?.unit || '', qty: 0, occurrences: 0, totalGrams: 0 };
        }
        map[b.code].qty += used;
        map[b.code].occurrences += 1;
        map[b.code].totalGrams += grams;
      });
    });
    let rows = Object.values(map);
    if (q) { const ql = q.toLowerCase(); rows = rows.filter(x => (x.code + ' ' + x.name).toLowerCase().includes(ql)); }
    return rows.sort((a, b) => b.qty - a.qty);
  }, [filteredRecs, store, q]);

  const totalGrams = filteredRecs.reduce((s, r) => s + (r.qty || 0), 0);

  const onExport = () => {
    const head = ['รหัสสินค้า', 'ชื่อวัตถุดิบ', 'ปริมาณรวม', 'หน่วย', 'จำนวนครั้งที่เกี่ยวข้อง', 'รวมกรัมเบส'];
    const rows = [head, ...breakdown.map(b => [b.code, b.name, b.qty.toFixed(2), b.unit, b.occurrences, b.totalGrams.toFixed(0)])];
    const csv = '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `defect-by-material-${todayISO()}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Export เรียบร้อย', 'ok');
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-end', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'color-mix(in oklch, var(--bad) 16%, white)', color: 'var(--bad)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="box" size={18} />
          </div>
          <div>
            <h2 className="font-display" style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>เสียหายรายวัตถุดิบ</h2>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>
              <span className="num">{breakdown.length}</span> วัตถุดิบ · <span className="num">{filteredRecs.length}</span> ครั้ง · <span className="num">{fmtNum(totalGrams)}</span> กรัม
            </div>
          </div>
        </div>
        <button className="btn ghost" onClick={onExport} disabled={breakdown.length === 0}>
          <Icon name="arrow-down" size={14} /> {isMobile ? 'CSV' : 'Export CSV'}
        </button>
      </div>

      {/* Filter bar — responsive */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          <SearchBox value={q} onChange={setQ} placeholder="ค้นหารหัส หรือชื่อวัตถุดิบ..." />
          {showBranchFilter && (
            <select className="inp" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
              <option value="all">ทุกสาขา</option>
              {branchList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
            <input type="date" className="inp" value={from} onChange={e => setFrom(e.target.value)} style={{ fontSize: 13, padding: '8px 8px' }} />
            <input type="date" className="inp" value={to} onChange={e => setTo(e.target.value)} style={{ fontSize: 13, padding: '8px 8px' }} />
            <DateQuickPresets setFrom={setFrom} setTo={setTo} compact />
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: showBranchFilter ? '1fr 200px 160px 160px auto' : '1fr 160px 160px auto', gap: 10, marginBottom: 14 }}>
          <SearchBox value={q} onChange={setQ} placeholder="ค้นหารหัส หรือชื่อวัตถุดิบ..." />
          {showBranchFilter && (
            <select className="inp" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
              <option value="all">ทุกสาขา</option>
              {branchList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <input type="date" className="inp" value={from} onChange={e => setFrom(e.target.value)} />
          <input type="date" className="inp" value={to} onChange={e => setTo(e.target.value)} />
          <DateQuickPresets setFrom={setFrom} setTo={setTo} />
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        {breakdown.length === 0 ? (
          <Empty icon="check" title="ยังไม่มีของเสียในช่วงนี้" subtitle="ลองปรับช่วงวันที่หรือเช็คตัวกรอง" />
        ) : isMobile ? (
          /* ── Mobile card layout ── */
          <div>
            {breakdown.map((b, idx) => {
              const max = breakdown[0]?.qty || 1;
              return (
                <div key={b.code} style={{ padding: '12px 14px', borderBottom: idx < breakdown.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <span className="font-mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{b.code}</span>
                    <span className="num" style={{ color: 'var(--bad)', fontWeight: 700, fontSize: 15, fontFamily: 'Space Grotesk', flexShrink: 0, marginLeft: 8 }}>
                      {b.qty.toFixed(3)} <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 400 }}>{b.unit}</span>
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 8 }}>{b.name}</div>
                  <div className="bar" style={{ marginBottom: 6 }}>
                    <i style={{ width: `${(b.qty / max) * 100}%`, background: 'var(--bad)' }} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', gap: 14 }}>
                    <span>{b.occurrences} ครั้ง</span>
                    <span>เบสรวม {fmtNum(b.totalGrams.toFixed(0))} กรัม</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Desktop table layout ── */
          <table className="t">
            <thead>
              <tr>
                <th>รหัสสินค้า</th><th>ชื่อวัตถุดิบ</th>
                <th style={{ textAlign: 'right' }}>จำนวนที่เสียหาย</th>
                <th style={{ textAlign: 'right' }}>จำนวนครั้ง</th>
                <th style={{ textAlign: 'right' }}>รวมเบส (กรัม)</th>
                <th style={{ width: 120 }}>สัดส่วน</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map(b => {
                const max = breakdown[0]?.qty || 1;
                return (
                  <tr key={b.code}>
                    <td className="font-mono" style={{ fontSize: 13, color: 'var(--ink)' }}>{b.code}</td>
                    <td style={{ fontWeight: 500 }}>{b.name}</td>
                    <td className="num" style={{ textAlign: 'right', color: 'var(--bad)', fontWeight: 600, fontSize: 15, fontFamily: 'Space Grotesk' }}>
                      {b.qty.toFixed(3)} <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 400 }}>{b.unit}</span>
                    </td>
                    <td className="num" style={{ textAlign: 'right', color: 'var(--ink-2)' }}>{b.occurrences}</td>
                    <td className="num" style={{ textAlign: 'right', color: 'var(--ink-3)' }}>{fmtNum(b.totalGrams.toFixed(0))}</td>
                    <td><div className="bar"><i style={{ width: `${(b.qty / max) * 100}%`, background: 'var(--bad)' }} /></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

export function DefectHistoryPage({ records, store, title, eyebrow, showBranch = true, showBranchFilter = false, refresh, branches }) {
  const [view, setView] = useState('menu');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  const defectRecords = useMemo(() => records.filter(r => r.type === 'defect'), [records]);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const viewOptions = [
    { k: 'menu',     l: isMobile ? 'เบสรายเมนู'   : 'ประวัติเสียหายปริมาณเบส', ic: 'alert' },
    { k: 'material', l: isMobile ? 'รายวัตถุดิบ'   : 'เสียหายรายวัตถุดิบ',      ic: 'box' },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, gap: 20 }} className="fade-up">
        <div>
          {eyebrow && <div style={{ fontSize: 12, color: 'var(--ink-3)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 500 }}>{eyebrow}</div>}
          <h1 className="font-display" style={{ margin: 0, fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{title}</h1>
          {!isMobile && <div style={{ marginTop: 8, fontSize: 15, color: 'var(--ink-3)' }}>แยกดู 2 มุมมอง — ปริมาณเบสรายเมนู (กรัม) และวัตถุดิบที่เสียหายจริงตาม BOM</div>}
        </div>
      </div>

      <div style={{ display: isMobile ? 'flex' : 'inline-flex', padding: 4, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 99, marginBottom: 20, gap: 0 }}>
        {viewOptions.map(t => (
          <button key={t.k} onClick={() => setView(t.k)} style={{
            padding: isMobile ? '10px 0' : '10px 18px',
            flex: isMobile ? 1 : undefined,
            justifyContent: isMobile ? 'center' : undefined,
            borderRadius: 99, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            background: view === t.k ? 'var(--paper)' : 'transparent',
            color: view === t.k ? 'var(--ink)' : 'var(--ink-3)',
            boxShadow: view === t.k ? 'var(--shadow-sm)' : 'none',
            fontSize: isMobile ? 13 : 14, fontWeight: view === t.k ? 600 : 500,
            display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 140ms',
          }}>
            <Icon name={t.ic} size={14} />{t.l}
          </button>
        ))}
      </div>

      {view === 'menu' && (
        <HistoryView mode="defect" records={records} store={store}
          sectionTitle="ประวัติเสียหายปริมาณเบส (กรัม)" sectionIcon="alert"
          showBranch={showBranch} showBranchFilter={showBranchFilter} refresh={refresh} branches={branches} />
      )}
      {view === 'material' && (
        <DefectByMaterial records={defectRecords} store={store} showBranchFilter={showBranchFilter} branches={branches} />
      )}
    </>
  );
}
