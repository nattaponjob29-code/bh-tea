import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { PageHeader, Icon, Empty, useToast, SearchBox } from '../components/ui.jsx';
import { DateQuickPresets } from '../components/History.jsx';
import { COUNT_TAGS } from '../lib/constants.js';
import { todayISO, fmtNum, fmtDateTH } from '../lib/helpers.js';
import {
  fetchLastCounts, fetchCountsForDate, saveStockCounts, fetchStockHistory,
  fetchStockCountsRange, fetchStockReceivingRange, insertStockReceiving, deleteStockReceiving,
} from '../lib/db.js';

/* ---------- รอบตรวจนับ (auto ตามวันที่) ---------- */
const CYCLE_LABEL = { daily: 'ประจำวัน', weekly: 'ประจำสัปดาห์', monthly: 'สิ้นเดือน' };
const CYCLE_TAGS  = { daily: ['daily'], weekly: ['daily', 'weekly'], monthly: ['daily', 'weekly', 'monthly', 'consumable'] };
const CYCLE_COLOR = { daily: 'var(--matcha)', weekly: 'var(--info)', monthly: 'var(--amber)' };
const TAG_COLOR   = { daily: 'var(--matcha)', weekly: 'var(--info)', monthly: 'var(--amber)', consumable: 'var(--tea)' };

function cycleForDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  const next = new Date(d); next.setDate(d.getDate() + 1);
  if (next.getMonth() !== d.getMonth()) return 'monthly'; // วันสุดท้ายของเดือน
  if (d.getDay() === 2) return 'weekly';                   // อังคาร
  return 'daily';
}

function Variance({ v, unit }) {
  if (v === null || v === undefined || isNaN(v)) return <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>— ยังไม่นับ</span>;
  const c = v < 0 ? 'var(--bad)' : v > 0 ? 'var(--ok)' : 'var(--ink-3)';
  return <span className="num" style={{ color: c, fontWeight: 600 }}>{v > 0 ? '+' : ''}{fmtNum(v)} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-3)' }}>{unit}</span></span>;
}

/* ---------- เคลื่อนไหวสินค้า: วันที่ / รอบรถ ---------- */
const THMONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const DOWSHORT = { 0: 'อา', 1: 'จ', 2: 'อ', 3: 'พ', 4: 'พฤ', 5: 'ศ', 6: 'ส' };
const SCHEDS = {
  'mon-thu': { label: 'จันทร์ – พฤหัส', dows: [1, 4] },
  'tue-fri': { label: 'อังคาร – ศุกร์', dows: [2, 5] },
  'wed-sat': { label: 'พุธ – เสาร์', dows: [3, 6] },
};
const MOVE_LEAD = 3; // เผื่อ lead time เบิกของ (วัน) — รอบเบิกต้องห่างจากวันนับ ≥ ค่านี้

const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const dowOf = (iso) => new Date(iso + 'T00:00:00').getDay();
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
const shortTH = (iso) => { const d = new Date(iso + 'T00:00:00'); return d.getDate() + ' ' + THMONTHS[d.getMonth()]; };
// วันพุธล่าสุดที่ ≤ iso (จุดเริ่มสัปดาห์แสดงผล: พุธ→อังคาร)
const wedStartFor = (iso) => addDays(iso, -((dowOf(iso) - 3 + 7) % 7));

// รอบเบิก 2 รอบถัดไป (นับจากวันสิ้นสัปดาห์ = วันอังคารที่นับ Weekly) ตามรอบรถที่เลือก
function schedInfo(key, weekEndISO) {
  const dows = SCHEDS[key].dows;
  const gapOf = (dow) => { const g = (dow - dowOf(weekEndISO) + 7) % 7; return g === 0 ? 7 : g; };
  const cand = dows.map(dow => ({ dow, gap: gapOf(dow) })).filter(c => c.gap >= MOVE_LEAD).sort((a, b) => a.gap - b.gap);
  const c1 = cand[0];
  const r1 = addDays(weekEndISO, c1.gap);
  const otherDow = dows.find(d => d !== c1.dow);
  let r2 = addDays(r1, 1);
  while (dowOf(r2) !== otherDow) r2 = addDays(r2, 1);
  return { r1, r2, daysToR1: c1.gap, coverR1: daysBetween(r1, r2), dows };
}

