import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { Icon } from '../components/ui.jsx';
import { ROLE_DEFS } from '../lib/constants.js';

export function LoginScreen() {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: `${user.trim()}@bh.local`,
        password: pass,
      });
      if (error) setErr('รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    } catch {
      setErr('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1.1fr 1fr' }}>
      <div style={{ position: 'relative', overflow: 'hidden', color: '#fffdf7', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '60px 70px', backgroundColor: '#1a1410' }}>
        <img src="/assets/login-bg.jpg" alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 70px', background: 'var(--bg)' }}>
        <div style={{ width: '100%', maxWidth: 420 }} className="fade-up">
          <div style={{ fontSize: 12, color: 'var(--amber)', letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>
            Welcome back
          </div>
          <h2 className="font-display" style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em' }}>ลงชื่อเข้าใช้งาน</h2>
          <p style={{ marginTop: 8, color: 'var(--ink-3)', fontSize: 14 }}>ใช้รหัสที่ได้รับจากระบบเพื่อเข้าสู่ workspace ของคุณ</p>

          <form onSubmit={submit} style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label className="field">
              <span>ชื่อผู้ใช้</span>
              <div style={{ position: 'relative' }}>
                <Icon name="user" size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
                <input className="inp" value={user} onChange={e => setUser(e.target.value)} placeholder="username" style={{ paddingLeft: 38 }} autoFocus />
              </div>
            </label>
            <label className="field">
              <span>รหัสผ่าน</span>
              <div style={{ position: 'relative' }}>
                <Icon name="lock" size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
                <input className="inp" type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••" style={{ paddingLeft: 38 }} />
              </div>
            </label>

            {err && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(176,70,52,.1)', color: 'var(--bad)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }} className="fade-in">
                <Icon name="alert" size={14} /> {err}
              </div>
            )}

            <button type="submit" className="btn" disabled={loading} style={{ padding: '14px 16px', justifyContent: 'center', fontSize: 15, marginTop: 4, whiteSpace: 'nowrap' }}>
              {loading ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 14, height: 14, border: '2px solid rgba(255,253,247,.3)', borderTopColor: '#fffdf7', borderRadius: '50%', animation: 'spin 700ms linear infinite', display: 'inline-block' }} />
                  กำลังเข้าสู่ระบบ...
                </span>
              ) : <>เข้าสู่ระบบ <Icon name="arrow-up" size={14} style={{ transform: 'rotate(90deg)' }} /></>}
            </button>
          </form>

          <div style={{ marginTop: 32, paddingTop: 22, borderTop: '1px solid var(--line)', fontSize: 13, color: 'var(--ink-3)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(ROLE_DEFS).map(([role, def]) => (
                <div key={role} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99, background: 'var(--paper)', border: '1px solid var(--line)', fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: def.color }} />
                  {def.roleLabel}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
