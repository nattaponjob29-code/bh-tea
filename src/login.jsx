/* =========================================================
   LOGIN SCREEN
   ========================================================= */

const ROLE_DEFS = {
  Branch: { roleLabel: "พนักงานสาขา",  color: "var(--amber)",  icon: "store" },
  Area:   { roleLabel: "Area Manager", color: "var(--matcha)", icon: "shield" },
  QC:     { roleLabel: "QC",           color: "var(--info)",   icon: "shield" },
  Admin:  { roleLabel: "ผู้ดูแลระบบ",   color: "var(--tea)",     icon: "shield" },
};

const DEMO_CREDS = [
  { user:"Branch", pass:"Branch", role:"Branch" },
  { user:"Area",   pass:"Area",   role:"Area"   },
  { user:"QC",     pass:"QC",     role:"QC"     },
  { user:"Admin",  pass:"Admin",  role:"Admin"  },
];

function LoginScreen({onLogin}){
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const submit = (e) => {
    e?.preventDefault();
    setErr("");
    setLoading(true);
    setTimeout(() => {
      const store = loadStore();
      const cred = store.users.find(c => c.user===user && c.pass===pass);
      if (!cred){
        setErr("รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        setLoading(false);
        return;
      }
      const branchName = cred.branchId ? store.branches.find(b=>b.id===cred.branchId)?.name : "";
      onLogin({
        ...cred,
        roleLabel: ROLE_DEFS[cred.role].roleLabel,
        branchName,
      });
    }, 600);
  };

  const quickFill = (cred) => {
    setUser(cred.user);
    setPass(cred.pass);
  };

  return (
    <div style={{
      minHeight:"100vh", position:"relative", zIndex:1,
      display:"grid", gridTemplateColumns:"1.1fr 1fr",
    }}>
      {/* Left — photograph only */}
      <div style={{
        position:"relative", overflow:"hidden",
        color:"#fffdf7",
        display:"flex", flexDirection:"column", justifyContent:"flex-end",
        padding:"60px 70px",
        backgroundColor: "#1a1410",
      }}>
        {/* photo background */}
        <img src="assets/login-bg.jpg" alt="" aria-hidden="true"
          style={{
            position:"absolute", inset:0, width:"100%", height:"100%",
            objectFit:"cover", objectPosition:"center",
          }}
        />
      </div>

      {/* Right — form */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:"60px 70px", background: "var(--bg)",
      }}>
        <div style={{width:"100%", maxWidth:420}} className="fade-up">
          <div style={{fontSize:12, color:"var(--amber)", letterSpacing:".14em", textTransform:"uppercase", fontWeight:600, marginBottom:12}}>
            Welcome back
          </div>
          <h2 className="font-display" style={{margin:0, fontSize:32, fontWeight:600, letterSpacing:"-0.02em"}}>
            ลงชื่อเข้าใช้งาน
          </h2>
          <p style={{marginTop:8, color:"var(--ink-3)", fontSize:14}}>
            ใช้รหัสที่ได้รับจากระบบเพื่อเข้าสู่ workspace ของคุณ
          </p>

          <form onSubmit={submit} style={{marginTop:28, display:"flex", flexDirection:"column", gap:16}}>
            <label className="field">
              <span>ชื่อผู้ใช้</span>
              <div style={{position:"relative"}}>
                <Icon name="user" size={16} style={{position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"var(--ink-3)"}}/>
                <input className="inp" value={user} onChange={e=>setUser(e.target.value)} placeholder="Branch / Area / QC / Admin" style={{paddingLeft:38}} autoFocus/>
              </div>
            </label>
            <label className="field">
              <span>รหัสผ่าน</span>
              <div style={{position:"relative"}}>
                <Icon name="lock" size={16} style={{position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"var(--ink-3)"}}/>
                <input className="inp" type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••" style={{paddingLeft:38}}/>
              </div>
            </label>

            {err && (
              <div style={{
                padding:"10px 14px", borderRadius:10,
                background:"rgba(176,70,52,.1)", color:"var(--bad)",
                fontSize:13, display:"flex", alignItems:"center", gap:8,
              }} className="fade-in">
                <Icon name="alert" size={14}/> {err}
              </div>
            )}

            <button type="submit" className="btn" disabled={loading} style={{padding:"14px 16px", justifyContent:"center", fontSize:15, marginTop:4, whiteSpace:"nowrap"}}>
              {loading ? (
                <span style={{display:"inline-flex", alignItems:"center", gap:8}}>
                  <span style={{width:14, height:14, border:"2px solid rgba(255,253,247,.3)", borderTopColor:"#fffdf7", borderRadius:"50%", animation:"spin 700ms linear infinite", display:"inline-block"}}/>
                  กำลังเข้าสู่ระบบ...
                </span>
              ) : (
                <>เข้าสู่ระบบ <Icon name="arrow-up" size={14} style={{transform:"rotate(90deg)"}}/></>
              )}
            </button>
          </form>

          <div style={{marginTop:32, paddingTop:22, borderTop:"1px solid var(--line)"}}>
            <button onClick={()=>setShowHint(s=>!s)}
              style={{background:"none", border:"none", padding:0, cursor:"pointer", display:"flex", alignItems:"center", gap:6, color:"var(--ink-3)", fontSize:13, fontFamily:"inherit"}}>
              <Icon name="sparkle" size={14}/>
              <span>{showHint?"ซ่อน":"แสดง"}บัญชี demo</span>
              <Icon name="chevron" size={14} style={{transform: showHint?"rotate(180deg)":"none", transition:"transform 200ms"}}/>
            </button>

            {showHint && (
              <div style={{marginTop:14, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}} className="fade-up">
                {DEMO_CREDS.map(c => (
                  <button key={c.user} type="button" onClick={()=>quickFill(c)}
                    style={{
                      textAlign:"left", padding:"12px 14px", borderRadius:12,
                      background:"var(--paper)", border:"1px solid var(--line)", cursor:"pointer",
                      transition:"all 140ms", fontFamily:"inherit",
                    }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--ink)";e.currentTarget.style.transform="translateY(-1px)";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--line)";e.currentTarget.style.transform="none";}}
                  >
                    <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:6}}>
                      <span style={{
                        width:24, height:24, borderRadius:6,
                        background: ROLE_DEFS[c.role].color,
                        color:"#fffdf7", display:"flex", alignItems:"center", justifyContent:"center",
                        fontWeight:600, fontSize:12, fontFamily:"Space Grotesk"
                      }}>{c.role[0]}</span>
                      <div style={{fontSize:13, fontWeight:500}}>{ROLE_DEFS[c.role].roleLabel}</div>
                    </div>
                    <div className="font-mono" style={{fontSize:11, color:"var(--ink-3)"}}>
                      {c.user} / {c.pass}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin{ to { transform: rotate(360deg);} }`}</style>
    </div>
  );
}

Object.assign(window, { LoginScreen, ROLE_DEFS, DEMO_CREDS });
