import { useState, useMemo } from 'react';
import { AppShell, PageHeader, StatCard, Icon, Empty, Donut, InteractiveDonut, useIsMobile } from '../components/ui.jsx';
import { SplitHistoryPage, DefectHistoryPage } from '../components/History.jsx';
import { todayISO, fmtDateTH, fmtNum } from '../lib/helpers.js';

/* ---------- Date range picker ---------- */
export function DateRangePicker({ from, to, setFrom, setTo }) {
  const isMobile = useIsMobile();
  const presets = [
    { l: '7 วันล่าสุด',  fn: () => { const d = new Date(); const f = new Date(); f.setDate(d.getDate()-6); setFrom(f.toISOString().slice(0,10)); setTo(d.toISOString().slice(0,10)); } },
    { l: '14 วันล่าสุด', fn: () => { const d = new Date(); const f = new Date(); f.setDate(d.getDate()-13); setFrom(f.toISOString().slice(0,10)); setTo(d.toISOString().slice(0,10)); } },
    { l: 'วันนี้',       fn: () => { const t = todayISO(); setFrom(t); setTo(t); } },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {presets.map(p => (
          <button key={p.l} className="chip" onClick={p.fn}>{p.l}</button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name="calendar" size={14} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
        <input type="date" className="inp" style={{ padding: '7px 8px', flex: 1, minWidth: 0, fontSize: isMobile ? 13 : 13 }} value={from} onChange={e => setFrom(e.target.value)} />
        <span style={{ color: 'var(--ink-3)', flexShrink: 0 }}>—</span>
        <input type="date" className="inp" style={{ padding: '7px 8px', flex: 1, minWidth: 0, fontSize: 13 }} value={to} onChange={e => setTo(e.target.value)} />
      </div>
    </div>
  );
}

/* ---------- Legend chip ---------- */
export function Legend({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)' }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />{label}
    </span>
  );
}

/* ---------- Stacked bar chart ---------- */
export function StackedBars({ series, labels, height = 200 }) {
  const totals = labels.map((_, i) => series.reduce((s, sr) => s + (sr.data[i] || 0), 0));
  const max = Math.max(...totals, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height, padding: '4px 0' }}>
      {labels.map((lab, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column-reverse', width: '100%', maxWidth: 48, alignSelf: 'center' }}>
            {series.map((sr, j) => {
              const v = sr.data[i] || 0;
              const h = (v / max) * 100;
              return v ? (
                <div key={j} title={`${v}`} style={{
                  height: `${h}%`, background: sr.color, minHeight: 2,
                  transition: 'height 600ms cubic-bezier(.2,.7,.2,1)',
                  borderRadius: j === series.length - 1 ? '6px 6px 0 0' : 0,
                }} />
              ) : null;
            })}
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', textAlign: 'center', whiteSpace: 'nowrap' }}>{lab}</div>
        </div>
      ))}
    </div>
  );
}

function ReasonList({ items, color }) {
  const max = items[0]?.[1] || 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map(([reason, n]) => (
        <div key={reason}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
            <span>{reason}</span>
            <span className="num" style={{ color: 'var(--ink-3)' }}>{n} ครั้ง</span>
          </div>
          <div className="bar"><i style={{ width: `${(n / max) * 100}%`, background: color }} /></div>
        </div>
      ))}
    </div>
  );
}

