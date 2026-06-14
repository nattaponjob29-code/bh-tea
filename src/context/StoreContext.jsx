import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchStore } from '../lib/db.js';

const StoreCtx = createContext(null);
const CACHE_KEY = 'bhtea_store_v3'; // v3 = reference-only (ไม่เก็บ records ใน cache แล้ว)

function readCache() {
  try {
    const c = localStorage.getItem(CACHE_KEY);
    return c ? JSON.parse(c) : null;
  } catch { return null; }
}

export function clearStoreCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem('bhtea_store_v2'); // ล้าง cache เวอร์ชันเก่า
    localStorage.removeItem('bhtea_store_v1');
  } catch { /* ignore */ }
}

export function StoreProvider({ children }) {
  // store = ข้อมูลอ้างอิง (สาขา/เมนู/วัตถุดิบ/BOM/ผู้ใช้) เท่านั้น — records ดึงแยกตามช่วงที่ใช้
  const [store, setStore] = useState(readCache);
  const [loading, setLoading] = useState(() => !readCache());
  const [error, setError] = useState(null);

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

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  return (
    <StoreCtx.Provider value={{ store, loading, error, refresh }}>
      {children}
    </StoreCtx.Provider>
  );
}

export const useStore = () => useContext(StoreCtx);
