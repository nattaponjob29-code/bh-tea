import { useState, useEffect, Component } from 'react';
import { supabase } from './lib/supabase.js';
import { ROLE_DEFS } from './lib/constants.js';
import { StoreProvider, useStore, clearStoreCache } from './context/StoreContext.jsx';
import { LoginScreen } from './pages/Login.jsx';
import { BranchView } from './pages/Branch.jsx';
import { AreaView } from './pages/Area.jsx';
import { QCView } from './pages/QC.jsx';
import { AdminView } from './pages/Admin.jsx';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, padding: 32, fontFamily: 'system-ui' }}>
          <div style={{ fontSize: 32 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#b04634' }}>เกิดข้อผิดพลาดในระบบ</div>
          <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, fontSize: 12, maxWidth: 600, overflow: 'auto', whiteSpace: 'pre-wrap', color: '#333' }}>
            {String(this.state.error)}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', borderRadius: 8, background: '#1a1410', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 }}>
            รีเฟรชหน้า
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const [session, setSession] = useState(undefined);
  const { store, loading: storeLoading, refresh } = useStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) refresh();
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'SIGNED_IN') refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  const onLogout = async () => {
    clearStoreCache();
    await supabase.auth.signOut();
  };

  if (session === undefined || (session && storeLoading)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 16, color: 'var(--ink-3)' }}>
        กำลังโหลด...
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  if (!store) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 16, color: 'var(--ink-3)' }}>
        กำลังโหลดข้อมูล...
      </div>
    );
  }

  const profile = store.users.find(u => u.id === session.user.id);
  if (!profile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
        <div style={{ fontSize: 16, color: 'var(--bad)' }}>ไม่พบข้อมูลผู้ใช้ในระบบ</div>
        <button className="btn ghost" onClick={onLogout}>ออกจากระบบ</button>
      </div>
    );
  }

  const branchName = profile.branchId ? store.branches.find(b => b.id === profile.branchId)?.name : '';
  const user = {
    ...profile,
    roleLabel: ROLE_DEFS[profile.role]?.roleLabel || profile.role,
    branchName,
  };

  const props = { user, store, refresh, onLogout };
  if (user.role === 'Branch') return <BranchView {...props} />;
  if (user.role === 'Area')   return <AreaView   {...props} />;
  if (user.role === 'QC')     return <QCView     {...props} />;
  if (user.role === 'Admin')  return <AdminView  {...props} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
      <div style={{ fontSize: 16, color: 'var(--bad)' }}>ไม่รู้จัก role: {user.role}</div>
      <button className="btn ghost" onClick={onLogout}>ออกจากระบบ</button>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <AppInner />
      </StoreProvider>
    </ErrorBoundary>
  );
}