function Stat({ n, l, c }) {
  return (
    <div>
      <div className="num font-display" style={{ fontSize: 24, fontWeight: 600, color: c, lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>{l}</div>
    </div>
  );
}

/* ---------- Defect by material dashboard (shared with Admin) ---------- */
const DEFECT_COLORS = [
  'var(--bad)', 'var(--warn)', 'var(--info)', 'var(--amber)', 'var(--matcha)',
  '#9b8afb', '#f472b6', '#34d399', '#60a5fa', '#fb923c',
];

export function DefectMaterialDashboard({ records, store }) {
  const isMobile = useIsMobile();
  const breakdown = useMemo(() => {
    const map = {};
    let totalGrams = 0;
    records.forEach(r => {
      const menu = store.menus.find(m => m.id === r.menuId);
      if (!menu) return;
      const bom = store.bomDefect?.[menu.id] || [];
      const grams = r.qty || 0;
      totalGrams += grams;
      bom.forEach(b => {
        const used = grams * b.qty;
        if (!map[b.code]) {
          const ing = store.ingredients.find(i => i.code === b.code);
          map[b.code] = { code: b.code, name: ing?.name || b.code, unit: ing?.unit || '', qty: 0, occurrences: 0 };
        }
        map[b.code].qty += used;
        map[b.code].occurrences += 1;
      });
    });
    return { rows: Object.values(map).sort((a, b) => b.qty - a.qty), totalGrams };
  }, [records, store]);

  const top10 = breakdown.rows.slice(0, 10);
  const maxQty = top10[0]?.qty || 1;
  const donutSegs = top10.slice(0, 5).map((b, i) => ({
    label: b.name,
    value: Math.round(b.qty * 1000) / 1000,
    unit: b.unit,
    color: DEFECT_COLORS[i],
  }));

  return (
    <div className="card" style={{ padding: '24px 26px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, gap: 14 }}>
        <div>
          <h3 className="font-display" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>เสียหายรายวัตถุดิบ</h3>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
            {breakdown.rows.length > 0 ? (
              <>คำนวณจาก <span className="num">{records.length}</span> บันทึก · เบสรวม <span className="num">{fmtNum(breakdown.totalGrams)}</span> กรัม</>
            ) : 'ยังไม่มีข้อมูลของเสียในช่วงเวลา'}
          </div>
        </div>
        <span className="badge warn"><span className="dot" />{breakdown.rows.length} วัตถุดิบ</span>
      </div>

      {breakdown.rows.length === 0 ? (
        <Empty icon="check" title="ไม่มีของเสียในช่วงนี้" subtitle="ลองปรับช่วงวันที่" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr', gap: isMobile ? 24 : 36, alignItems: 'flex-start' }}>

          {/* Donut chart */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <InteractiveDonut
              segments={donutSegs}
              size={isMobile ? 170 : 210}
              thickness={isMobile ? 28 : 34}
            />
          </div>

          {/* Top 10 list */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 14 }}>
              Top {top10.length} วัตถุดิบเสียหาย
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {top10.map((b, i) => (
                <div key={b.code}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: 6,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, flexShrink: 0,
                      background: i < 5 ? DEFECT_COLORS[i] : 'var(--line)',
                      color: i < 5 ? '#fff' : 'var(--ink-3)',
                    }}>{i + 1}</span>
                    <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-3)', flexShrink: 0 }}>{b.code}</span>
                    <span style={{ fontWeight: 500, fontSize: 13, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
                    <span className="num" style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, color: i < 3 ? DEFECT_COLORS[i] : 'var(--ink-2)' }}>
                      {b.qty.toFixed(3)} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-3)' }}>{b.unit}</span>
                    </span>
                  </div>
                  <div className="bar">
                    <i style={{ width: `${(b.qty / maxQty) * 100}%`, background: i < 5 ? DEFECT_COLORS[i] : 'var(--ink-3)', opacity: i < 5 ? 1 : 0.5 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

/* ---------- Area Dashboard ---------- */
function AreaDashboard({ user, myBranches, records, store }) {
  const isMobile = useIsMobile();
  const initEnd = todayISO();
  const initStart = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10); })();
  const [from, setFrom] = useState(initStart);
  const [to, setTo] = useState(initEnd);

  const inRange = records.filter(r => r.date >= from && r.date <= to);
  const prod = inRange.filter(r => r.type === 'production');
  const defects = inRange.filter(r => r.type === 'defect');
  const passed = prod.filter(r => r.status === 'passed');
  const failed = prod.filter(r => r.status === 'failed');
  const passRate = prod.length ? Math.round(passed.length / prod.length * 100) : 0;

  const days = [];
  {
    const start = new Date(from), end = new Date(to);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().slice(0, 10));
    }
  }
  const dailyProd = days.map(d => prod.filter(r => r.date === d).length);
  const dailyPass = days.map(d => passed.filter(r => r.date === d).length);
  const dailyFail = days.map(d => failed.filter(r => r.date === d).length);
  const dailyDef  = days.map(d => defects.filter(r => r.date === d).length);

  const byBranch = myBranches.map(b => {
    const p = prod.filter(r => r.branchId === b.id);
    const pa = p.filter(r => r.status === 'passed').length;
    const fa = p.filter(r => r.status === 'failed').length;
    const de = defects.filter(r => r.branchId === b.id).length;
    return { branch: b, prod: p.length, passed: pa, failed: fa, defect: de, passRate: p.length ? Math.round(pa / p.length * 100) : 0 };
  }).sort((a, b) => b.prod - a.prod);

  const failReasons = {};
  failed.forEach(r => { if (r.reason) failReasons[r.reason] = (failReasons[r.reason] || 0) + 1; });
  const topFails = Object.entries(failReasons).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const defectReasons = {};
  defects.forEach(r => { if (r.reason) defectReasons[r.reason] = (defectReasons[r.reason] || 0) + 1; });
  const topDefects = Object.entries(defectReasons).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <>
      <PageHeader
        eyebrow={`ดูแล ${myBranches.length} สาขา · ${(user.areas || []).join(' · ')}`}
        title="Area Manager Dashboard"
        subtitle="สรุปภาพรวมการผลิตและของเสียในพื้นที่ที่คุณรับผิดชอบ"
        right={<DateRangePicker from={from} to={to} setFrom={setFrom} setTo={setTo} />}
      />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isMobile ? 12 : 18, marginBottom: 22 }} className="fade-up">
        <StatCard label="ล็อตการผลิต" value={fmtNum(prod.length)} sub={`${days.length} วัน`} icon="factory" accent="var(--amber)" trend={dailyProd} />
        <StatCard label="ผ่าน QC" value={fmtNum(passed.length)} sub={`${passRate}% pass rate`} icon="check" accent="var(--matcha)" trend={dailyPass} />
        <StatCard label="ไม่ผ่าน QC" value={fmtNum(failed.length)} sub="ต้องปรับปรุง" icon="alert" accent="var(--bad)" trend={dailyFail} />
        <StatCard label="ของเสียหาย" value={fmtNum(defects.length)} sub="ในช่วงเวลา" icon="trash" accent="var(--info)" trend={dailyDef} />
      </div>

      <div className="card" style={{ padding: '24px 26px', marginBottom: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h3 className="font-display" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>การผลิตรายวัน</h3>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>{fmtDateTH(from)} — {fmtDateTH(to)}</div>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
            <Legend color="var(--ok)" label="ผ่าน" />
            <Legend color="var(--bad)" label="ไม่ผ่าน" />
            <Legend color="var(--warn)" label="ของเสีย" />
          </div>
        </div>
        <StackedBars
          labels={days.map(d => new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }))}
          series={[
            { data: dailyPass, color: 'var(--ok)' },
            { data: dailyFail, color: 'var(--bad)' },
            { data: dailyDef,  color: 'var(--warn)' },
          ]}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 22, marginBottom: 22 }}>
        <div className="card" style={{ padding: '24px 26px' }}>
          <h3 className="font-display" style={{ margin: '0 0 18px', fontSize: 18, fontWeight: 600 }}>การผลิตรายสาขา</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {byBranch.map(b => {
              const mx = byBranch[0]?.prod || 1;
              return (
                <div key={b.branch.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ fontWeight: 500 }}>{b.branch.name}</span>
                    <span className="num" style={{ color: 'var(--ink-2)' }}>
                      {b.prod} ล็อต · <span style={{ color: 'var(--ok)' }}>{b.passed}✓</span> · <span style={{ color: 'var(--bad)' }}>{b.failed}✕</span> · <span style={{ color: 'var(--warn)' }}>{b.defect}⚠</span>
                    </span>
                  </div>
                  <div className="bar"><i style={{ width: `${(b.prod / mx) * 100}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ padding: '24px 26px' }}>
          <h3 className="font-display" style={{ margin: '0 0 18px', fontSize: 18, fontWeight: 600 }}>สัดส่วนคุณภาพ</h3>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Donut segments={[
              { label: 'ผ่าน QC',    value: passed.length,  color: 'var(--ok)' },
              { label: 'ไม่ผ่าน QC', value: failed.length,  color: 'var(--bad)' },
              { label: 'ของเสียหาย', value: defects.length, color: 'var(--warn)' },
            ]} size={180} thickness={28} />
          </div>
          <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--line)' }}>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Pass Rate</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span className="font-display num" style={{ fontSize: 32, fontWeight: 600, color: passRate >= 90 ? 'var(--ok)' : passRate >= 80 ? 'var(--warn)' : 'var(--bad)' }}>{passRate}%</span>
              <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>เป้าหมาย 95%</span>
            </div>
            <div className="bar" style={{ marginTop: 8 }}>
              <i style={{ width: `${passRate}%`, background: passRate >= 90 ? 'var(--ok)' : passRate >= 80 ? 'var(--warn)' : 'var(--bad)' }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 22, marginBottom: 22 }}>
        <div className="card" style={{ padding: '24px 26px' }}>
          <h3 className="font-display" style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>สาเหตุ "ไม่ผ่าน QC" สูงสุด</h3>
          {topFails.length === 0
            ? <Empty icon="check" title="ไม่มีปัญหา QC" subtitle="ผลิตได้คุณภาพดีในช่วงนี้" />
            : <ReasonList items={topFails} color="var(--bad)" />}
        </div>
        <div className="card" style={{ padding: '24px 26px' }}>
          <h3 className="font-display" style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>สาเหตุของเสียสูงสุด</h3>
          {topDefects.length === 0
            ? <Empty icon="check" title="ไม่มีของเสีย" subtitle="ดีมาก!" />
            : <ReasonList items={topDefects} color="var(--warn)" />}
        </div>
      </div>

      <DefectMaterialDashboard records={defects} store={store} />
    </>
  );
}

/* ---------- Area > Branches ---------- */
function AreaBranches({ myBranches, records }) {
  const isMobile = useIsMobile();
  const initEnd = todayISO();
  const initStart = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10); })();
  const [from, setFrom] = useState(initStart);
  const [to, setTo] = useState(initEnd);
  const inRange = records.filter(r => r.date >= from && r.date <= to);

  return (
    <>
      <PageHeader
        eyebrow="By Branch"
        title="รายละเอียดแต่ละสาขา"
        subtitle="สรุปสถิติการผลิตและของเสียรายสาขา"
        right={<DateRangePicker from={from} to={to} setFrom={setFrom} setTo={setTo} />}
      />
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 18 }} className="fade-up">
        {myBranches.map(b => {
          const recs = inRange.filter(r => r.branchId === b.id);
          const prod = recs.filter(r => r.type === 'production');
          const passed = prod.filter(r => r.status === 'passed');
          const failed = prod.filter(r => r.status === 'failed');
          const defects = recs.filter(r => r.type === 'defect');
          const passRate = prod.length ? Math.round(passed.length / prod.length * 100) : 0;
          return (
            <div key={b.id} className="card hover" style={{ padding: '22px 26px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>{b.area} · {b.id}</div>
                  <h3 className="font-display" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{b.name}</h3>
                </div>
                <span className={`badge ${passRate >= 90 ? 'ok' : passRate >= 80 ? 'warn' : 'bad'}`}><span className="dot" />{passRate}%</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
                <Stat n={prod.length}    l="ล็อต"    c="var(--ink)" />
                <Stat n={passed.length}  l="ผ่าน"    c="var(--ok)" />
                <Stat n={failed.length}  l="ไม่ผ่าน" c="var(--bad)" />
                <Stat n={defects.length} l="ของเสีย" c="var(--warn)" />
              </div>
              <div className="bar"><i style={{ width: `${passRate}%` }} /></div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------- AreaView ---------- */
export function AreaView({ user, store, refresh, onLogout }) {
  const [page, setPage] = useState('dashboard');

  const myBranches = store.branches.filter(b => (user.areas || []).includes(b.area));
  const myBranchIds = new Set(myBranches.map(b => b.id));
  const myRecords = store.records.filter(r => myBranchIds.has(r.branchId));

  const nav = [
    { key: 'dashboard',     label: 'แดชบอร์ด',       icon: 'dashboard' },
    { key: 'branches',      label: 'รายสาขา',        icon: 'store' },
    { key: 'history',       label: 'ประวัติการผลิต',  icon: 'history' },
    { key: 'defectHistory', label: 'ประวัติเสียหาย',  icon: 'trash' },
  ];

  return (
    <AppShell user={user} onLogout={onLogout} nav={nav} current={page} onNav={setPage}>
      {page === 'dashboard'     && <AreaDashboard user={user} myBranches={myBranches} records={myRecords} store={store} />}
      {page === 'branches'      && <AreaBranches  myBranches={myBranches} records={myRecords} />}
      {page === 'history'       && <SplitHistoryPage records={myRecords} store={store} title="ประวัติการผลิต" eyebrow="History" showBranch showBranchFilter refresh={refresh} branches={myBranches} />}
      {page === 'defectHistory' && <DefectHistoryPage records={myRecords} store={store} title="ประวัติเสียหาย" eyebrow="Defect History" showBranch showBranchFilter refresh={refresh} branches={myBranches} />}
    </AppShell>
  );
}