// เมตริกของวัตถุดิบ 1 ตัวในสัปดาห์ที่แสดง: Usage / Avg / Max / Min / Suggest (2 รอบ)
function computeMoveMetrics(countsByDate, weekDays, recvInWeek, recvFuture, info) {
  const countedDays = weekDays.filter(d => countsByDate[d]);
  if (!countedDays.length) return null;
  const first = countsByDate[countedDays[0]];
  const last = countsByDate[countedDays[countedDays.length - 1]];
  const open = first.prev != null ? first.prev : first.counted;
  const close = last.counted;
  const usage = open + recvInWeek - close;           // ใช้ไปสุทธิ (บวกของรับเข้ากลับ)
  const avg = usage / 7;
  const max = Math.ceil(avg * 7 * 1.15);              // Max = avg×7×1.15
  const min = Math.ceil(avg * 4);                     // Min = avg×4
  const inW1List = recvFuture.filter(r => r.date <= info.r1);
  const inW1 = inW1List.reduce((s, r) => s + r.qty, 0);
  const projR1 = close - avg * info.daysToR1 + inW1;
  const s1 = Math.min(max, Math.max(0, Math.ceil(max - projR1)));
  const stockout1 = projR1 < 0;
  const inW2 = recvFuture.filter(r => r.date > info.r1 && r.date <= info.r2).reduce((s, r) => s + r.qty, 0);
  const projR2 = max - avg * info.coverR1 + inW2;
  const s2 = Math.min(max, Math.max(0, Math.ceil(max - projR2)));
  return { usage, avg, max, min, s1, s2, stockout1, inW1List };
}

function tabBtnStyle(on) {
  return {
    padding: '10px 18px', borderRadius: 99, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    background: on ? 'var(--paper)' : 'transparent', color: on ? 'var(--ink)' : 'var(--ink-3)',
    boxShadow: on ? 'var(--shadow-sm)' : 'none', fontSize: 14, fontWeight: on ? 600 : 500,
    display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all 140ms', whiteSpace: 'nowrap',
  };
}

// ช่องค้นหาวัตถุดิบแบบพิมพ์+เลือก (ไม่ใช่ dropdown)
function AutoField({ label, placeholder, value, onChange, matches, onPick }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <label className="field" ref={ref} style={{ position: 'relative' }}>
      <span>{label}</span>
      <input className="inp" autoComplete="off" placeholder={placeholder} value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
      {open && matches.length > 0 && (
        <div className="card fade-up" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 40, padding: 4, maxHeight: 220, overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
          {matches.slice(0, 8).map(m => (
            <button key={m.code} type="button" onMouseDown={e => { e.preventDefault(); onPick(m); setOpen(false); }} style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 8,
              border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <b className="font-mono" style={{ fontSize: 11.5 }}>{m.code}</b> · {m.name} <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>· {m.unit}</span>
            </button>
          ))}
        </div>
      )}
    </label>
  );
}

