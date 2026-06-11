import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchStore, fetchRecordsRange } from '../lib/db.js';

const StoreCtx = createContext(null);
const CACHE_KEY = 'bhtea_store_v2';

function readCache() {
  try {
    const c = localStorage.getItem(CACHE_KEY);
    return c ? JSON.parse(c) : null;
  } catch { return null; }
}

export function clearStoreCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem('bhtea_store_v1'); // ล้าง cache เวอร์ชันเก่าด้วย
  } catch { /* ignore */ }
}

export function StoreProvider({ children }) {
  // เริ่มจากข้อมูลที่เคยโหลดไว้ (ถ้ามี) → แสดงผลทันที ไม่ต้องรอ DB ตื่น
  const [store, setStore] = useState(readCache);
  const [loading, setLoading] = useState(() => !readCache());
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // อ้างถึง store ล่าสุดแบบ sync — ใช้ใน loadRecordsSince ที่เป็น async
  const storeRef = useRef(store);
  useEffect(() => { storeRef.current = store; }, [store]);

  // กันยิงซ้ำพร้อมกัน — เก็บ target ที่กำลังโหลดอยู่
  const inFlightRef = useRef(null);

  const writeCache = (data) => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* quota */ }
  };

  const refresh = useCallback(async () => {
    try {
      const data = await fetchStore();
      setStore(data);
      writeCache(data);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // อัปเดตเฉพาะในเครื่อง ไม่ต้องดึงทั้งตารางใหม่ — ลด Disk IO ตอนบันทึก/ลบ
  const addRecords = useCallback((recs) => {
    const list = (Array.isArray(recs) ? recs : [recs]).map(r => ({ materialBreakdown: [], ...r }));
    setStore(prev => {
      if (!prev) return prev;
      const next = { ...prev, records: [...list, ...prev.records] };
      writeCache(next);
      return next;
    });
  }, []);

  const removeRecords = useCallback((ids) => {
    const idSet = new Set(Array.isArray(ids) ? ids : [ids]);
    setStore(prev => {
      if (!prev) return prev;
      const next = { ...prev, records: prev.records.filter(r => !idSet.has(r.id)) };
      writeCache(next);
      return next;
    });
  }, []);

  // โหลดประวัติเก่าเพิ่มตามต้องการ — targetDate = วันที่เก่าสุดที่ต้องการ
  // (null/'' = โหลดทั้งหมดที่เหลือ) เรียกตอนผู้ใช้เลือกช่วงวันที่ย้อนหลังเกินหน้าต่าง
  const loadRecordsSince = useCallback(async (targetDate) => {
    const cur = storeRef.current;
    if (!cur) return;
    const curSince = cur.recordsSince;
    if (!curSince) return;                          // โหลดครบทั้งหมดแล้ว
    if (targetDate && targetDate >= curSince) return; // มีข้อมูลช่วงนี้อยู่แล้ว

    const key = targetDate || '__all__';
    if (inFlightRef.current === key) return;        // กำลังโหลด target เดียวกันอยู่
    inFlightRef.current = key;

    setLoadingMore(true);
    try {
      const older = await fetchRecordsRange(targetDate || null, curSince);
      setStore(prev => {
        if (!prev) return prev;
        const seen = new Set(prev.records.map(r => r.id));
        const merged = [...prev.records, ...older.filter(r => !seen.has(r.id))];
        const next = { ...prev, records: merged, recordsSince: targetDate || null };
        writeCache(next);
        return next;
      });
    } catch (e) {
      setError(e.message);
    } finally {
      inFlightRef.current = null;
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  return (
    <StoreCtx.Provider value={{ store, loading, loadingMore, error, refresh, addRecords, removeRecords, loadRecordsSince }}>
      {children}
    </StoreCtx.Provider>
  );
}

export const useStore = () => useContext(StoreCtx);
