import { useState } from 'react';
import { AppShell, PageHeader, StatCard, Icon, Empty, useIsMobile } from '../components/ui.jsx';
import { SplitHistoryPage, DefectHistoryPage } from '../components/History.jsx';
import { DateRangePicker, StackedBars, Legend } from './Area.jsx';
import { useEnsureRecordsLoaded } from '../context/StoreContext.jsx';
import { todayISO, fmtDateTH, fmtNum } from '../lib/helpers.js';

function RankList({ items, positive }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((x, i) => (
        <div key={x.b.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 12px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--line)' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: positive ? 'var(--ok)' : 'var(--bad)',
            color: '#fffdf7', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Space Grotesk', fontWeight: 600,
          }}>{i + 1}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{x.b.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{x.b.area} · {x.prod} ล็อต</div>
          </div>
          <div className="num font-display" style={{ fontSize: 20, fontWeight: 600, color: positive ? 'var(--ok)' : 'var(--bad)' }}>
            {x.rate.toFixed(0)}%
          </div>
        </div>
      ))}
    </div>
  );
}

function Mini({ n, l, c }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--bg)', borderRadius: 8 }}>
      <div className="num" style={{ fontSize: 16, fontWeight: 600, color: c }}>{n}</div>
      <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>{l}</div>
    </div>
  );
}

