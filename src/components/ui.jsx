import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

export function Icon({ name, size = 18, stroke = 1.6, ...rest }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round', ...rest };
  switch (name) {
    case 'cup':       return <svg {...p}><path d="M5 8h13l-1 11a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3L5 8Z"/><path d="M18 11h2a2 2 0 0 1 0 4h-2"/><path d="M9 4c0 1 1 1 1 2s-1 1-1 2"/><path d="M13 4c0 1 1 1 1 2s-1 1-1 2"/></svg>;
    case 'leaf':      return <svg {...p}><path d="M4 20c0-8 6-14 16-14 0 10-6 16-14 16-1 0-2 0-2-2Z"/><path d="M4 20 14 10"/></svg>;
    case 'plus':      return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
    case 'minus':     return <svg {...p}><path d="M5 12h14"/></svg>;
    case 'x':         return <svg {...p}><path d="M6 6 18 18M18 6 6 18"/></svg>;
    case 'check':     return <svg {...p}><path d="M4 12l5 5L20 6"/></svg>;
    case 'search':    return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case 'user':      return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 5-6 8-6s7 2 8 6"/></svg>;
    case 'lock':      return <svg {...p}><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>;
    case 'logout':    return <svg {...p}><path d="M15 16l4-4-4-4"/><path d="M19 12H9"/><path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/></svg>;
    case 'dashboard': return <svg {...p}><rect x="3" y="3" width="8" height="10" rx="1.5"/><rect x="13" y="3" width="8" height="6" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="15" width="8" height="6" rx="1.5"/></svg>;
    case 'log':       return <svg {...p}><path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M8 11h8M8 15h5"/></svg>;
    case 'alert':     return <svg {...p}><path d="m12 3 10 18H2L12 3Z"/><path d="M12 10v5"/><circle cx="12" cy="18" r=".6" fill="currentColor"/></svg>;
    case 'history':   return <svg {...p}><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>;
    case 'store':     return <svg {...p}><path d="M3 9 5 4h14l2 5"/><path d="M3 9v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9"/><path d="M3 9h18"/><path d="M9 21v-6h6v6"/></svg>;
    case 'menu':      return <svg {...p}><circle cx="12" cy="6" r="3"/><path d="M6 21a6 6 0 0 1 12 0Z"/><path d="M6 14h12"/></svg>;
    case 'box':       return <svg {...p}><path d="m12 3 9 5v8l-9 5-9-5V8Z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v9"/></svg>;
    case 'link':      return <svg {...p}><path d="M9 15a3 3 0 0 0 4 0l4-4a3 3 0 0 0-4-4l-1 1"/><path d="M15 9a3 3 0 0 0-4 0l-4 4a3 3 0 0 0 4 4l1-1"/></svg>;
    case 'filter':    return <svg {...p}><path d="M4 5h16l-6 8v6l-4-2v-4Z"/></svg>;
    case 'calendar':  return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>;
    case 'trash':     return <svg {...p}><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m6 7 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>;
    case 'edit':      return <svg {...p}><path d="M4 20h4l11-11-4-4L4 16Z"/><path d="m15 5 4 4"/></svg>;
    case 'chevron':   return <svg {...p}><path d="m6 9 6 6 6-6"/></svg>;
    case 'arrow-up':  return <svg {...p}><path d="M12 19V5M5 12l7-7 7 7"/></svg>;
    case 'arrow-down':return <svg {...p}><path d="M12 5v14M5 12l7 7 7-7"/></svg>;
    case 'factory':   return <svg {...p}><path d="M3 21V11l5 3V11l5 3V8l5 3v10Z"/><path d="M3 21h18"/></svg>;
    case 'sparkle':   return <svg {...p}><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/><path d="m6 6 3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/></svg>;
    case 'shield':    return <svg {...p}><path d="M12 3 4 6v6c0 5 4 8 8 9 4-1 8-4 8-9V6Z"/></svg>;
    default: return null;
  }
}

const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

