import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchStore } from '../lib/db.js';

const StoreCtx = createContext(null);

export function StoreProvider({ children }) {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchStore();
      setStore(data);
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
