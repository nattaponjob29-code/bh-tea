import { useState, useEffect } from 'react';
import {
  statsKpi, statsDaily, statsByBranch, statsByMenu, statsReasons, defectByMaterial,
} from './db.js';

// Hook รวบรวมสถิติฝั่งเซิร์ฟเวอร์ (RPC) สำหรับแดชบอร์ด — ดึงเฉพาะผลสรุปก้อนเล็ก
// branchIds: array สาขาที่ scope (null/undefined/[] = ทุกสาขา)
// opts: { daily, byBranch, byMenu, reasons, material } เปิดเฉพาะที่หน้านั้นใช้
export function useDashboard(from, to, branchIds, opts = {}) {
  const { daily, byBranch, byMenu, reasons, material } = opts;
  const [state, setState] = useState({
    loading: true, error: null,
    kpi: { prod: 0, passed: 0, failed: 0, defect: 0, defectQty: 0 },
    daily: [], byBranch: [], byMenu: [], failReasons: [], defectReasons: [], material: [],
  });

  const branchKey = branchIds && branchIds.length ? branchIds.join(',') : '';

  useEffect(() => {
    let cancelled = false;
    setState(s => ({ ...s, loading: true, error: null }));
    (async () => {
      try {
        const jobs = [['kpi', statsKpi(from, to, branchIds)]];
        if (daily)    jobs.push(['daily', statsDaily(from, to, branchIds)]);
        if (byBranch) jobs.push(['byBranch', statsByBranch(from, to, branchIds)]);
        if (byMenu)   jobs.push(['byMenu', statsByMenu(from, to, branchIds)]);
        if (reasons) {
          jobs.push(['failReasons', statsReasons(from, to, 'failed', branchIds)]);
          jobs.push(['defectReasons', statsReasons(from, to, 'defect', branchIds)]);
        }
        if (material) jobs.push(['material', defectByMaterial(from, to, branchIds)]);

        const results = await Promise.all(jobs.map(j => j[1]));
        if (cancelled) return;
        const out = {};
        jobs.forEach((j, i) => { out[j[0]] = results[i]; });
        setState({
          loading: false, error: null,
          kpi: out.kpi || { prod: 0, passed: 0, failed: 0, defect: 0, defectQty: 0 },
          daily: out.daily || [], byBranch: out.byBranch || [], byMenu: out.byMenu || [],
          failReasons: out.failReasons || [], defectReasons: out.defectReasons || [],
          material: out.material || [],
        });
      } catch (e) {
        if (!cancelled) setState(s => ({ ...s, loading: false, error: e.message }));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, branchKey, daily, byBranch, byMenu, reasons, material]);

  return state;
}

// แปลง statsDaily → array ค่ารายวันตามลำดับ `days` (YYYY-MM-DD) สำหรับกราฟ
export function dailySeries(dailyRows, days, field) {
  const map = {};
  (dailyRows || []).forEach(r => { map[r.date] = r; });
  return days.map(d => (map[d]?.[field]) || 0);
}

// สร้างรายการวันที่ระหว่าง from..to (รวมปลายทั้งสอง) เป็น array ของ 'YYYY-MM-DD'
export function dateRangeDays(from, to) {
  const days = [];
  const start = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}