export function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return isMobile;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <Icon name={t.kind === 'ok' ? 'check' : t.kind === 'bad' ? 'x' : 'alert'} />
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function Modal({ open, onClose, title, children, footer, width = 560 }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: width }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '22px 26px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="font-display" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>
            <Icon name="x" size={20} />
          </button>
        </div>
        <div style={{ padding: '10px 26px 24px' }}>{children}</div>
        {footer && <div style={{ padding: '14px 26px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  );
}

export function Sparkline({ data, color = 'var(--tea)', height = 60, fill = true }) {
  if (!data || data.length === 0) return <svg className="spark" />;
  const w = 300, h = height, pad = 4;
  const max = Math.max(...data, 1);
  const stepX = (w - pad * 2) / Math.max(data.length - 1, 1);
  const pts = data.map((v, i) => [pad + i * stepX, h - pad - (v / (max || 1)) * (h - pad * 2)]);
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = path + ` L ${pts[pts.length - 1][0]} ${h} L ${pts[0][0]} ${h} Z`;
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill="url(#sg)" />}
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(([x, y], i) => i === pts.length - 1 ? <circle key={i} cx={x} cy={y} r="3.5" fill={color} /> : null)}
    </svg>
  );
}

export function Bars({ data, color = 'var(--amber)', height = 140, labels }) {
  if (!data || data.length === 0) return <div style={{ height }} />;
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, padding: '4px 2px' }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
            <div style={{
              width: '100%', height: `${(v / max) * 100}%`,
              background: `linear-gradient(180deg, ${color}, color-mix(in oklch, ${color}, var(--tea) 40%))`,
              borderRadius: '6px 6px 2px 2px', minHeight: v > 0 ? 4 : 0,
              transition: 'height 600ms cubic-bezier(.2,.7,.2,1)', position: 'relative',
            }}>
              <span style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: 'var(--ink-3)' }} className="num">{v || ''}</span>
            </div>
          </div>
          {labels && <div style={{ fontSize: 10, color: 'var(--ink-3)', textAlign: 'center' }}>{labels[i]}</div>}
        </div>
      ))}
    </div>
  );
}

export function Donut({ segments, size = 160, thickness = 22, stack = false }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - thickness / 2;
  const c = size / 2;
  let acc = 0;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', flexDirection: stack ? 'column' : 'row', alignItems: 'center', gap: stack ? 14 : 20 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--line)" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const frac = s.value / total;
          const dash = circ * frac;
          const gap = circ - dash;
          const offset = -acc * circ;
          acc += frac;
          return (
            <circle key={i} cx={c} cy={c} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
              strokeDasharray={`${dash} ${gap}`} strokeDashoffset={offset}
              style={{ transition: 'stroke-dasharray 700ms cubic-bezier(.2,.7,.2,1)' }} />
          );
        })}
        <text x={c} y={c + 6} textAnchor="middle" style={{ transform: `rotate(90deg)`, transformOrigin: `${c}px ${c}px` }}
          fontFamily="Space Grotesk" fontWeight="600" fontSize="22" fill="var(--ink)">{total}</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: stack ? 'row' : 'column', flexWrap: stack ? 'wrap' : 'nowrap', gap: stack ? '6px 16px' : 8, justifyContent: stack ? 'center' : undefined }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--ink-2)' }}>{s.label}</span>
            <span className="num" style={{ color: 'var(--ink-3)', marginLeft: stack ? 0 : 'auto' }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Interactive Donut — arc-path based, hover shows segment detail in center */
export function InteractiveDonut({ segments, size = 200, thickness = 32 }) {
  const [hovered, setHovered] = useState(null);
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const cx = size / 2, cy = size / 2;
  const outerR = size / 2 - 3;
  const innerR = outerR - thickness;
  const GAP = segments.length > 1 ? 2.5 : 0;

  function xy(r, deg) {
    const rad = deg * Math.PI / 180;
    return [+(cx + r * Math.cos(rad)).toFixed(3), +(cy + r * Math.sin(rad)).toFixed(3)];
  }

  function buildArc(startDeg, endDeg) {
    const s = startDeg + GAP / 2;
    const e = endDeg - GAP / 2;
    if (e - s <= 0.5) return '';
    const lg = e - s > 180 ? 1 : 0;
    const [x1, y1] = xy(outerR, s);
    const [x2, y2] = xy(outerR, e);
    const [x3, y3] = xy(innerR, e);
    const [x4, y4] = xy(innerR, s);
    return `M${x1} ${y1}A${outerR} ${outerR} 0 ${lg} 1 ${x2} ${y2}L${x3} ${y3}A${innerR} ${innerR} 0 ${lg} 0 ${x4} ${y4}Z`;
  }

  let acc = -90;
  const arcs = segments.map((seg, i) => {
    const sw = (seg.value / total) * 360;
    const start = acc;
    const end = acc + (sw >= 360 ? 359.9 : sw);
    acc += sw;
    return { ...seg, start, end, i };
  });

  const hov = hovered !== null ? segments[hovered] : null;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8, userSelect: 'none' }}>
      <svg width={size} height={size} style={{ display: 'block' }}
        onMouseLeave={() => setHovered(null)}>
        {/* Track ring */}
        <circle cx={cx} cy={cy} r={(outerR + innerR) / 2} fill="none" stroke="var(--line)" strokeWidth={thickness} />
        {/* Segments */}
        {arcs.map((a, i) => (
          <path key={i} d={buildArc(a.start, a.end)} fill={a.color}
            opacity={hovered === null || hovered === i ? 1 : 0.22}
            onMouseEnter={() => setHovered(i)}
            onTouchStart={(e) => { e.preventDefault(); setHovered(hovered === i ? null : i); }}
            style={{ cursor: 'pointer', transition: 'opacity 140ms' }}
          />
        ))}
        {/* Center value */}
        <text x={cx} y={cy - 4} textAnchor="middle"
          fontFamily="Space Grotesk" fontWeight="700" fontSize={hov ? '18' : '22'}
          fill={hov ? hov.color : 'var(--ink)'}>
          {hov ? hov.value.toFixed(2) : segments.length}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle"
          fontFamily="inherit" fontSize="11" fill="var(--ink-3)">
          {hov ? (hov.unit || '') : 'วัตถุดิบ'}
        </text>
      </svg>
      {/* Hover label below chart */}
      <div style={{ height: 18, fontSize: 12, fontWeight: 600, textAlign: 'center', maxWidth: size,
        color: hov ? hov.color : 'var(--ink-3)', opacity: hov ? 1 : 0.45, transition: 'all 140ms' }}>
        {hov ? hov.label : '— เลื่อนเมาส์ไปที่กราฟ —'}
      </div>
    </div>
  );
}

