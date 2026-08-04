import { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader, Icon, Empty, useToast } from '../components/ui.jsx';
import { COUNT_TAGS } from '../lib/constants.js';
import { todayISO, fmtNum, fmtDateTH } from '../lib/helpers.js';
import { fetchLastCounts, fetchCountsForDate, saveStockCounts, fetchStockHistory } from '../lib/db.js';

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
      todayRows.forEach(r => { c[r.ingredient_code] = String(r.counted_qty); if (r.status === 'draft') draft = true; });
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
    setSaving(true);
    try {
      await saveStockCounts(rows, status);
      if (status === 'draft') { toast(`บันทึกแบบร่างแล้ว (${rows.length} รายการ)`, 'ok'); setLastDraft('บันทึกแบบร่างล่าสุดเมื่อครู่'); }
      else toast(`บันทึกผลตรวจนับแล้ว (${rows.length} รายการ${rows.length < allItems.length ? ` · ยังไม่ครบ ${allItems.length - rows.length}` : ''})`, 'ok');
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
                          <input className="inp num" inputMode="decimal" value={raw ?? ''} onChange={e => setVal(it.code, e.target.value)}
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

          <div style={{ position: 'sticky', bottom: 0, background: 'var(--bg)', padding: '12px 0', display: 'flex', gap: 10, borderTop: '1px solid var(--line)', marginTop: 6 }}>
            <button className="btn ghost" style={{ flex: 1, justifyContent: 'center' }} disabled={saving} onClick={() => save('draft')}>บันทึกแบบร่าง</button>
            <button className="btn amber" style={{ flex: 1.4, justifyContent: 'center' }} disabled={saving} onClick={() => save('final')}>
              <Icon name="check" size={14} /> {saving ? 'กำลังบันทึก...' : 'บันทึกผลตรวจนับ'}
            </button>
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

      <div className="card" style={{ padding: '18px 20px', marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <label className="field"><span>ตั้งแต่วันที่</span><input type="date" className="inp" value={from} onChange={e => setFrom(e.target.value)} /></label>
          <label className="field"><span>ถึงวันที่</span><input type="date" className="inp" value={to} onChange={e => setTo(e.target.value)} /></label>
          <label className="field"><span>Tag รอบ</span>
            <select className="inp" value={tag} onChange={e => setTag(e.target.value)}>
              <option value="all">ทุก Tag</option>
              {Object.entries(COUNT_TAGS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select></label>
          <label className="field"><span>จัดเรียง</span>
            <select className="inp" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="date">ล่าสุดก่อน</option>
              <option value="name">ตามรายชื่อ (ก → ฮ)</option>
              <option value="qty">จำนวนที่นับ (มาก → น้อย)</option>
            </select></label>
          <label className="field" style={{ gridColumn: '1/-1' }}><span>ค้นหาวัตถุดิบ</span>
            <input className="inp" value={q} onChange={e => setQ(e.target.value)} placeholder="พิมพ์ชื่อ หรือรหัส เช่น ไข่มุก / RM-00179" /></label>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 14, fontSize: 13, color: 'var(--ink-2)' }}>
          <span>พบ <b className="num">{view.length}</b> รายการ</span>
          <span>รวมส่วนต่างสุทธิ <b className="num" style={{ color: net < 0 ? 'var(--bad)' : net > 0 ? 'var(--ok)' : 'var(--ink-3)' }}>{net > 0 ? '+' : ''}{fmtNum(net)}</b></span>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
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
                      <td><div style={{ fontWeight: 500 }}>{it?.name || r.code}</div><div className="font-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{r.code}</div></td>
                      <td className="num" style={{ textAlign: 'right', color: 'var(--ink-3)' }}>{r.prev == null ? '—' : fmtNum(r.prev)}</td>
                      <td className="num" style={{ textAlign: 'right' }}>{fmtNum(r.counted)} <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{it?.unit || ''}</span></td>
                      <td style={{ textAlign: 'right' }}><Variance v={d} unit={it?.unit || ''} /></td>
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
