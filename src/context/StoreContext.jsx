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