export function AppShell({ user, onLogout, nav, current, onNav, children }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const handleNav = (key) => { onNav(key); setSidebarOpen(false); };

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="เมนู">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect y="3" width="20" height="2" rx="1" fill="currentColor"/>
            <rect y="9" width="20" height="2" rx="1" fill="currentColor"/>
            <rect y="15" width="20" height="2" rx="1" fill="currentColor"/>
          </svg>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Logo size={28} dark={false} />
          <span className="font-display" style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>TeaLog</span>
        </div>
        <div style={{ width: 36 }} />
      </div>

      <aside className={`app-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, paddingLeft: 6 }}>
          <Logo size={36} dark />
          <div>
            <div className="font-display" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>TeaLog</div>
            <div style={{ fontSize: 11, opacity: .55, letterSpacing: '.1em', textTransform: 'uppercase' }}>Production OS</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,253,247,.4)', padding: '10px 12px 6px', letterSpacing: '.12em', textTransform: 'uppercase' }}>Workspace</div>
          {nav.map(n => (
            <button key={n.key} onClick={() => handleNav(n.key)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 12px', borderRadius: 10,
              background: current === n.key ? 'rgba(246,241,231,.10)' : 'transparent',
              color: current === n.key ? '#fffdf7' : 'rgba(246,241,231,.7)',
              border: 'none', textAlign: 'left', cursor: 'pointer',
              fontSize: 14, fontFamily: 'inherit', transition: 'all 140ms', position: 'relative',
            }}>
              {current === n.key && <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, background: 'var(--amber)', borderRadius: 3 }} />}
              <Icon name={n.icon} size={18} />
              <span>{n.label}</span>
              {n.badge && <span style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'var(--amber)', color: '#1a1410', fontWeight: 600 }}>{n.badge}</span>}
            </button>
          ))}
        </div>

        <div style={{ borderTop: '1px solid rgba(246,241,231,.12)', paddingTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--amber), var(--tea))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Grotesk', fontWeight: 700, color: '#fffdf7', flexShrink: 0 }}>
              {(user.label || user.username || '?')[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#fffdf7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.label || user.username}</div>
              <div style={{ fontSize: 11, color: 'rgba(246,241,231,.5)' }}>{user.roleLabel}{user.branchName ? ` · ${user.branchName}` : ''}</div>
            </div>
          </div>
          <button onClick={onLogout} style={{ marginTop: 8, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 10, background: 'rgba(246,241,231,.05)', color: 'rgba(246,241,231,.8)', border: '1px solid rgba(246,241,231,.1)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', transition: 'all 140ms' }}>
            <Icon name="logout" size={14} /> ออกจากระบบ
          </button>
        </div>
      </aside>

      <main className="app-main">
        {children}
      </main>
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, right }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-end', marginBottom: 28, gap: isMobile ? 14 : 20 }} className="fade-up">
      <div>
        {eyebrow && <div style={{ fontSize: 12, color: 'var(--ink-3)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 500 }}>{eyebrow}</div>}
        <h1 className="font-display" style={{ margin: 0, fontSize: 'clamp(22px, 5vw, 36px)', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{title}</h1>
        {subtitle && !isMobile && <div style={{ marginTop: 8, fontSize: 15, color: 'var(--ink-3)' }}>{subtitle}</div>}
      </div>
      {right && <div style={{ width: isMobile ? '100%' : undefined }}>{right}</div>}
    </div>
  );
}

export function Logo({ size = 48, dark = false }) {
  const fg = dark ? '#fffdf7' : 'var(--ink)';
  const accent = 'var(--amber)';
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <div className="steam" style={{ left: size * 0.35, top: -size * 0.25, width: size * 0.5, height: size * 0.6 }}>
        <i style={{ left: 0, top: 0, animationDelay: '0s' }} />
        <i style={{ left: size * 0.18, top: 4, animationDelay: '.8s' }} />
        <i style={{ left: size * 0.34, top: 0, animationDelay: '1.4s' }} />
      </div>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <rect x="2" y="2" width="44" height="44" rx="12" fill={accent} />
        <path d="M14 18 H32 L30 34 a4 4 0 0 1-4 4 H20 a4 4 0 0 1-4-4 Z" fill={fg} />
        <path d="M32 22 h2 a3 3 0 0 1 0 6 h-2" stroke={fg} strokeWidth="2" fill="none" />
        <path d="M19 12 c2 2 -1 4 1 6" stroke={fg} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M25 10 c2 2 -1 4 1 6" stroke={fg} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function StatCard({ label, value, sub, delta, accent = 'var(--amber)', icon, trend }) {
  return (
    <div className="card hover" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--ink-3)', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 500 }}>{label}</span>
        {icon && (
          <div style={{ width: 32, height: 32, borderRadius: 9, background: `color-mix(in oklch, ${accent} 15%, white)`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={icon} size={16} />
          </div>
        )}
      </div>
      <div className="num font-display" style={{ fontSize: 38, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--ink)' }}>{value}</div>
      {(sub || delta) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--ink-3)' }}>
          {delta && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: delta.startsWith('-') ? 'var(--bad)' : 'var(--ok)', fontWeight: 500 }}>
              <Icon name={delta.startsWith('-') ? 'arrow-down' : 'arrow-up'} size={12} />{delta}
            </span>
          )}
          {sub && <span>{sub}</span>}
        </div>
      )}
      {trend && <div style={{ marginTop: 6, marginLeft: -6, marginRight: -6 }}><Sparkline data={trend} color={accent} height={40} /></div>}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'ค้นหา...' }) {
  return (
    <div style={{ position: 'relative' }}>
      <Icon name="search" size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
      <input className="inp" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ paddingLeft: 38 }} />
    </div>
  );
}

export function Empty({ icon = 'leaf', title, subtitle }) {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--ink-3)' }}>
      <div style={{ width: 56, height: 56, margin: '0 auto 14px', borderRadius: '50%', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}>
        <Icon name={icon} size={26} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-2)' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, marginTop: 6 }}>{subtitle}</div>}
    </div>
  );
}

export function Seg({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map(o => (
        <button key={o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