/* ========== หน้าตรวจนับ ========== */
export function StockCountPage({ user, store }) {
  const toast = useToast();
  const branchId = user.branchId;
  const [date, setDate] = useState(todayISO());
  const [counter, setCounter] = useState(user.label || user.username || '');
  const [counts, setCounts] = useState({});   // { code: value(string) }
  const [prevs, setPrevs] = useState({});      // { code: qty }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastDraft, setLastDraft] = useState(null);
  const inputsRef = useRef({}); // { code: <input> } สำหรับกด "ถัดไป" ข้ามช่อง

  const cycle = cycleForDate(date);
  const tags = CYCLE_TAGS[cycle];

  // จัดกลุ่มวัตถุดิบที่ต้องนับตาม Tag ที่อยู่ในรอบวันนี้
  const groups = useMemo(() => tags.map(tag => ({
    tag,
    items: (store.ingredients || []).filter(i => i.count_tag === tag),
  })).filter(g => g.items.length), [store.ingredients, cycle]);

  const allItems = useMemo(() => groups.flatMap(g => g.items), [groups]);

  const load = useCallback(async () => {
    if (!branchId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [prevMap, todayRows] = await Promise.all([
        fetchLastCounts(branchId, date),
        fetchCountsForDate(branchId, date),
      ]);
      setPrevs(prevMap);
      const c = {};
      let draft = false;
      // เติมค่ากลับเฉพาะ "แบบร่าง" — ผลที่บันทึกจริงแล้ว (final) ถือว่าปิดรอบ ไม่เอามาแก้ต่อ
      todayRows.forEach(r => { if (r.status === 'draft') { c[r.ingredient_code] = String(r.counted_qty); draft = true; } });
      setCounts(c);
      setLastDraft(draft ? 'มีแบบร่างค้างไว้ของวันนี้' : null);
    } catch (e) { toast(e.message, 'bad'); }
    finally { setLoading(false); }
  }, [branchId, date, toast]);

  useEffect(() => { load(); }, [load]);

  const setVal = (code, v) => setCounts(c => ({ ...c, [code]: v }));
  const step = (code, d) => setCounts(c => {
    const cur = c[code] === '' || c[code] === undefined ? (prevs[code] ?? 0) : parseFloat(c[code]) || 0;
    return { ...c, [code]: String(Math.max(0, cur + d)) };
  });

  const doneCount = allItems.filter(i => counts[i.code] !== '' && counts[i.code] !== undefined).length;
  const complete = allItems.length > 0 && doneCount === allItems.length; // นับครบทุกรายการหรือยัง

  // Enter / ปุ่ม "ถัดไป" บนคีย์บอร์ด → ไปช่องถัดไป
  const onKey = (e, code) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const idx = allItems.findIndex(i => i.code === code);
    const next = allItems[idx + 1];
    if (next && inputsRef.current[next.code]) inputsRef.current[next.code].focus();
    else e.target.blur();
  };

  const save = async (status) => {
    const rows = allItems
      .filter(i => counts[i.code] !== '' && counts[i.code] !== undefined && !isNaN(parseFloat(counts[i.code])))
      .map(i => ({
        branchId, date, cycle, code: i.code,
        countedQty: parseFloat(counts[i.code]),
        prevQty: prevs[i.code] ?? null,
        counter, by: user.id,
      }));
    if (!rows.length) return toast('ยังไม่ได้กรอกจำนวนสักรายการ', 'bad');
    if (status === 'final' && rows.length < allItems.length)
      return toast(`นับให้ครบก่อนบันทึกผล — เหลืออีก ${allItems.length - rows.length} รายการ`, 'bad');
    setSaving(true);
    try {
      await saveStockCounts(rows, status);
      if (status === 'draft') { toast(`บันทึกแบบร่างแล้ว (${rows.length} รายการ)`, 'ok'); setLastDraft('บันทึกแบบร่างล่าสุดเมื่อครู่'); }
      else {
        toast(`บันทึกผลตรวจนับแล้ว (${rows.length} รายการ)`, 'ok');
        setCounts({}); setLastDraft(null); // เคลียร์ช่องหลังบันทึกจริง
      }
    } catch (e) { toast(e.message, 'bad'); }
    finally { setSaving(false); }
  };

  return (
    <>
      <PageHeader
        eyebrow="Stock Count"
        title="ตรวจนับสต็อก"
        subtitle="ระบบเลือกรายการที่ต้องนับให้อัตโนมัติตาม Tag รอบของวัตถุดิบ"
        right={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label className="field" style={{ minWidth: 150 }}><span>วันที่นับ</span>
              <input type="date" className="inp" value={date} max={todayISO()} onChange={e => setDate(e.target.value)} /></label>
            <label className="field" style={{ minWidth: 150 }}><span>ผู้ตรวจนับ</span>
              <input className="inp" value={counter} onChange={e => setCounter(e.target.value)} placeholder="ชื่อผู้นับ" /></label>
          </div>
        }
      />

      {/* แถบรอบอัตโนมัติ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '13px 16px', borderRadius: 14, marginBottom: 16,
        background: `color-mix(in oklab, ${CYCLE_COLOR[cycle]} 9%, var(--paper))`, border: `1px solid color-mix(in oklab, ${CYCLE_COLOR[cycle]} 30%, var(--paper))` }} className="fade-up">
        <span className="num" style={{ background: CYCLE_COLOR[cycle], color: '#fff', fontWeight: 700, fontSize: 12, padding: '5px 11px', borderRadius: 999, letterSpacing: '.04em' }}>{cycle.toUpperCase()}</span>
        <div style={{ flex: 1, minWidth: 200, fontSize: 14 }}>
          <b>{fmtDateTH(date)}</b> · รอบ{CYCLE_LABEL[cycle]} — นับ {tags.map(t => COUNT_TAGS[t]).join(' + ')}
        </div>
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>🔒 ระบบเลือกรอบให้อัตโนมัติ</span>
      </div>

      {lastDraft && (
        <div style={{ padding: '9px 14px', borderRadius: 10, marginBottom: 14, fontSize: 13, color: 'var(--ink-2)',
          background: 'color-mix(in oklab, var(--amber) 9%, var(--paper))', border: '1px solid color-mix(in oklab, var(--amber) 26%, var(--paper))' }}>
          📝 {lastDraft} — นับต่อได้เลย
        </div>
      )}

      {/* progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 8, borderRadius: 99, background: 'var(--bg-2)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${allItems.length ? doneCount / allItems.length * 100 : 0}%`, background: 'var(--matcha)', borderRadius: 99, transition: 'width .2s' }} />
        </div>
        <span className="num" style={{ fontSize: 13, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{doneCount}/{allItems.length} นับแล้ว</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>กำลังโหลด...</div>
      ) : allItems.length === 0 ? (
        <Empty icon="box" title="ไม่มีวัตถุดิบในรอบนี้" subtitle="กำหนด Tag รอบตรวจนับให้วัตถุดิบก่อน (Admin → วัตถุดิบ)" />
      ) : (
        <>
          {groups.map(g => (
            <div key={g.tag} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span className="num" style={{ background: TAG_COLOR[g.tag], color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999 }}>{COUNT_TAGS[g.tag]}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{g.items.length} รายการ</span>
                <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {g.items.map(it => {
                  const raw = counts[it.code];
                  const has = raw !== '' && raw !== undefined && !isNaN(parseFloat(raw));
                  const v = has ? parseFloat(raw) - (prevs[it.code] ?? 0) : null;
                  return (
                    <div key={it.code} className="card" style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 15 }}>{it.name}</div>
                          <div className="font-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{it.code} · ครั้งก่อน {fmtNum(prevs[it.code] ?? 0)} {it.unit}</div>
                        </div>
                        <Variance v={v} unit={it.unit} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 11 }}>
                        <button className="btn ghost" onClick={() => step(it.code, -1)} style={{ width: 46, height: 46, padding: 0, justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>−</button>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <input className="inp num" inputMode="decimal" enterKeyHint="next"
                            ref={el => { if (el) inputsRef.current[it.code] = el; }}
                            value={raw ?? ''} onChange={e => setVal(it.code, e.target.value)} onKeyDown={e => onKey(e, it.code)}
                            placeholder="นับจริง" style={{ textAlign: 'center', fontSize: 20, fontWeight: 600, padding: '12px 40px 12px 12px', height: 46 }} />
                          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--ink-3)' }}>{it.unit}</span>
                        </div>
                        <button className="btn ghost" onClick={() => step(it.code, 1)} style={{ width: 46, height: 46, padding: 0, justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div style={{ position: 'sticky', bottom: 0, background: 'var(--bg)', padding: '12px 0', borderTop: '1px solid var(--line)', marginTop: 6 }}>
            {!complete && (
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', textAlign: 'center', marginBottom: 9 }}>
                ยังนับไม่ครบ — เหลืออีก <b style={{ color: 'var(--bad)' }}>{allItems.length - doneCount}</b> รายการ · บันทึกผลได้เมื่อนับครบ (ตอนนี้บันทึกแบบร่างได้)
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn ghost" style={{ flex: 1, justifyContent: 'center' }} disabled={saving || doneCount === 0} onClick={() => save('draft')}>บันทึกแบบร่าง</button>
              <button className="btn amber" style={{ flex: 1.4, justifyContent: 'center' }} disabled={saving || !complete} onClick={() => save('final')}>
                <Icon name="check" size={14} /> {saving ? 'กำลังบันทึก...' : 'บันทึกผลตรวจนับ'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ========== หน้ารายงาน ========== */
export function StockReportPage({ scopeBranchIds, store, showBranch = false }) {
  const toast = useToast();
  const initTo = todayISO();
  const initFrom = (() => { const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10); })();
  const [from, setFrom] = useState(initFrom);
  const [to, setTo] = useState(initTo);
  const [tag, setTag] = useState('all');
  const [sort, setSort] = useState('date');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const branchKey = scopeBranchIds && scopeBranchIds.length ? scopeBranchIds.join(',') : '';
  const ing = useMemo(() => {
    const m = {}; (store.ingredients || []).forEach(i => { m[i.code] = i; }); return m;
  }, [store.ingredients]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchStockHistory({ from, to, branchIds: scopeBranchIds })
      .then(r => { if (alive) { setRows(r); setLoading(false); } })
      .catch(e => { if (alive) { setLoading(false); } toast(e.message, 'bad'); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, branchKey]);

  const view = useMemo(() => {
    let list = rows.filter(r => {
      const it = ing[r.code];
      if (tag !== 'all' && (it?.count_tag || '') !== tag) return false;
      if (q) {
        const s = (r.code + ' ' + (it?.name || '')).toLowerCase();
        if (!s.includes(q.toLowerCase())) return false;
      }
      return true;
    });
    if (sort === 'name') list = [...list].sort((a, b) => (ing[a.code]?.name || a.code).localeCompare(ing[b.code]?.name || b.code, 'th'));
    else if (sort === 'qty') list = [...list].sort((a, b) => b.counted - a.counted);
    else list = [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return list;
  }, [rows, tag, sort, q, ing]);

  const net = view.reduce((s, r) => s + (r.prev == null ? 0 : r.counted - r.prev), 0);
  const branchName = (id) => store.branches.find(b => b.id === id)?.name || id;

  return (
    <>
      <PageHeader eyebrow="Report" title="รายงานการตรวจนับ" subtitle="ย้อนดูประวัติ · ค้นหาวัตถุดิบ · กรอง Tag / วันที่ / จัดเรียง" />

      <div className="card stock-filters" style={{ padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SearchBox value={q} onChange={setQ} placeholder="ค้นหาชื่อ หรือรหัสวัตถุดิบ..." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
            <input type="date" className="inp" value={from} onChange={e => setFrom(e.target.value)} style={{ fontSize: 13, padding: '8px 8px' }} />
            <input type="date" className="inp" value={to} onChange={e => setTo(e.target.value)} style={{ fontSize: 13, padding: '8px 8px' }} />
            <DateQuickPresets setFrom={setFrom} setTo={setTo} compact />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <select className="inp" value={tag} onChange={e => setTag(e.target.value)}>
              <option value="all">ทุก Tag</option>
              {Object.entries(COUNT_TAGS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <select className="inp" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="date">ล่าสุดก่อน</option>
              <option value="name">ตามรายชื่อ (ก → ฮ)</option>
              <option value="qty">จำนวนที่นับ (มาก → น้อย)</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 11, fontSize: 12.5, color: 'var(--ink-2)' }}>
          <span>พบ <b className="num">{view.length}</b> รายการ</span>
          <span>รวมส่วนต่างสุทธิ <b className="num" style={{ color: net < 0 ? 'var(--bad)' : net > 0 ? 'var(--ok)' : 'var(--ink-3)' }}>{net > 0 ? '+' : ''}{fmtNum(net)}</b></span>
        </div>
      </div>

      <div className="card stock-report" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>กำลังโหลด...</div>
        ) : view.length === 0 ? (
          <Empty icon="history" title="ยังไม่มีข้อมูลการตรวจนับ" subtitle="ลองปรับช่วงวันที่ หรือเริ่มบันทึกการตรวจนับ" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="t">
              <thead><tr>
                <th>วันที่</th><th>รอบ</th>{showBranch && <th>สาขา</th>}<th>วัตถุดิบ</th>
                <th style={{ textAlign: 'right' }}>ครั้งก่อน</th><th style={{ textAlign: 'right' }}>นับจริง</th>
                <th style={{ textAlign: 'right' }}>ส่วนต่าง</th><th>ผู้นับ</th>
              </tr></thead>
              <tbody>
                {view.map(r => {
                  const it = ing[r.code];
                  const d = r.prev == null ? null : r.counted - r.prev;
                  return (
                    <tr key={r.id}>
                      <td>{fmtDateTH(r.date)}</td>
                      <td>{r.cycle ? <span className="num" style={{ background: CYCLE_COLOR[r.cycle], color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>{CYCLE_LABEL[r.cycle]}</span> : '—'}</td>
                      {showBranch && <td>{branchName(r.branchId)}</td>}
                      <td>
                        <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span>{it?.name || r.code}</span>
                          {it?.count_tag && <span className="num" style={{ background: TAG_COLOR[it.count_tag], color: '#fff', fontSize: 9.5, fontWeight: 600, padding: '1px 7px', borderRadius: 999 }}>{COUNT_TAGS[it.count_tag]}</span>}
                        </div>
                        <div className="font-mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{r.code}</div>
                      </td>
                      <td className="num" style={{ textAlign: 'right', color: 'var(--ink-3)' }}>{r.prev == null ? '—' : fmtNum(r.prev)}</td>
                      <td className="num" style={{ textAlign: 'right' }}>{fmtNum(r.counted)} <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{it?.unit || ''}</span></td>
                      <td style={{ textAlign: 'right' }}>{d == null ? <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>ครั้งแรก</span> : <Variance v={d} unit={it?.unit || ''} />}</td>
                      <td style={{ color: 'var(--ink-3)' }}>{r.counter || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* ========== เคลื่อนไหวสินค้า ========== */
function MovementTab({ user, store, refreshKey }) {
  const toast = useToast();
  const branchId = user.branchId;
  const [sched, setSched] = useState('mon-thu');
  const [weekStart, setWeekStart] = useState(() => wedStartFor(todayISO()));
  const [countRows, setCountRows] = useState([]);
  const [recvRows, setRecvRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd = weekDays[6];
  const info = useMemo(() => schedInfo(sched, weekEnd), [sched, weekEnd]);

  useEffect(() => {
    if (!branchId) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    Promise.all([
      fetchStockCountsRange({ branchId, from: weekStart, to: weekEnd }),
      fetchStockReceivingRange({ branchId, from: weekStart, to: info.r2 }),
    ]).then(([c, r]) => { if (alive) { setCountRows(c); setRecvRows(r); setLoading(false); } })
      .catch(e => { if (alive) setLoading(false); toast(e.message, 'bad'); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, weekStart, sched, refreshKey]);

  const rows = useMemo(() => {
    const tagged = (store.ingredients || []).filter(i => i.count_tag);
    const byCode = {};
    countRows.forEach(r => { (byCode[r.code] = byCode[r.code] || {})[r.date] = r; });
    const recvByCode = {};
    recvRows.forEach(r => { (recvByCode[r.code] = recvByCode[r.code] || []).push(r); });
    return tagged.map(ing => {
      const cd = byCode[ing.code] || {};
      const recvForCode = recvByCode[ing.code] || [];
      const recvInWeek = recvForCode.filter(r => r.date >= weekStart && r.date <= weekEnd).reduce((s, r) => s + r.qty, 0);
      const recvFuture = recvForCode.filter(r => r.date > weekEnd);
      return { ing, cd, m: computeMoveMetrics(cd, weekDays, recvInWeek, recvFuture, info) };
    });
  }, [store.ingredients, countRows, recvRows, weekDays, weekStart, weekEnd, info]);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <select className="inp" value={sched} onChange={e => setSched(e.target.value)} style={{ width: 'auto', fontWeight: 600 }}>
          <option value="mon-thu">🚚 รอบรถ จันทร์ – พฤหัส</option>
          <option value="tue-fri">🚚 รอบรถ อังคาร – ศุกร์</option>
          <option value="wed-sat">🚚 รอบรถ พุธ – เสาร์</option>
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--paper)', border: '1px solid var(--line-2)', borderRadius: 999, padding: '5px 6px' }}>
          <button className="btn ghost sm" onClick={() => setWeekStart(w => addDays(w, -7))} style={{ padding: '6px 10px' }}>‹</button>
          <span className="num" style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap' }}>{shortTH(weekStart)} – {shortTH(weekEnd)}</span>
          <button className="btn ghost sm" onClick={() => setWeekStart(w => addDays(w, 7))} style={{ padding: '6px 10px' }}>›</button>
        </div>
      </div>

      <div className="card stock-report" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>กำลังโหลด...</div>
        ) : rows.length === 0 ? (
          <Empty icon="box" title="ยังไม่มีวัตถุดิบที่ตั้ง Tag" subtitle="กำหนด Tag รอบตรวจนับให้วัตถุดิบก่อน (Admin → วัตถุดิบ)" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="t">
              <thead>
                <tr>
                  <th>รหัสสินค้า</th><th>ชื่อสินค้า</th><th>หน่วย</th>
                  <th style={{ textAlign: 'right' }}>Max</th><th style={{ textAlign: 'right' }}>Min</th>
                  {weekDays.map(d => {
                    const dow = dowOf(d), isDeliv = info.dows.includes(dow), isWe = dow === 0 || dow === 6;
                    return (
                      <th key={d} style={{ textAlign: 'center', background: isDeliv ? 'color-mix(in oklab, var(--matcha) 15%, var(--paper))' : isWe ? 'color-mix(in oklab, var(--info) 8%, var(--paper))' : undefined }}>
                        <span style={{ display: 'block' }}>{DOWSHORT[dow]}{isDeliv ? ' 🚚' : ''}</span>
                        <span className="num" style={{ display: 'block', fontSize: 10, color: 'var(--ink-3)', fontWeight: 400, textTransform: 'none' }}>{shortTH(d)}</span>
                      </th>
                    );
                  })}
                  <th style={{ textAlign: 'right' }}>Usage</th>
                  <th style={{ textAlign: 'right' }}>Avg./Day</th>
                  <th style={{ textAlign: 'right' }}>In-transit</th>
                  <th style={{ textAlign: 'right' }}>Suggest เบิก</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ ing, cd, m }) => (
                  <tr key={ing.code}>
                    <td className="font-mono" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{ing.code}</td>
                    <td style={{ fontWeight: 500 }}>
                      {ing.name}
                      <span className="num" style={{ background: TAG_COLOR[ing.count_tag], color: '#fff', fontSize: 9.5, fontWeight: 600, padding: '1px 7px', borderRadius: 999, marginLeft: 7 }}>{COUNT_TAGS[ing.count_tag]}</span>
                    </td>
                    <td><span className="badge">{ing.unit}</span></td>
                    <td className="num" style={{ textAlign: 'right' }}>{m ? m.max : <span style={{ color: 'var(--ink-3)' }}>—</span>}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{m ? m.min : <span style={{ color: 'var(--ink-3)' }}>—</span>}</td>
                    {weekDays.map(d => {
                      const row = cd[d], dow = dowOf(d), isDeliv = info.dows.includes(dow);
                      return (
                        <td key={d} className="num" style={{ textAlign: 'center', background: isDeliv ? 'color-mix(in oklab, var(--matcha) 5%, transparent)' : undefined }}>
                          {row ? fmtNum(row.counted) : <span style={{ color: 'var(--ink-3)' }}>—</span>}
                        </td>
                      );
                    })}
                    <td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
                      {m ? <>{fmtNum(m.usage)} <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--ink-3)' }}>{ing.unit}</span></> : <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>—</span>}
                    </td>
                    <td className="num" style={{ textAlign: 'right' }}>{m ? m.avg.toFixed(2) : <span style={{ color: 'var(--ink-3)' }}>—</span>}</td>
                    <td style={{ textAlign: 'right' }}>
                      {m && m.inW1List.length ? m.inW1List.map((r, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', gap: 7, fontSize: 11 }}>
                          <span style={{ color: 'var(--ink-3)' }}>{shortTH(r.date)}</span>
                          <b className="num" style={{ color: 'var(--ok)' }}>+{fmtNum(r.qty)}</b>
                        </div>
                      )) : <span style={{ color: 'var(--ink-3)' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {m ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'baseline' }}>
                            <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>รอบ1{m.stockout1 && <span style={{ color: 'var(--bad)' }} title="ของหมดก่อนรถมา — cap ที่ Max"> ⚠</span>}</span>
                            <b className="num" style={{ color: m.s1 > 0 ? 'var(--amber)' : 'var(--ink-3)' }}>{fmtNum(m.s1)}</b>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'baseline', marginTop: 2 }}>
                            <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>รอบ2</span>
                            <b className="num" style={{ color: m.s2 > 0 ? 'var(--amber)' : 'var(--ink-3)' }}>{fmtNum(m.s2)}</b>
                          </div>
                        </>
                      ) : <span style={{ color: 'var(--ink-3)' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* ========== เติมสินค้ารับเข้า ========== */
function ReceivingTab({ user, store, onChanged }) {
  const toast = useToast();
  const branchId = user.branchId;
  const [date, setDate] = useState(todayISO());
  const [codeQ, setCodeQ] = useState('');
  const [nameQ, setNameQ] = useState('');
  const [selCode, setSelCode] = useState(null);
  const [unit, setUnit] = useState('');
  const [qty, setQty] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const ingByCode = useMemo(() => { const m = {}; (store.ingredients || []).forEach(i => { m[i.code] = i; }); return m; }, [store.ingredients]);

  const load = useCallback(async () => {
    if (!branchId) { setLoading(false); return; }
    setLoading(true);
    try { setRows(await fetchStockReceivingRange({ branchId })); }
    catch (e) { toast(e.message, 'bad'); }
    finally { setLoading(false); }
  }, [branchId, toast]);
  useEffect(() => { load(); }, [load]);

  const codeMatches = codeQ.trim() ? (store.ingredients || []).filter(i => i.code.toLowerCase().includes(codeQ.trim().toLowerCase())) : [];
  const nameMatches = nameQ.trim() ? (store.ingredients || []).filter(i => i.name.toLowerCase().includes(nameQ.trim().toLowerCase())) : [];

  const pick = (i) => { setSelCode(i.code); setCodeQ(i.code); setNameQ(i.name); setUnit(i.unit); };
  const onCodeChange = (v) => {
    setCodeQ(v);
    const exact = (store.ingredients || []).find(i => i.code.toLowerCase() === v.trim().toLowerCase());
    if (exact) { setSelCode(exact.code); setNameQ(exact.name); setUnit(exact.unit); } else { setSelCode(null); setUnit(''); }
  };
  const onNameChange = (v) => {
    setNameQ(v);
    const exact = (store.ingredients || []).find(i => i.name.toLowerCase() === v.trim().toLowerCase());
    if (exact) { setSelCode(exact.code); setCodeQ(exact.code); setUnit(exact.unit); } else { setSelCode(null); setUnit(''); }
  };

  const add = async () => {
    const q = parseFloat(qty);
    if (!date || !selCode || !q || q <= 0) return toast('กรอกวันที่ / เลือกสินค้า (ค้นหารหัสหรือชื่อ) / จำนวนให้ครบ', 'bad');
    setSaving(true);
    try {
      await insertStockReceiving({ branchId, date, code: selCode, qty: q, by: user.id });
      toast('เพิ่มรับเข้าแล้ว', 'ok');
      setCodeQ(''); setNameQ(''); setUnit(''); setQty(''); setSelCode(null);
      await load(); onChanged();
    } catch (e) { toast(e.message, 'bad'); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('ลบรายการรับเข้านี้?')) return;
    try { await deleteStockReceiving(id); await load(); onChanged(); toast('ลบแล้ว', 'ok'); }
    catch (e) { toast(e.message, 'bad'); }
  };

  return (
    <>
      <div className="card" style={{ padding: '18px 20px', marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, alignItems: 'end' }}>
          <label className="field"><span>วันที่รับเข้า</span><input type="date" className="inp" value={date} onChange={e => setDate(e.target.value)} /></label>
          <AutoField label="รหัสสินค้า" placeholder="พิมพ์ค้นหารหัส" value={codeQ} onChange={onCodeChange} matches={codeMatches} onPick={pick} />
          <AutoField label="ชื่อสินค้า" placeholder="พิมพ์ค้นหาชื่อ" value={nameQ} onChange={onNameChange} matches={nameMatches} onPick={pick} />
          <label className="field"><span>จำนวนรับเข้า</span><input type="number" min="0" className="inp" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" /></label>
          <label className="field"><span>หน่วย</span><input className="inp" value={unit} readOnly placeholder="—" style={{ background: 'var(--bg-2)', color: 'var(--ink-2)' }} /></label>
          <button className="btn amber" onClick={add} disabled={saving} style={{ justifyContent: 'center' }}><Icon name="plus" size={14} /> เพิ่มรับเข้า</button>
        </div>
      </div>

      <div className="card stock-report" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px 6px', fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 }}>รายการรับเข้าล่าสุด</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>กำลังโหลด...</div>
        ) : rows.length === 0 ? (
          <Empty icon="box" title="ยังไม่มีรายการรับเข้า" subtitle="เพิ่มรายการแรกด้านบน" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="t">
              <thead><tr><th>วันที่</th><th>สินค้า</th><th style={{ textAlign: 'right' }}>จำนวนรับเข้า</th><th style={{ width: 60 }}></th></tr></thead>
              <tbody>
                {rows.map(r => {
                  const it = ingByCode[r.code];
                  return (
                    <tr key={r.id}>
                      <td>{fmtDateTH(r.date)}</td>
                      <td><div style={{ fontWeight: 500 }}>{it?.name || r.code}</div><div className="font-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{r.code}</div></td>
                      <td className="num" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--ok)' }}>+{fmtNum(r.qty)} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-3)' }}>{it?.unit || ''}</span></td>
                      <td style={{ textAlign: 'right' }}><button className="btn ghost sm" onClick={() => remove(r.id)}><Icon name="x" size={12} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* ========== เคลื่อนไหวสินค้า (แท็บรวม) ========== */
export function StockMovementPage({ user, store }) {
  const [tab, setTab] = useState('move');
  const [recvVersion, setRecvVersion] = useState(0); // เพิ่มค่านี้เพื่อสั่งให้แท็บเคลื่อนไหวโหลดใหม่หลังแก้รายการรับเข้า

  return (
    <>
      <PageHeader eyebrow="Stock Movement" title="เคลื่อนไหวสินค้า" subtitle="ติดตามยอดตรวจนับรายวัน · บันทึกรับสินค้าเข้า · คำนวณยอดที่ใช้ไปจริง" />
      <div style={{ display: 'inline-flex', padding: 4, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 99, marginBottom: 18 }} className="fade-up">
        <button onClick={() => setTab('move')} style={tabBtnStyle(tab === 'move')}>📊 เคลื่อนไหวสินค้า</button>
        <button onClick={() => setTab('recv')} style={tabBtnStyle(tab === 'recv')}>📥 เติมสินค้ารับเข้า</button>
      </div>
      <div style={{ display: tab === 'move' ? 'block' : 'none' }}>
        <MovementTab user={user} store={store} refreshKey={recvVersion} />
      </div>
      <div style={{ display: tab === 'recv' ? 'block' : 'none' }}>
        <ReceivingTab user={user} store={store} onChanged={() => setRecvVersion(v => v + 1)} />
      </div>
    </>
  );
}
