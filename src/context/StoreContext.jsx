import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchStore } from '../lib/db.js';

const StoreCtx = createContext(null);
const CACHE_KEY = 'bhtea_store_v1';

function readCache() {
  try {
    const c = localStorage.getItem(CACHE_KEY);
    return c ? JSON.parse(c) : null;
  } catch { return null; }
}

export function clearStoreCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

export function StoreProvider({ children }) {
  // เริ่มจากข้อมูลที่เคยโหลดไว้ (ถ้ามี) → แสดงผลทันที ไม่ต้องรอ DB ตื่น
  const [store, setStore] = useState(readCache);
  const [loading, setLoading] = useState(() => !readCache());
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchStore();
      setStore(data);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* quota */ }
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
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  }, []);

  const removeRecords = useCallback((ids) => {
    const idSet = new Set(Array.isArray(ids) ? ids : [ids]);
    setStore(prev => {
      if (!prev) return prev;
      const next = { ...prev, records: prev.records.filter(r => !idSet.has(r.id)) };
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  return (
    <StoreCtx.Provider value={{ store, loading, error, refresh, addRecords, removeRecords }}>
      {children}
    </StoreCtx.Provider>
  );
}

export const useStore = () => useContext(StoreCtx);