/* ---------- QC Overview ---------- */
function QCOverview({ store }) {
  const isMobile = useIsMobile();
  const initEnd = todayISO();
  const initStart = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10); })();
  const [from, setFrom] = useState(initStart);
  const [to, setTo] = useState(initEnd);
  useEnsureRecordsLoaded(from);

  const inRange = store.records.filter(r => r.date >= from && r.date <= to);
  const prod = inRange.filter(r => r.type === 'production');
  const defects = inRange.filter(r => r.type === 'defect');
  const passed = prod.filter(r => r.status === 'passed');
  const failed = prod.filter(r => r.status === 'failed');
  const passRate = prod.length ? Math.round(passed.length / prod.length * 100) : 0;

  const days = [];
  {
    const start = new Date(from), end = new Date(to);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(d.toISOString().slice(0, 10));
  }
  const dailyPass = days.map(d => passed.filter(r => r.date === d).length);
  const dailyFail = days.map(d => failed.filter(r => r.date === d).length);
  const dailyDef  = days.map(d => defects.filter(r => r.date === d).length);

  const branchStats = store.branches.map(b => {
    const recs = inRange.filter(r => r.branchId === b.id);
    const p = recs.filter(r => r.type === 'production');
    const pa = p.filter(r => r.status === 'passed').length;
    const fa = p.filter(r => r.status === 'failed').length;
    const de = recs.filter(r => r.type === 'defect').length;
    return { b, prod: p.length, passed: pa, failed: fa, defect: de, rate: p.length ? pa / p.length * 100 : 100 };
  });
  const worst = branchStats.slice().sort((a, b) => a.rate - b.rate).slice(0, 3);
  const best  = branchStats.slice().sort((a, b) => b.rate - a.rate).slice(0, 3);

  const menuFail = store.menus.map(m => {
    const recs = prod.filter(r => r.menuId === m.id);
    const f = recs.filter(r => r.status === 'failed').length;
    return { m, total: recs.length, failed: f, rate: recs.length ? f / recs.length * 100 : 0 };
  }).filter(x => x.total > 0).sort((a, b) => b.rate - a.rate).slice(0, 6);

  return (
    <>
      <PageHeader
        eyebrow="Quality Control · ทุกสาขา"
        title="QC Overview"
        subtitle={`ตรวจสอบคุณภาพการผลิตทั้งหมด ${store.branches.length} สาขา · ${store.menus.length} เมนู`}
        right={<DateRangePicker from={from} to={to} setFrom={setFrom} setTo={setTo} />}
      />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isMobile ? 12 : 18, marginBottom: 22 }} className="fade-up">
        <StatCard label="ล็อตทั้งหมด" value={fmtNum(prod.length)} sub={`${store.branches.length} สาขา`} icon="factory" accent="var(--amber)" />
        <StatCard label="Pass Rate" value={`${passRate}%`} sub={`${fmtNum(passed.length)} / ${fmtNum(prod.length)}`} icon="check" accent="var(--matcha)" />
        <StatCard label="ไม่ผ่าน QC" value={fmtNum(failed.length)} sub="ต้องตรวจสอบ" icon="alert" accent="var(--bad)" trend={dailyFail} />
        <StatCard label="ของเสียหาย" value={fmtNum(defects.length)} sub={`รวม ${fmtNum(defects.reduce((s, d) => s + d.qty, 0))} หน่วย`} icon="trash" accent="var(--info)" trend={dailyDef} />
      </div>

      <div className="card" style={{ padding: '24px 26px', marginBottom: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, gap: 10, flexWrap: 'wrap' }}>
          <div>
            <h3 className="font-display" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Quality Trend</h3>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>{fmtDateTH(from)} — {fmtDateTH(to)}</div>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
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
          height={220}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 22, marginBottom: 22 }}>
        <div className="card" style={{ padding: '24px 26px' }}>
          <h3 className="font-display" style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>Top สาขาคุณภาพดีที่สุด</h3>
          <RankList items={best} positive />
        </div>
        <div className="card" style={{ padding: '24px 26px' }}>
          <h3 className="font-display" style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>สาขาที่ต้องดูแลเพิ่ม</h3>
          <RankList items={worst} positive={false} />
        </div>
      </div>

      <div className="card" style={{ padding: '24px 26px' }}>
        <h3 className="font-display" style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>เมนูที่ไม่ผ่าน QC บ่อย</h3>
        {menuFail.length === 0 ? (
          <Empty icon="check" title="ไม่มีข้อมูล" subtitle="ในช่วงเวลาที่เลือกยังไม่มีการผลิต" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)', gap: 14 }}>
            {menuFail.map(({ m, total, failed, rate }) => (
              <div key={m.id} style={{ padding: '14px 16px', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{m.category}</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{m.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="num font-display" style={{ fontSize: 22, fontWeight: 600, color: rate > 15 ? 'var(--bad)' : rate > 5 ? 'var(--warn)' : 'var(--ok)' }}>{rate.toFixed(1)}%</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{failed}/{total}</div>
                  </div>
                </div>
                <div className="bar"><i style={{ width: `${Math.min(rate * 3, 100)}%`, background: rate > 15 ? 'var(--bad)' : rate > 5 ? 'var(--warn)' : 'var(--ok)' }} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ---------- All branches grid ---------- */
function QCBranches({ store }) {
  const isMobile = useIsMobile();
  const initEnd = todayISO();
  const initStart = (() => { const d = new Date(); d.setDate(d.getDate() - 13); return d.toISOString().slice(0, 10); })();
  const [from, setFrom] = useState(initStart);
  const [to, setTo] = useState(initEnd);
  useEnsureRecordsLoaded(from);
  const inRange = store.records.filter(r => r.date >= from && r.date <= to);

  return (
    <>
      <PageHeader
        eyebrow={`${store.branches.length} สาขาทั้งองค์กร`}
        title="ทุกสาขา"
        subtitle="สถานะคุณภาพการผลิตของทุกสาขาในระบบ"
        right={<DateRangePicker from={from} to={to} setFrom={setFrom} setTo={setTo} />}
      />
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 18 }} className="fade-up">
        {store.branches.map(b => {
          const recs = inRange.filter(r => r.branchId === b.id);
          const prod = recs.filter(r => r.type === 'production');
          const pa = prod.filter(r => r.status === 'passed').length;
          const fa = prod.filter(r => r.status === 'failed').length;
          const de = recs.filter(r => r.type === 'defect').length;
          const rate = prod.length ? Math.round(pa / prod.length * 100) : 0;
          const dotColor = rate >= 90 ? 'var(--ok)' : rate >= 80 ? 'var(--warn)' : 'var(--bad)';
          return (
            <div key={b.id} className="card hover" style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>{b.area} · {b.id}</div>
                  <div className="font-display" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>{b.name}</div>
                </div>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, marginTop: 6, animation: 'pulse 2s infinite' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14 }}>
                <span className="num font-display" style={{ fontSize: 28, fontWeight: 600, color: dotColor }}>{rate}%</span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>pass rate</span>
              </div>
              <div className="bar" style={{ marginBottom: 12 }}><i style={{ width: `${rate}%`, background: dotColor }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, fontSize: 11 }}>
                <Mini n={prod.length} l="ล็อต"    c="var(--ink-2)" />
                <Mini n={pa}          l="ผ่าน"    c="var(--ok)" />
                <Mini n={fa}          l="ไม่ผ่าน" c="var(--bad)" />
                <Mini n={de}          l="ของเสีย" c="var(--warn)" />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------- Menu analysis ---------- */
function QCMenus({ store }) {
  const isMobile = useIsMobile();
  const initEnd = todayISO();
  const initStart = (() => { const d = new Date(); d.setDate(d.getDate() - 13); return d.toISOString().slice(0, 10); })();
  const [from, setFrom] = useState(initStart);
  const [to, setTo] = useState(initEnd);
  useEnsureRecordsLoaded(from);
  const inRange = store.records.filter(r => r.date >= from && r.date <= to);

  const rows = store.menus.map(m => {
    const recs = inRange.filter(r => r.menuId === m.id && r.type === 'production');
    const pa = recs.filter(r => r.status === 'passed').length;
    const fa = recs.filter(r => r.status === 'failed').length;
    const de = inRange.filter(r => r.menuId === m.id && r.type === 'defect');
    const defQty = de.reduce((s, x) => s + x.qty, 0);
    return { m, prod: recs.length, passed: pa, failed: fa, defectQty: defQty, rate: recs.length ? pa / recs.length * 100 : 0 };
  });

  return (
    <>
      <PageHeader
        eyebrow="By Menu"
        title="วิเคราะห์รายเมนู"
        subtitle="แต่ละเมนูผลิตเท่าไหร่ ผ่าน-ไม่ผ่าน QC อย่างไร"
        right={<DateRangePicker from={from} to={to} setFrom={setFrom} setTo={setTo} />}
      />
      <div className="card" style={{ overflow: 'hidden' }}>
        {isMobile ? (
          /* ── Mobile card layout ── */
          <div>
            {rows.map(({ m, prod, passed, failed, defectQty, rate }, idx) => {
              const rateColor = rate >= 90 ? 'var(--ok)' : rate >= 80 ? 'var(--warn)' : prod > 0 ? 'var(--bad)' : 'var(--ink-3)';
              return (
                <div key={m.id} style={{ padding: '14px 16px', borderBottom: idx < rows.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  {/* Row 1: category + menu name + pass rate */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ marginBottom: 4 }}><span className="badge">{m.category}</span></div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>{m.name}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div className="num font-display" style={{ fontSize: 22, fontWeight: 700, color: rateColor, lineHeight: 1 }}>
                        {prod > 0 ? rate.toFixed(0) + '%' : '—'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>pass rate</div>
                    </div>
                  </div>
                  {/* Row 2: stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10 }}>
                    <div style={{ textAlign: 'center', padding: '6px 4px', background: 'var(--bg)', borderRadius: 8 }}>
                      <div className="num" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-2)' }}>{prod}</div>
                      <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>ล็อต</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '6px 4px', background: 'var(--bg)', borderRadius: 8 }}>
                      <div className="num" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ok)' }}>{passed}</div>
                      <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>ผ่าน</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '6px 4px', background: 'var(--bg)', borderRadius: 8 }}>
                      <div className="num" style={{ fontSize: 16, fontWeight: 600, color: failed > 0 ? 'var(--bad)' : 'var(--ink-3)' }}>{failed}</div>
                      <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>ไม่ผ่าน</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '6px 4px', background: 'var(--bg)', borderRadius: 8 }}>
                      <div className="num" style={{ fontSize: 14, fontWeight: 600, color: defectQty > 0 ? 'var(--warn)' : 'var(--ink-3)' }}>{defectQty > 0 ? defectQty.toLocaleString() : '0'}</div>
                      <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>เสีย ({m.unit})</div>
                    </div>
                  </div>
                  {/* Row 3: pass rate bar */}
                  {prod > 0 && (
                    <div className="bar">
                      <i style={{ width: `${rate}%`, background: rateColor }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Desktop table layout ── */
          <table className="t">
            <thead>
              <tr>
                <th>เมนู</th>
                <th>หมวด</th>
                <th style={{ textAlign: 'right' }}>ล็อตผลิต</th>
                <th style={{ textAlign: 'right' }}>ผ่าน</th>
                <th style={{ textAlign: 'right' }}>ไม่ผ่าน</th>
                <th style={{ textAlign: 'right' }}>ของเสีย</th>
                <th style={{ minWidth: 180 }}>Pass Rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ m, prod, passed, failed, defectQty, rate }) => (
                <tr key={m.id}>
                  <td style={{ color: 'var(--ink)', fontWeight: 500 }}>{m.name}</td>
                  <td><span className="badge">{m.category}</span></td>
                  <td className="num" style={{ textAlign: 'right' }}>{prod}</td>
                  <td className="num" style={{ textAlign: 'right', color: 'var(--ok)' }}>{passed}</td>
                  <td className="num" style={{ textAlign: 'right', color: 'var(--bad)' }}>{failed}</td>
                  <td className="num" style={{ textAlign: 'right', color: 'var(--warn)' }}>{defectQty.toLocaleString()} {m.unit}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="bar" style={{ flex: 1 }}>
                        <i style={{ width: `${rate}%`, background: rate >= 90 ? 'var(--ok)' : rate >= 80 ? 'var(--warn)' : 'var(--bad)' }} />
                      </div>
                      <span className="num" style={{ fontSize: 13, color: rate >= 90 ? 'var(--ok)' : rate >= 80 ? 'var(--warn)' : 'var(--bad)', fontWeight: 500, minWidth: 42, textAlign: 'right' }}>
                        {prod ? rate.toFixed(0) + '%' : '—'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

/* ---------- QCView ---------- */
export function QCView({ user, store, refresh, onLogout }) {
  const [page, setPage] = useState('overview');

  const nav = [
    { key: 'overview',      label: 'ภาพรวมองค์กร',  icon: 'dashboard' },
    { key: 'branches',      label: 'ทุกสาขา',       icon: 'store' },
    { key: 'menus',         label: 'รายเมนู',        icon: 'menu' },
    { key: 'history',       label: 'ประวัติการผลิต', icon: 'history' },
    { key: 'defectHistory', label: 'ประวัติเสียหาย', icon: 'trash' },
  ];

  return (
    <AppShell user={user} onLogout={onLogout} nav={nav} current={page} onNav={setPage}>
      {page === 'overview'      && <QCOverview store={store} />}
      {page === 'branches'      && <QCBranches store={store} />}
      {page === 'menus'         && <QCMenus    store={store} />}
      {page === 'history'       && <SplitHistoryPage records={store.records} store={store} title="ประวัติทั้งองค์กร" eyebrow="QC · Production" showBranch showBranchFilter refresh={refresh} />}
      {page === 'defectHistory' && <DefectHistoryPage records={store.records} store={store} title="ประวัติเสียหายทั้งองค์กร" eyebrow="QC · Defects" showBranch showBranchFilter refresh={refresh} />}
    </AppShell>
  );
}
