/* =========================================================
   BRANCH ROLE — production log, defect log, history
   ========================================================= */

function BranchView({user, store, refresh}){
  const [page, setPage] = useState("home");
  const branch = store.branches.find(b=>b.id===user.branchId);
  const myRecords = store.records.filter(r => r.branchId === user.branchId);

  const nav = [
    { key:"home",          label:"หน้าหลัก",         icon:"dashboard" },
    { key:"produce",       label:"บันทึกล็อตผลิต",     icon:"factory" },
    { key:"defect",        label:"บันทึกของเสียหาย",   icon:"alert" },
    { key:"history",       label:"ประวัติการผลิต",     icon:"history" },
    { key:"defectHistory", label:"ประวัติเสียหาย",      icon:"trash" },
  ];

  return (
    <AppShell user={user} onLogout={()=>window.__doLogout()} nav={nav} current={page} onNav={setPage}>
      {page==="home"          && <BranchHome user={user} branch={branch} records={myRecords} go={setPage}/>}
      {page==="produce"       && <BranchProduce user={user} store={store} refresh={refresh}/>}
      {page==="defect"        && <BranchDefect user={user} store={store} refresh={refresh}/>}
      {page==="history"       && <BranchHistory user={user} store={store} records={myRecords} refresh={refresh}/>}
      {page==="defectHistory" && <DefectHistoryPage records={myRecords} store={store}
                                  title="ประวัติเสียหายของสาขา" eyebrow="Defect History" showBranch={false} refresh={refresh}/>}
    </AppShell>
  );
}

/* ---------- Home ---------- */
function BranchHome({user, branch, records, go}){
  const today = todayISO();
  const todayProd = records.filter(r => r.type==="production" && r.date===today);
  const todayDef  = records.filter(r => r.type==="defect"     && r.date===today);
  const todayPass = todayProd.filter(r => r.status==="passed").length;
  const todayFail = todayProd.filter(r => r.status==="failed").length;
  const passRate  = todayProd.length ? Math.round(todayPass / todayProd.length * 100) : 0;

  // last 7 days trend
  const trend = useMemo(() => {
    const arr = [];
    for (let d=6; d>=0; d--){
      const day = new Date(); day.setDate(day.getDate()-d);
      const iso = day.toISOString().slice(0,10);
      arr.push(records.filter(r=>r.type==="production"&&r.date===iso).length);
    }
    return arr;
  }, [records]);

  const recent = records.slice().sort((a,b)=> (b.date+b.time).localeCompare(a.date+a.time)).slice(0,5);

  return (
    <>
      <PageHeader
        eyebrow={branch?.name}
        title={greetingTH() + ", " + user.label.split(" ")[0]}
        subtitle={`วันนี้ ${fmtDateTH(today)} · มาเริ่มบันทึกล็อตการผลิตของวันนี้กันเลย`}
        right={
          <div style={{display:"flex", gap:10}}>
            <button className="btn ghost" onClick={()=>go("history")}><Icon name="history" size={14}/> ดูประวัติ</button>
            <button className="btn amber" onClick={()=>go("produce")}><Icon name="plus" size={14}/> บันทึกล็อตใหม่</button>
          </div>
        }
      />

      <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:18, marginBottom:24}} className="fade-up">
        <StatCard label="ล็อตวันนี้"      value={todayProd.length} icon="factory" accent="var(--amber)"  trend={trend}/>
        <StatCard label="ผ่าน QC"        value={todayPass}       sub={`${passRate}% ของวันนี้`} icon="check" accent="var(--matcha)"/>
        <StatCard label="ไม่ผ่าน QC"     value={todayFail}        sub="ต้องแก้ไข" icon="alert"  accent="var(--bad)"/>
        <StatCard label="ของเสียหาย"     value={todayDef.length}  sub={`รวมทั้งหมด ${records.filter(r=>r.type==="defect").length} ครั้ง`} icon="trash" accent="var(--info)"/>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"2fr 1fr", gap:18}}>
        {/* Recent activity */}
        <div className="card" style={{padding:"22px 26px"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
            <h3 className="font-display" style={{margin:0, fontSize:18, fontWeight:600}}>กิจกรรมล่าสุด</h3>
            <button className="btn ghost sm" onClick={()=>go("history")}>ดูทั้งหมด</button>
          </div>
          {recent.length===0
            ? <Empty title="ยังไม่มีการบันทึก" subtitle="กดปุ่ม “บันทึกล็อตใหม่” เพื่อเริ่ม"/>
            : (
              <div style={{display:"flex", flexDirection:"column", gap:4}}>
                {recent.map((r,i)=><RecordRow key={r.id} r={r}/>)}
              </div>
            )}
        </div>

        {/* Quick actions */}
        <div className="card" style={{padding:"22px 26px"}}>
          <h3 className="font-display" style={{margin:"0 0 16px", fontSize:18, fontWeight:600}}>เริ่มทำงานวันนี้</h3>
          <div style={{display:"flex", flexDirection:"column", gap:10}}>
            <QuickAction onClick={()=>go("produce")} icon="factory" color="var(--amber)"
              title="บันทึกล็อตการผลิต" desc="เริ่มล็อตใหม่ของวันนี้"/>
            <QuickAction onClick={()=>go("defect")} icon="alert" color="var(--bad)"
              title="บันทึกของเสียหาย" desc="ลงทะเบียนของเสียจากการผลิต"/>
            <QuickAction onClick={()=>go("history")} icon="history" color="var(--info)"
              title="ดูประวัติย้อนหลัง" desc="ค้นหาล็อตที่เคยบันทึก"/>
          </div>
        </div>
      </div>
    </>
  );
}

function greetingTH(){
  const h = new Date().getHours();
  if (h<11) return "อรุณสวัสดิ์";
  if (h<14) return "สวัสดีตอนเที่ยง";
  if (h<17) return "สวัสดีตอนบ่าย";
  return "สวัสดีตอนเย็น";
}

function QuickAction({icon, color, title, desc, onClick}){
  return (
    <button onClick={onClick}
      style={{
        display:"flex", alignItems:"center", gap:14,
        padding:"14px 16px", borderRadius:12,
        background:"var(--bg)", border:"1px solid var(--line)",
        cursor:"pointer", fontFamily:"inherit", textAlign:"left",
        transition:"all 200ms",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ink)"; e.currentTarget.style.transform="translateX(4px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.transform="none"; }}
    >
      <div style={{
        width:40, height:40, borderRadius:10,
        background: `color-mix(in oklch, ${color} 18%, white)`,
        color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
      }}>
        <Icon name={icon} size={20}/>
      </div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:14, fontWeight:500, color:"var(--ink)"}}>{title}</div>
        <div style={{fontSize:12, color:"var(--ink-3)", marginTop:2}}>{desc}</div>
      </div>
      <Icon name="chevron" size={16} style={{transform:"rotate(-90deg)", color:"var(--ink-3)"}}/>
    </button>
  );
}

function RecordRow({r, showBranch}){
  const store = loadStore();
  const menu = store.menus.find(m=>m.id===r.menuId);
  const branch = showBranch ? store.branches.find(b=>b.id===r.branchId) : null;
  const isProd = r.type==="production";
  const passed = r.status==="passed";
  const dot = isProd ? (passed ? "var(--ok)" : "var(--bad)") : "var(--warn)";

  return (
    <div style={{
      display:"flex", alignItems:"center", gap:14,
      padding:"12px 6px", borderBottom:"1px solid var(--line)"
    }}>
      <div style={{width:34, height:34, borderRadius:8, background:`color-mix(in oklch, ${dot} 15%, white)`, color:dot, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
        <Icon name={isProd ? "factory" : "alert"} size={16}/>
      </div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:2}}>
          <span style={{fontSize:14, fontWeight:500, color:"var(--ink)"}}>{menu?.name}</span>
          {isProd ? (
            <span className={`badge ${passed?"ok":"bad"}`}><span className="dot"/>{passed ? "ผ่าน" : "ไม่ผ่าน"}</span>
          ) : (
            <span className="badge warn"><span className="dot"/>ของเสีย</span>
          )}
        </div>
        <div style={{fontSize:12, color:"var(--ink-3)"}}>
          <span className="font-mono">{r.id}</span> · {r.qty.toLocaleString()} {r.unit} · {r.time}
          {branch && <> · {branch.name}</>}
          {r.reason && <> · {r.reason}</>}
        </div>
      </div>
      <div style={{fontSize:12, color:"var(--ink-3)"}}>{fmtDateTH(r.date)}</div>
    </div>
  );
}

/* ---------- Produce — log a production batch ---------- */
function BranchProduce({user, store, refresh}){
  const toast = useToast();
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cat, setCat] = useState("all");

  function emptyForm(){
    return {
      status:"passed",
      reason:"",
      note:"",
      freezeTemp:"",
      timeMode:"now",
      date: todayISO(),
      time: nowHM(),
      materialLots:{},
      producer:"",
      tester:"",
    };
  }

  const categories = ["all", ...new Set(store.menus.map(m=>m.category))];
  const menus = cat==="all" ? store.menus : store.menus.filter(m=>m.category===cat);

  const bomLines = selected ? (store.bomProd?.[selected.id] || []) : [];
  const needsFreeze = selected && /ไข่มุกโมจิ/.test(selected.name);

  const pick = (m) => {
    setSelected(m);
    const lots = {};
    (store.bomProd?.[m.id]||[]).forEach(b => { lots[b.code] = ""; });
    setForm(f => ({
      ...f,
      materialLots: lots,
      freezeTemp: "",
    }));
  };

  const setLot = (code, val) => {
    setForm(f => ({ ...f, materialLots: {...f.materialLots, [code]: val} }));
  };

  const submit = () => {
    if (!selected) return toast("กรุณาเลือกเมนู", "bad");

    // material lots
    const missingLots = bomLines.filter(b => !form.materialLots[b.code] || !String(form.materialLots[b.code]).trim());
    if (missingLots.length){
      const ing = store.ingredients.find(i => i.code === missingLots[0].code);
      return toast(`กรุณากรอกล็อตของ ${ing?.name || missingLots[0].code}`, "bad");
    }

    // freeze temperature for ไข่มุกโมจิ
    if (needsFreeze){
      if (form.freezeTemp === "" || form.freezeTemp === null) return toast("กรุณาวัดอุณหภูมิแช่แข็งของไข่มุก", "bad");
      const t = Number(form.freezeTemp);
      if (!Number.isFinite(t)) return toast("อุณหภูมิไม่ถูกต้อง", "bad");
      if (t > -18) return toast(`อุณหภูมิต้อง ≤ -18°C (วัดได้ ${t}°C)`, "bad");
    }

    // date/time
    let date = todayISO(), time = nowHM();
    if (form.timeMode === "back"){
      if (!form.date || !form.time) return toast("กรอกวัน/เวลาบันทึกย้อนหลัง", "bad");
      if (form.date > todayISO()) return toast("วันที่ต้องไม่ใช่อนาคต", "bad");
      date = form.date; time = form.time;
    }

    if (form.status==="failed" && !form.reason) return toast("ระบุสาเหตุไม่ผ่าน", "bad");

    if (!form.producer.trim()) return toast("กรอกชื่อผู้ผลิต", "bad");
    if (!form.tester.trim())   return toast("กรอกชื่อผู้ทดสอบ", "bad");

    const id = `LOT-${date.replace(/-/g,"")}-${String(Math.floor(Math.random()*9000)+1000)}`;
    const rec = {
      id, type:"production",
      date, time,
      branchId: user.branchId, menuId: selected.id,
      qty: selected.yield, unit: selected.unit,
      status: form.status, reason: form.reason, note: form.note,
      materialLots: form.materialLots,
      freezeTemp: needsFreeze ? Number(form.freezeTemp) : null,
      backdated: form.timeMode === "back",
      producer: form.producer.trim(),
      tester: form.tester.trim(),
      by: user.label,
    };
    const s = loadStore();
    s.records.unshift(rec);
    saveStore(s); refresh();
    toast(`บันทึก ${rec.id} สำเร็จ`, "ok");
    setSelected(null);
    setForm(emptyForm());
    setConfirmOpen(false);
  };

  return (
    <>
      <PageHeader
        eyebrow="Production Log"
        title="บันทึกล็อตการผลิต"
        subtitle="เลือกเมนูที่ผลิต กรอกรายละเอียด แล้วบันทึกเข้าระบบ"
      />

      <div style={{maxWidth:760, margin:"0 auto"}} className="fade-up">
        {/* Unified form card */}
        <div className="card" style={{padding:"28px 30px"}}>
          <h3 className="font-display" style={{margin:"0 0 18px", fontSize:20, fontWeight:600}}>รายละเอียดการผลิต</h3>

          {/* Menu selection — at top */}
          <div style={{marginBottom:20, paddingBottom:20, borderBottom:"1px solid var(--line)"}}>
            <div style={{fontSize:12, color:"var(--ink-3)", fontWeight:500, letterSpacing:".02em", textTransform:"uppercase", marginBottom:10}}>เลือกเมนูที่ผลิต</div>

            {/* Category tabs — single row */}
            <div style={{
              display:"flex", gap:0, marginBottom:14,
              padding:4, background:"var(--bg-2)", border:"1px solid var(--line)",
              borderRadius:99, overflow:"hidden",
            }}>
              {categories.map(c => (
                <button key={c} onClick={()=>setCat(c)}
                  style={{
                    flex:1, padding:"9px 12px", borderRadius:99, border:"none",
                    background: cat===c ? "var(--paper)" : "transparent",
                    color: cat===c ? "var(--ink)" : "var(--ink-3)",
                    boxShadow: cat===c ? "var(--shadow-sm)" : "none",
                    fontFamily:"inherit", fontSize:13, fontWeight: cat===c ? 600 : 500,
                    cursor:"pointer", transition:"all 140ms", whiteSpace:"nowrap",
                  }}>
                  {c==="all"?"ทั้งหมด":c}
                </button>
              ))}
            </div>

            {/* Dropdown */}
            <select className="inp"
              value={selected?.id || ""}
              onChange={e => {
                const m = store.menus.find(x => x.id === e.target.value);
                if (m) pick(m);
                else setSelected(null);
              }}
              style={{fontSize:15, padding:"14px"}}>
              <option value="">— เลือกเมนู —</option>
              {menus.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {selected ? (
            <div style={{display:"flex", flexDirection:"column", gap:18}}>
              {/* BOM material lots */}
              <div>
                <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8}}>
                  <span style={{fontSize:12, color:"var(--ink-3)", fontWeight:500, letterSpacing:".02em", textTransform:"uppercase"}}>วัตถุดิบ &amp; ล็อต</span>
                  {bomLines.length > 0 && <span className="badge"><span className="dot"/>{bomLines.length} รายการ</span>}
                </div>
                {bomLines.length === 0 ? (
                  <div style={{
                    padding:"12px 14px", borderRadius:10,
                    background:"rgba(201,138,60,.08)", border:"1px dashed var(--line-2)",
                    fontSize:13, color:"var(--ink-3)", display:"flex", gap:8, alignItems:"flex-start"
                  }}>
                    <Icon name="alert" size={14} style={{marginTop:2, color:"var(--warn)"}}/>
                    <div>
                      ยังไม่มี BOM ผูกกับเมนูนี้ — แจ้ง Admin เพื่อผูกวัตถุดิบ <br/>
                      <span style={{color:"var(--ink-3)"}}>สามารถบันทึกล็อตต่อได้ แต่ไม่มี traceability วัตถุดิบ</span>
                    </div>
                  </div>
                ) : (
                  <div style={{display:"flex", flexDirection:"column", gap:8}}>
                    {bomLines.map(b => {
                      const ing = store.ingredients.find(i=>i.code===b.code);
                      const filled = !!(form.materialLots[b.code] || "").trim();
                      return (
                        <div key={b.code} style={{
                          display:"grid", gridTemplateColumns:"1fr 180px", gap:10, alignItems:"center",
                          padding:"10px 14px", borderRadius:10,
                          background: filled ? "var(--paper)" : "var(--bg)",
                          border:`1px solid ${filled ? "var(--line)" : "var(--line-2)"}`,
                          transition:"all 140ms",
                        }}>
                          <div style={{fontSize:14, fontWeight:500, color:"var(--ink)", lineHeight:1.3, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                            {ing?.name || b.code}
                          </div>
                          <input
                            className="inp"
                            style={{padding:"8px 12px", fontSize:13, fontFamily:"JetBrains Mono, monospace"}}
                            placeholder="ล็อตวัตถุดิบ"
                            value={form.materialLots[b.code] || ""}
                            onChange={e=>setLot(b.code, e.target.value)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Freeze temp for ไข่มุกโมจิ */}
              {needsFreeze && (() => {
                const t = Number(form.freezeTemp);
                const hasVal = form.freezeTemp !== "" && form.freezeTemp !== null;
                const isOK = hasVal && Number.isFinite(t) && t <= -18;
                return (
                  <label className="field fade-up">
                    <span>อุณหภูมิแช่แข็งไข่มุก (ต้อง ≤ -18°C)</span>
                    <div style={{position:"relative"}}>
                      <input type="number" step="0.1" className="inp"
                        value={form.freezeTemp}
                        onChange={e=>setForm({...form, freezeTemp:e.target.value})}
                        placeholder="-18.0"
                        style={{
                          paddingRight:80,
                          fontFamily:"Space Grotesk",
                          borderColor: !hasVal ? "var(--line-2)" : (isOK ? "var(--ok)" : "var(--bad)"),
                          background: !hasVal ? "var(--paper)" : (isOK ? "rgba(78,124,58,.05)" : "rgba(176,70,52,.05)"),
                        }}
                      />
                      <span style={{position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", fontSize:13, color:"var(--ink-3)", display:"flex", alignItems:"center", gap:6}}>
                        °C
                        {hasVal && (
                          isOK
                            ? <Icon name="check" size={14} style={{color:"var(--ok)"}}/>
                            : <Icon name="alert" size={14} style={{color:"var(--bad)"}}/>
                        )}
                      </span>
                    </div>
                    {hasVal && !isOK && (
                      <div style={{fontSize:12, color:"var(--bad)", marginTop:6, display:"flex", alignItems:"center", gap:6}}>
                        <Icon name="alert" size={12}/>
                        อุณหภูมิสูงเกินไป — ไข่มุกต้องแช่แข็ง ≤ -18°C
                      </div>
                    )}
                  </label>
                );
              })()}

              {/* Time mode */}
              <label className="field">
                <span>เวลาบันทึก</span>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
                  {[
                    {v:"now",  l:"บันทึกทันที",   ic:"sparkle"},
                    {v:"back", l:"บันทึกย้อนหลัง", ic:"history"},
                  ].map(o=>(
                    <button key={o.v} onClick={()=>setForm({...form, timeMode:o.v, date: todayISO(), time: nowHM()})}
                      style={{
                        padding:"10px", borderRadius:10, cursor:"pointer", fontFamily:"inherit",
                        background: form.timeMode===o.v ? "var(--ink)" : "var(--paper)",
                        color: form.timeMode===o.v ? "#fffdf7" : "var(--ink)",
                        border: `1px solid ${form.timeMode===o.v ? "var(--ink)" : "var(--line-2)"}`,
                        display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                        fontWeight:500, fontSize:13, transition:"all 140ms",
                      }}>
                      <Icon name={o.ic} size={14}/> {o.l}
                    </button>
                  ))}
                </div>
                {form.timeMode === "now" ? (
                  <div style={{marginTop:8, padding:"8px 12px", background:"var(--bg)", borderRadius:8, fontSize:12, color:"var(--ink-3)", display:"flex", alignItems:"center", gap:8}}>
                    <Icon name="calendar" size={12}/>
                    <span>จะใช้เวลา <span className="num" style={{color:"var(--ink-2)", fontWeight:500}}>{fmtDateTH(todayISO())} · {nowHM()}</span></span>
                  </div>
                ) : (
                  <div style={{marginTop:8, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}} className="fade-up">
                    <input type="date" className="inp" value={form.date} max={todayISO()} onChange={e=>setForm({...form, date:e.target.value})}/>
                    <input type="time" className="inp" value={form.time} onChange={e=>setForm({...form, time:e.target.value})}/>
                  </div>
                )}
              </label>

              <label className="field">
                <span>ผลการเทสชิม</span>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
                  {[
                    {v:"passed", l:"ผ่าน",     c:"var(--ok)"},
                    {v:"failed", l:"ไม่ผ่าน",  c:"var(--bad)"},
                  ].map(o=>(
                    <button key={o.v} onClick={()=>setForm({...form, status:o.v})}
                      style={{
                        padding:"12px", borderRadius:10, cursor:"pointer", fontFamily:"inherit",
                        background: form.status===o.v ? o.c : "var(--paper)",
                        color: form.status===o.v ? "#fffdf7" : "var(--ink)",
                        border: `1px solid ${form.status===o.v ? o.c : "var(--line-2)"}`,
                        display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                        fontWeight:500, transition:"all 140ms",
                      }}>
                      <Icon name={o.v==="passed"?"check":"x"} size={14}/> {o.l}
                    </button>
                  ))}
                </div>
              </label>

              {form.status==="failed" && (
                <label className="field fade-up">
                  <span>สาเหตุที่ไม่ผ่าน</span>
                  <select className="inp" value={form.reason} onChange={e=>setForm({...form, reason:e.target.value})}>
                    <option value="">— เลือก —</option>
                    {FAIL_REASONS.map(r=> <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
              )}

              {/* Producer + Tester */}
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
                <label className="field">
                  <span>ผู้ผลิต</span>
                  <div style={{position:"relative"}}>
                    <Icon name="user" size={14} style={{position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"var(--ink-3)"}}/>
                    <input className="inp" value={form.producer} onChange={e=>setForm({...form, producer:e.target.value})} placeholder="ชื่อผู้ผลิตล็อตนี้" style={{paddingLeft:34}}/>
                  </div>
                </label>
                <label className="field">
                  <span>ผู้ทดสอบ</span>
                  <div style={{position:"relative"}}>
                    <Icon name="user" size={14} style={{position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"var(--ink-3)"}}/>
                    <input className="inp" value={form.tester} onChange={e=>setForm({...form, tester:e.target.value})} placeholder="ชื่อผู้ทดสอบชิม" style={{paddingLeft:34}}/>
                  </div>
                </label>
              </div>

              <label className="field">
                <span>หมายเหตุ (ไม่บังคับ)</span>
                <textarea className="inp" rows={2} value={form.note} onChange={e=>setForm({...form, note:e.target.value})} placeholder="รายละเอียดเพิ่มเติม..."/>
              </label>

              <button className="btn amber" style={{justifyContent:"center", padding:"14px"}} onClick={()=>setConfirmOpen(true)}>
                <Icon name="check" size={14}/> บันทึกล็อตการผลิต
              </button>
            </div>
          ) : (
            <Empty icon="cup" title="ยังไม่ได้เลือกเมนู" subtitle="เลือกหมวดและเมนูด้านบนเพื่อเริ่ม"/>
          )}
        </div>
      </div>

      <Modal open={confirmOpen} onClose={()=>setConfirmOpen(false)} title="ยืนยันบันทึกล็อต" width={620}
        footer={
          <>
            <button className="btn ghost" onClick={()=>setConfirmOpen(false)}>ยกเลิก</button>
            <button className="btn amber" onClick={submit}><Icon name="check" size={14}/> ยืนยัน</button>
          </>
        }>
        <div style={{display:"flex", flexDirection:"column", gap:10, fontSize:14}}>
          <Row label="เมนู" value={selected?.name}/>
          {needsFreeze && <Row label="อุณหภูมิแช่แข็ง" value={`${form.freezeTemp} °C`}/>}
          <Row label="ผลการเทสชิม" value={form.status==="passed" ? "ผ่าน" : `ไม่ผ่าน (${form.reason})`}/>
          <Row label="ผู้ผลิต" value={form.producer}/>
          <Row label="ผู้ทดสอบ" value={form.tester}/>
          <Row label="เวลา" value={
            form.timeMode==="back"
              ? `${fmtDateTH(form.date)} · ${form.time} (ย้อนหลัง)`
              : `${fmtDateTH(todayISO())} · ${nowHM()}`
          }/>
          <Row label="บันทึกโดย" value={user.label}/>

          {bomLines.length > 0 && (
            <div style={{marginTop:6}}>
              <div style={{fontSize:11, color:"var(--ink-3)", letterSpacing:".06em", textTransform:"uppercase", marginBottom:8, fontWeight:500}}>ล็อตวัตถุดิบที่ใช้</div>
              <div style={{display:"flex", flexDirection:"column", gap:6}}>
                {bomLines.map(b => {
                  const ing = store.ingredients.find(i=>i.code===b.code);
                  return (
                    <div key={b.code} style={{display:"flex", justifyContent:"space-between", padding:"8px 12px", background:"var(--bg)", borderRadius:8, fontSize:13}}>
                      <span style={{color:"var(--ink-2)"}}>{ing?.name || b.code}</span>
                      <span className="font-mono" style={{color:"var(--ink)", fontWeight:500}}>{form.materialLots[b.code] || "—"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

function Row({label, value}){
  return (
    <div style={{display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px dashed var(--line)"}}>
      <span style={{color:"var(--ink-3)"}}>{label}</span>
      <span style={{fontWeight:500}}>{value}</span>
    </div>
  );
}

/* ---------- Defect log ---------- */
function BranchDefect({user, store, refresh}){
  const toast = useToast();
  const [items, setItems] = useState([{ menuId:"", grams:"" }]);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const updateItem = (i, patch) => setItems(arr => arr.map((it,idx)=> idx===i ? {...it, ...patch} : it));
  const addRow = () => setItems(arr => [...arr, { menuId:"", grams:"" }]);
  const removeRow = (i) => setItems(arr => arr.length>1 ? arr.filter((_,idx)=>idx!==i) : arr);

  /* ---- material breakdown calculation (still used at submit time) ----
     For each item: contribution_per_material = (grams / batchYield) × bomQty */

  const totalGrams = items.reduce((s, it) => s + Number(it.grams||0), 0);
  const validRows = items.filter(it => it.menuId && Number(it.grams||0) > 0);

  const submit = () => {
    if (validRows.length === 0) return toast("กรุณาเพิ่มอย่างน้อย 1 เมนูพร้อมจำนวนกรัม", "bad");
    if (!reason) return toast("ระบุสาเหตุ", "bad");

    const s = loadStore();
    const baseDate = todayISO();
    const baseTime = nowHM();
    const newRecs = validRows.map((it, idx) => {
      const menu = store.menus.find(m => m.id === it.menuId);
      const bom = store.bomDefect?.[menu.id] || [];
      const grams = Number(it.grams);
      // bomDefect qty is per gram of product (e.g. 0.001 bag/g)
      // material qty = defect grams × bom qty
      const matBreakdown = bom.map(b => {
        const ing = store.ingredients.find(i => i.code === b.code);
        return {
          code: b.code,
          name: ing?.name || b.code,
          unit: ing?.unit || "",
          qty: grams * b.qty,
        };
      });
      return {
        id: `DEF-${baseDate.replace(/-/g,"")}-${String(Math.floor(Math.random()*9000)+1000+idx)}`,
        type:"defect",
        date: baseDate, time: baseTime,
        branchId: user.branchId, menuId: menu.id,
        qty: grams, unit: "กรัม",
        reason, note, materialBreakdown: matBreakdown,
        by: user.label,
      };
    });
    s.records = [...newRecs, ...s.records];
    saveStore(s); refresh();
    toast(`บันทึกของเสีย ${newRecs.length} รายการ`, "warn");
    setItems([{ menuId:"", grams:"" }]);
    setReason(""); setNote("");
  };

  const todayDefects = store.records.filter(r => r.branchId===user.branchId && r.type==="defect" && r.date===todayISO());

  return (
    <>
      <PageHeader
        eyebrow="Defect Log"
        title="บันทึกของเสียหาย"
        subtitle="ลงบันทึกของเสียจากการผลิต — กรอกเป็นกรัม ระบบจะคำนวณวัตถุดิบที่เสียให้อัตโนมัติ"
      />

      <div style={{display:"grid", gridTemplateColumns:"1.2fr 1fr", gap:22}} className="fade-up">
        {/* form */}
        <div className="card" style={{padding:"24px 26px"}}>
          <h3 className="font-display" style={{margin:"0 0 18px", fontSize:18, fontWeight:600}}>กรอกข้อมูลของเสีย</h3>

          {/* multi-row item list */}
          <div style={{display:"flex", flexDirection:"column", gap:10, marginBottom:14}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <span style={{fontSize:12, color:"var(--ink-3)", fontWeight:500, letterSpacing:".02em", textTransform:"uppercase"}}>รายการเมนูที่เสีย</span>
              <span style={{fontSize:12, color:"var(--ink-3)"}}>รวม <span className="num" style={{color:"var(--ink)", fontWeight:500}}>{fmtNum(totalGrams)}</span> กรัม</span>
            </div>
            {items.map((it,i) => (
              <div key={i} style={{display:"grid", gridTemplateColumns:"1fr 140px 36px", gap:8, alignItems:"center"}}>
                <select className="inp" value={it.menuId} onChange={e=>updateItem(i,{menuId:e.target.value})}>
                  <option value="">— เลือกเมนู —</option>
                  {store.menus.map(m=> <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <div style={{position:"relative"}}>
                  <input type="number" className="inp" value={it.grams} onChange={e=>updateItem(i,{grams:e.target.value})} placeholder="0" style={{paddingRight:36, fontFamily:"Space Grotesk", textAlign:"right"}}/>
                  <span style={{position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", fontSize:12, color:"var(--ink-3)"}}>กรัม</span>
                </div>
                <button className="btn ghost sm" onClick={()=>removeRow(i)} disabled={items.length===1} title="ลบแถว"
                        style={{padding:"7px 10px"}}>
                  <Icon name="x" size={12}/>
                </button>
              </div>
            ))}
            <button className="btn ghost sm" onClick={addRow} style={{alignSelf:"flex-start"}}>
              <Icon name="plus" size={12}/> เพิ่มเมนู
            </button>
          </div>

          {/* Reason + note */}
          <label className="field" style={{marginBottom:14, marginTop:6}}>
            <span>สาเหตุของเสีย</span>
            <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
              {DEFECT_REASONS.map(r => (
                <button key={r} className={`chip ${reason===r?"active":""}`} onClick={()=>setReason(r)}>
                  {r}
                </button>
              ))}
            </div>
          </label>

          <label className="field" style={{marginBottom:14}}>
            <span>หมายเหตุ</span>
            <textarea className="inp" rows={2} value={note} onChange={e=>setNote(e.target.value)} placeholder="คำอธิบายเพิ่มเติม..."/>
          </label>

          <button className="btn danger" style={{justifyContent:"center", padding:"14px", width:"100%"}} onClick={submit}>
            <Icon name="alert" size={14}/> บันทึกของเสีย {validRows.length>0 && `(${validRows.length} รายการ)`}
          </button>
        </div>

        <div className="card" style={{padding:"24px 26px"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
            <h3 className="font-display" style={{margin:0, fontSize:18, fontWeight:600}}>วันนี้</h3>
            <span className="badge warn"><span className="dot"/>{todayDefects.length} รายการ</span>
          </div>
          {todayDefects.length===0
            ? <Empty icon="check" title="ยังไม่มีของเสียวันนี้" subtitle="ผลิตได้สะอาดเรียบร้อย 🍵"/>
            : (
              <div style={{display:"flex", flexDirection:"column", gap:4}}>
                {todayDefects.map(r => <RecordRow key={r.id} r={r}/>)}
              </div>
            )}
        </div>
      </div>
    </>
  );
}

/* ---------- History ---------- */
function BranchHistory({user, store, records, refresh}){
  return (
    <>
      <PageHeader eyebrow="History" title="ประวัติการผลิต" subtitle="ดูประวัติการผลิตของสาขา · ลบ / Export ได้"/>
      <HistoryView mode="production" records={records} store={store}
        sectionTitle="ประวัติการผลิต" sectionIcon="factory" showBranch={false}
        refresh={refresh}/>
    </>
  );
}

/* ---------- DefectHistoryPage — 2 features: by-menu and by-material ---------- */
function DefectHistoryPage({records, store, title, eyebrow, showBranch=true, showBranchFilter=false, refresh}){
  const [view, setView] = useState("menu"); // 'menu' | 'material'

  // narrow to defect records only
  const defectRecords = useMemo(() => records.filter(r => r.type==="defect"), [records]);

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle="แยกดู 2 มุมมอง — ปริมาณเบสรายเมนู (กรัม) และวัตถุดิบที่เสียหายจริงตาม BOM"
      />

      {/* tab switcher */}
      <div style={{
        display:"inline-flex", padding:4, background:"var(--bg-2)", border:"1px solid var(--line)",
        borderRadius:99, marginBottom:20, gap:0,
      }}>
        {[
          {k:"menu",     l:"ประวัติเสียหายปริมาณเบส",  ic:"alert"},
          {k:"material", l:"เสียหายรายวัตถุดิบ",       ic:"box"},
        ].map(t => (
          <button key={t.k} onClick={()=>setView(t.k)}
            style={{
              padding:"10px 18px", borderRadius:99, border:"none", cursor:"pointer", fontFamily:"inherit",
              background: view===t.k ? "var(--paper)" : "transparent",
              color: view===t.k ? "var(--ink)" : "var(--ink-3)",
              boxShadow: view===t.k ? "var(--shadow-sm)" : "none",
              fontSize:14, fontWeight: view===t.k ? 600 : 500,
              display:"inline-flex", alignItems:"center", gap:8,
              transition:"all 140ms", whiteSpace:"nowrap",
            }}>
            <Icon name={t.ic} size={14}/>
            {t.l}
          </button>
        ))}
      </div>

      {view==="menu" && (
        <HistoryView mode="defect" records={records} store={store}
          sectionTitle="ประวัติเสียหายปริมาณเบส (กรัม)"
          sectionIcon="alert"
          showBranch={showBranch} showBranchFilter={showBranchFilter}
          refresh={refresh}/>
      )}

      {view==="material" && (
        <DefectByMaterial records={defectRecords} store={store}
          showBranchFilter={showBranchFilter}/>
      )}
    </>
  );
}

/* ---------- Aggregated defect by material ---------- */
function DefectByMaterial({records, store, showBranchFilter}){
  const toast = useToast();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState(() => todayISO());
  const [to, setTo] = useState(() => todayISO());
  const [branchFilter, setBranchFilter] = useState("all");

  const filteredRecs = useMemo(() => {
    return records.filter(r => {
      if (from && r.date < from) return false;
      if (to && r.date > to) return false;
      if (showBranchFilter && branchFilter !== "all" && r.branchId !== branchFilter) return false;
      return true;
    });
  }, [records, from, to, branchFilter, showBranchFilter]);

  // Aggregate by material — recompute from current BOM
  // (BOM qty is per gram of product, so material qty = defect_grams × bom_qty)
  const breakdown = useMemo(() => {
    const map = {};
    filteredRecs.forEach(r => {
      const menu = store.menus.find(m => m.id === r.menuId);
      if (!menu) return;
      const bom = store.bomDefect?.[menu.id] || [];
      const grams = r.qty || 0;
      bom.forEach(b => {
        const used = grams * b.qty;
        if (!map[b.code]){
          const ing = store.ingredients.find(i => i.code === b.code);
          map[b.code] = { code: b.code, name: ing?.name || b.code, unit: ing?.unit || "", qty: 0, occurrences: 0, totalGrams: 0 };
        }
        map[b.code].qty += used;
        map[b.code].occurrences += 1;
        map[b.code].totalGrams += grams;
      });
    });
    let rows = Object.values(map);
    if (q){
      const ql = q.toLowerCase();
      rows = rows.filter(x => (x.code + " " + x.name).toLowerCase().includes(ql));
    }
    return rows.sort((a,b)=> b.qty - a.qty);
  }, [filteredRecs, store, q]);

  const totalGrams = filteredRecs.reduce((s,r)=> s + (r.qty||0), 0);

  const onExport = () => {
    const head = ["รหัสสินค้า","ชื่อวัตถุดิบ","ปริมาณรวม","หน่วย","จำนวนครั้งที่เกี่ยวข้อง","รวมกรัมเบส"];
    const rows = [head, ...breakdown.map(b => [b.code, b.name, b.qty.toFixed(2), b.unit, b.occurrences, b.totalGrams.toFixed(0)])];
    const csv = "\uFEFF" + rows.map(r => r.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `defect-by-material-${todayISO()}.csv`; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    toast("Export เรียบร้อย", "ok");
  };

  return (
    <>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:14, gap:14, flexWrap:"wrap"}}>
        <div style={{display:"flex", alignItems:"center", gap:12}}>
          <div style={{
            width:38, height:38, borderRadius:10,
            background:"color-mix(in oklch, var(--bad) 16%, white)",
            color:"var(--bad)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <Icon name="box" size={18}/>
          </div>
          <div>
            <h2 className="font-display" style={{margin:0, fontSize:22, fontWeight:600, letterSpacing:"-0.01em"}}>เสียหายรายวัตถุดิบ</h2>
            <div style={{fontSize:13, color:"var(--ink-3)", marginTop:2}}>
              <span className="num">{breakdown.length}</span> วัตถุดิบ · จาก <span className="num">{filteredRecs.length}</span> ครั้ง · เบสรวม <span className="num">{fmtNum(totalGrams)}</span> กรัม
            </div>
          </div>
        </div>
        <button className="btn ghost" onClick={onExport} disabled={breakdown.length===0}>
          <Icon name="arrow-down" size={14}/> Export CSV
        </button>
      </div>

      <div style={{display:"grid", gridTemplateColumns: showBranchFilter ? "1fr 200px 160px 160px auto" : "1fr 160px 160px auto", gap:10, marginBottom:14}}>
        <SearchBox value={q} onChange={setQ} placeholder="ค้นหารหัส หรือชื่อวัตถุดิบ..."/>
        {showBranchFilter && (
          <select className="inp" value={branchFilter} onChange={e=>setBranchFilter(e.target.value)}>
            <option value="all">ทุกสาขา</option>
            {store.branches.map(b=> <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <input type="date" className="inp" value={from} onChange={e=>setFrom(e.target.value)}/>
        <input type="date" className="inp" value={to} onChange={e=>setTo(e.target.value)}/>
        <DateQuickPresets setFrom={setFrom} setTo={setTo}/>
      </div>

      <div className="card" style={{overflow:"hidden"}}>
        {breakdown.length===0
          ? <Empty icon="check" title="ยังไม่มีของเสียในช่วงนี้" subtitle="ลองปรับช่วงวันที่หรือเช็คตัวกรอง"/>
          : (
            <table className="t">
              <thead>
                <tr>
                  <th>รหัสสินค้า</th>
                  <th>ชื่อวัตถุดิบ</th>
                  <th style={{textAlign:"right"}}>จำนวนที่เสียหาย</th>
                  <th style={{textAlign:"right"}}>จำนวนครั้ง</th>
                  <th style={{textAlign:"right"}}>รวมเบส (กรัม)</th>
                  <th style={{width:120}}>สัดส่วน</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((b, i) => {
                  const max = breakdown[0]?.qty || 1;
                  return (
                    <tr key={b.code}>
                      <td className="font-mono" style={{fontSize:13, color:"var(--ink)"}}>{b.code}</td>
                      <td style={{fontWeight:500}}>{b.name}</td>
                      <td className="num" style={{textAlign:"right", color:"var(--bad)", fontWeight:600, fontSize:15, fontFamily:"Space Grotesk"}}>
                        {b.qty.toFixed(2)} <span style={{fontSize:12, color:"var(--ink-3)", fontWeight:400}}>{b.unit}</span>
                      </td>
                      <td className="num" style={{textAlign:"right", color:"var(--ink-2)"}}>{b.occurrences}</td>
                      <td className="num" style={{textAlign:"right", color:"var(--ink-3)"}}>{fmtNum(b.totalGrams.toFixed(0))}</td>
                      <td>
                        <div className="bar"><i style={{width:`${(b.qty/max)*100}%`, background:"var(--bad)"}}/></div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
      </div>
    </>
  );
}

/* ---------- Split history (production-only now, used by Area/QC/Admin) ---------- */
function SplitHistoryPage({records, store, title, eyebrow, showBranch, showBranchFilter, refresh}){
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} subtitle="ประวัติการผลิต · ลบและ Export ได้"/>
      <HistoryView mode="production" records={records} store={store}
        sectionTitle="ประวัติการผลิต" sectionIcon="factory"
        showBranch={showBranch} showBranchFilter={showBranchFilter} refresh={refresh}/>
    </>
  );
}

/* ---------- Shared HistoryView (single section) ---------- */
function HistoryView({records, store, sectionTitle, sectionIcon="history", mode="all",
                       showBranch=true, showBranchFilter=false, refresh,
                       title, eyebrow}){
  const toast = useToast();
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState(() => todayISO());
  const [to, setTo] = useState(() => todayISO());
  const [branchFilter, setBranchFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // narrow by mode first
  const scopedRecords = useMemo(() => {
    if (mode==="production") return records.filter(r => r.type==="production");
    if (mode==="defect")     return records.filter(r => r.type==="defect");
    return records;
  }, [records, mode]);

  const filtered = useMemo(() => {
    return scopedRecords.filter(r => {
      if (mode==="production"){
        if (tab==="passed" && r.status!=="passed") return false;
        if (tab==="failed" && r.status!=="failed") return false;
      }
      if (q){
        const menu = store.menus.find(m=>m.id===r.menuId)?.name || "";
        const branch = store.branches.find(b=>b.id===r.branchId)?.name || "";
        const lots = r.materialLots ? Object.values(r.materialLots).join(" ") : "";
        const hay = (r.id + " " + menu + " " + branch + " " + (r.reason||"") + " " + (r.producer||"") + " " + (r.tester||"") + " " + lots + " " + (r.note||"")).toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (from && r.date < from) return false;
      if (to && r.date > to) return false;
      if (showBranchFilter && branchFilter!=="all" && r.branchId !== branchFilter) return false;
      return true;
    }).sort((a,b)=> (b.date+b.time).localeCompare(a.date+a.time));
  }, [scopedRecords, tab, q, from, to, branchFilter, store, showBranchFilter, mode]);

  const counts = useMemo(() => {
    if (mode==="production"){
      return {
        all:    scopedRecords.length,
        passed: scopedRecords.filter(r => r.status==="passed").length,
        failed: scopedRecords.filter(r => r.status==="failed").length,
      };
    }
    return { all: scopedRecords.length };
  }, [scopedRecords, mode]);

  const onDelete = (rec) => {
    const s = loadStore();
    s.records = s.records.filter(r => r.id !== rec.id);
    saveStore(s);
    refresh && refresh();
    toast(`ลบ ${rec.id} แล้ว`, "ok");
    setDeleteTarget(null);
  };

  const onExport = () => {
    const csv = exportRecordsCSV(filtered, store, mode);
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mode==="defect"?"defects":"production"}-${todayISO()}.csv`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    toast(`Export ${filtered.length} แถว`, "ok");
  };

  const tabs = mode==="production" ? [
    {k:"all",    l:"ทั้งหมด",    n:counts.all,    c:"var(--ink)"},
    {k:"passed", l:"ผ่าน",       n:counts.passed, c:"var(--ok)"},
    {k:"failed", l:"ไม่ผ่าน",     n:counts.failed, c:"var(--bad)"},
  ] : null;

  const accent = mode==="defect" ? "var(--warn)" : "var(--amber)";

  return (
    <>
      {(title || eyebrow) && <PageHeader eyebrow={eyebrow} title={title}/>}

      {/* Section header */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:14, gap:14, flexWrap:"wrap"}}>
        <div style={{display:"flex", alignItems:"center", gap:12}}>
          <div style={{
            width:38, height:38, borderRadius:10,
            background: `color-mix(in oklch, ${accent} 16%, white)`,
            color: accent,
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <Icon name={sectionIcon} size={18}/>
          </div>
          <div>
            <h2 className="font-display" style={{margin:0, fontSize:22, fontWeight:600, letterSpacing:"-0.01em"}}>{sectionTitle}</h2>
            <div style={{fontSize:13, color:"var(--ink-3)", marginTop:2}}>
              <span className="num">{filtered.length}</span> รายการที่แสดง · จากทั้งหมด <span className="num">{scopedRecords.length}</span>
            </div>
          </div>
        </div>
        <button className="btn ghost" onClick={onExport} disabled={filtered.length===0}>
          <Icon name="arrow-down" size={14}/> Export CSV
        </button>
      </div>

      {tabs && (
        <div className="card" style={{padding:"6px", marginBottom:14, display:"flex", gap:6, flexWrap:"wrap", alignItems:"center"}}>
          {tabs.map(t => (
            <button key={t.k} onClick={()=>setTab(t.k)}
              style={{
                padding:"9px 16px", borderRadius:99, border:"none", cursor:"pointer",
                background: tab===t.k ? t.c : "transparent",
                color: tab===t.k ? "#fffdf7" : "var(--ink-2)",
                fontFamily:"inherit", fontSize:13, fontWeight: tab===t.k ? 600 : 500,
                display:"inline-flex", alignItems:"center", gap:8,
                transition:"all 140ms",
              }}>
              {t.l}
              <span className="num" style={{
                padding:"1px 8px", borderRadius:99, fontSize:11,
                background: tab===t.k ? "rgba(255,253,247,.2)" : "var(--bg-2)",
                color: tab===t.k ? "#fffdf7" : "var(--ink-3)"
              }}>{t.n}</span>
            </button>
          ))}
        </div>
      )}

      <div style={{display:"grid", gridTemplateColumns: showBranchFilter ? "1fr 200px 160px 160px auto" : "1fr 160px 160px auto", gap:10, marginBottom:14}}>
        <SearchBox value={q} onChange={setQ} placeholder="ค้นหาล็อตวัตถุดิบ, ID, เมนู, ผู้ผลิต..."/>
        {showBranchFilter && (
          <select className="inp" value={branchFilter} onChange={e=>setBranchFilter(e.target.value)}>
            <option value="all">ทุกสาขา</option>
            {store.branches.map(b=> <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <input type="date" className="inp" value={from} onChange={e=>setFrom(e.target.value)}/>
        <input type="date" className="inp" value={to} onChange={e=>setTo(e.target.value)}/>
        <DateQuickPresets setFrom={setFrom} setTo={setTo}/>
      </div>

      <div className="card" style={{overflow:"hidden"}}>
        {filtered.length === 0
          ? <Empty icon="search" title="ไม่พบข้อมูล" subtitle="ลองปรับตัวกรองหรือช่วงวันที่"/>
          : (
            <div style={{overflowX:"auto"}}>
              <table className="t">
                <thead>
                  <tr>
                    <th style={{width:28}}></th>
                    <th>ID</th>
                    <th>วันที่ / เวลา</th>
                    {showBranch && <th>สาขา</th>}
                    <th>เมนู</th>
                    <th>ปริมาณ</th>
                    {mode==="production" && <th>ผล</th>}
                    <th>{mode==="defect" ? "สาเหตุ / วัตถุดิบ" : "หมายเหตุ"}</th>
                    {refresh && <th style={{width:60}}></th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0,200).map(r=>{
                    const m = store.menus.find(x=>x.id===r.menuId);
                    const b = store.branches.find(x=>x.id===r.branchId);
                    const isProd = r.type==="production";
                    const extras = [];
                    if (r.freezeTemp != null) extras.push(`🧊 ${r.freezeTemp}°C`);
                    if (r.backdated) extras.push("ย้อนหลัง");
                    if (r.producer)  extras.push(`ผลิต: ${r.producer}`);
                    if (r.tester)    extras.push(`ทดสอบ: ${r.tester}`);
                    const lotEntries = r.materialLots ? Object.entries(r.materialLots).filter(([,v])=>v && String(v).trim()) : [];
                    if (lotEntries.length) extras.push(`${lotEntries.length} ล็อตวัตถุดิบ`);
                    const matBd = r.materialBreakdown && r.materialBreakdown.length;

                    // Highlight matching lots when searching
                    const ql = q.trim().toLowerCase();
                    const matchedLots = ql
                      ? lotEntries.filter(([code, lot]) => String(lot).toLowerCase().includes(ql))
                      : [];

                    const expanded = expandedId === r.id;
                    const hasDetail = lotEntries.length > 0 || (mode==="defect" && matBd > 0) || r.note;
                    const colCount = 4 + (showBranch?1:0) + (mode==="production"?1:0) + 1 + (refresh?1:0);

                    return (
                      <React.Fragment key={r.id}>
                        <tr style={{background: expanded ? "var(--bg)" : undefined}}>
                          <td style={{padding:"4px"}}>
                            {hasDetail && (
                              <button onClick={()=>setExpandedId(expanded ? null : r.id)}
                                style={{
                                  width:24, height:24, borderRadius:6,
                                  background: expanded ? "var(--ink)" : "var(--bg-2)",
                                  color: expanded ? "#fffdf7" : "var(--ink-2)",
                                  border:"none", cursor:"pointer",
                                  display:"flex", alignItems:"center", justifyContent:"center",
                                  fontFamily:"inherit", transition:"all 120ms",
                                }}>
                                <Icon name="chevron" size={12} style={{transform: expanded ? "rotate(180deg)" : "none", transition:"transform 200ms"}}/>
                              </button>
                            )}
                          </td>
                          <td className="font-mono" style={{color:"var(--ink)", fontSize:12}}>{r.id}</td>
                          <td>
                            <div style={{fontSize:13}}>{fmtDateTH(r.date)}</div>
                            <div className="num" style={{fontSize:12, color:"var(--ink-3)"}}>{r.time}{r.backdated && " *"}</div>
                          </td>
                          {showBranch && <td>{b?.name}</td>}
                          <td>{m?.name}</td>
                          <td className="num">{r.qty.toLocaleString()} {r.unit}</td>
                          {mode==="production" && (
                            <td>
                              {isProd && (r.status==="passed"
                                  ? <span className="badge ok"><span className="dot"/>ผ่าน</span>
                                  : <span className="badge bad"><span className="dot"/>ไม่ผ่าน</span>)}
                            </td>
                          )}
                          <td style={{color:"var(--ink-3)", fontSize:13, maxWidth:340}}>
                            <div>{r.reason || r.note || "—"}</div>
                            {matchedLots.length > 0 && (
                              <div style={{marginTop:4, display:"flex", flexWrap:"wrap", gap:4}}>
                                {matchedLots.map(([code, lot]) => {
                                  const ing = store.ingredients.find(i=>i.code===code);
                                  return (
                                    <span key={code} style={{
                                      display:"inline-flex", alignItems:"center", gap:4,
                                      padding:"2px 8px", borderRadius:99, fontSize:11,
                                      background:"color-mix(in oklch, var(--amber) 18%, white)",
                                      color: "#8a5a17", fontWeight:500,
                                    }}>
                                      <span className="font-mono">{lot}</span>
                                      <span style={{opacity:.7}}>· {ing?.name || code}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                            {extras.length>0 && <div style={{fontSize:11, color:"var(--ink-3)", marginTop:3, opacity:.85}}>{extras.join(" · ")}</div>}
                            {mode==="defect" && matBd>0 && (
                              <div style={{fontSize:11, color:"var(--bad)", marginTop:3}}>
                                {r.materialBreakdown.slice(0,3).map(x => `${x.name} ${x.qty.toFixed(1)}${x.unit}`).join(", ")}
                                {r.materialBreakdown.length>3 && ` +${r.materialBreakdown.length-3} อื่น`}
                              </div>
                            )}
                          </td>
                          {refresh && (
                            <td style={{textAlign:"right"}}>
                              <button className="btn ghost sm" onClick={()=>setDeleteTarget(r)} title="ลบ">
                                <Icon name="trash" size={12}/>
                              </button>
                            </td>
                          )}
                        </tr>
                        {expanded && (
                          <tr className="fade-in">
                            <td></td>
                            <td colSpan={colCount-1} style={{padding:"4px 14px 18px", background:"var(--bg)"}}>
                              <DetailPanel record={r} store={store} mode={mode} lotEntries={lotEntries}/>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>
      {filtered.length > 200 && (
        <div style={{textAlign:"center", marginTop:10, color:"var(--ink-3)", fontSize:12}}>
          แสดง 200 รายการแรก จากทั้งหมด {filtered.length}
        </div>
      )}

      <Modal open={!!deleteTarget} onClose={()=>setDeleteTarget(null)} title="ยืนยันการลบ" width={460}
        footer={<>
          <button className="btn ghost" onClick={()=>setDeleteTarget(null)}>ยกเลิก</button>
          <button className="btn danger" onClick={()=>onDelete(deleteTarget)}><Icon name="trash" size={14}/> ลบ</button>
        </>}>
        <p style={{margin:"6px 0 0", fontSize:14, color:"var(--ink-2)"}}>
          ลบประวัตินี้ <span className="font-mono" style={{color:"var(--ink)", fontWeight:500}}>{deleteTarget?.id}</span> ออกจากระบบ?
          การกระทำนี้ไม่สามารถย้อนกลับได้
        </p>
      </Modal>
    </>
  );
}

/* ---------- CSV export ---------- */
function exportRecordsCSV(records, store, mode){
  const head = mode==="defect"
    ? ["ID","วันที่","เวลา","สาขา","เมนู","ปริมาณ (กรัม)","สาเหตุ","หมายเหตุ","วัตถุดิบที่เสีย","ผู้บันทึก"]
    : ["ID","วันที่","เวลา","สาขา","เมนู","ปริมาณ","หน่วย","ผล","สาเหตุไม่ผ่าน","ผู้ผลิต","ผู้ทดสอบ","อุณหภูมิ°C","ย้อนหลัง","ล็อตวัตถุดิบ","หมายเหตุ"];
  const rows = [head];
  records.forEach(r => {
    const m = store.menus.find(x=>x.id===r.menuId);
    const b = store.branches.find(x=>x.id===r.branchId);
    if (mode==="defect"){
      const matStr = (r.materialBreakdown||[])
        .map(x => `${x.code} ${x.name} ${x.qty.toFixed(2)}${x.unit}`).join(" | ");
      rows.push([r.id, r.date, r.time, b?.name||"", m?.name||"", r.qty, r.reason||"", r.note||"", matStr, r.by||""]);
    } else {
      const lots = r.materialLots
        ? Object.entries(r.materialLots).map(([code,lot]) => `${code}:${lot}`).join(" | ")
        : "";
      rows.push([
        r.id, r.date, r.time, b?.name||"", m?.name||"",
        r.qty, r.unit,
        r.status==="passed" ? "ผ่าน" : "ไม่ผ่าน",
        r.reason||"", r.producer||"", r.tester||"",
        r.freezeTemp!=null ? r.freezeTemp : "",
        r.backdated ? "ใช่" : "",
        lots, r.note||""
      ]);
    }
  });
  // CSV with BOM for Excel Thai
  const csv = "\uFEFF" + rows.map(r => r.map(csvCell).join(",")).join("\r\n");
  return csv;
}
function csvCell(v){
  if (v===null || v===undefined) return "";
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g,'""')}"`;
  return s;
}

/* ---------- Quick date presets ---------- */
function DetailPanel({record, store, mode, lotEntries}){
  const r = record;
  return (
    <div style={{display:"grid", gridTemplateColumns: mode==="defect" ? "1.2fr 1fr" : "1fr", gap:14, paddingTop:6}}>
      {/* Material lots — production only */}
      {mode==="production" && (
        <div>
          <div style={{fontSize:11, color:"var(--ink-3)", letterSpacing:".06em", textTransform:"uppercase", fontWeight:500, marginBottom:8}}>
            ล็อตวัตถุดิบ ({lotEntries.length})
          </div>
          {lotEntries.length === 0 ? (
            <div style={{padding:"12px 14px", background:"var(--paper)", border:"1px dashed var(--line-2)", borderRadius:10, fontSize:13, color:"var(--ink-3)"}}>
              ไม่ได้บันทึกล็อตวัตถุดิบไว้
            </div>
          ) : (
            <div style={{background:"var(--paper)", border:"1px solid var(--line)", borderRadius:12, overflow:"hidden"}}>
              <table className="t" style={{fontSize:13}}>
                <thead>
                  <tr>
                    <th>รหัส</th>
                    <th>วัตถุดิบ</th>
                    <th>ล็อต</th>
                  </tr>
                </thead>
                <tbody>
                  {lotEntries.map(([code, lot]) => {
                    const ing = store.ingredients.find(i=>i.code===code);
                    return (
                      <tr key={code}>
                        <td className="font-mono" style={{fontSize:12, color:"var(--ink-2)"}}>{code}</td>
                        <td style={{fontWeight:500}}>{ing?.name || "—"}</td>
                        <td className="font-mono" style={{color:"var(--ink)", fontWeight:500}}>{lot}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{marginTop:12, display:"flex", flexWrap:"wrap", gap:8}}>
            {r.producer && <Tag k="ผู้ผลิต" v={r.producer}/>}
            {r.tester   && <Tag k="ผู้ทดสอบ" v={r.tester}/>}
            {r.freezeTemp != null && <Tag k="อุณหภูมิ" v={`${r.freezeTemp}°C`}/>}
            {r.backdated && <Tag k="" v="บันทึกย้อนหลัง" color="var(--warn)"/>}
            {r.by && <Tag k="บันทึกโดย" v={r.by}/>}
          </div>

          {r.note && (
            <div style={{marginTop:12, padding:"10px 14px", background:"var(--paper)", border:"1px solid var(--line)", borderRadius:10, fontSize:13, color:"var(--ink-2)"}}>
              <div style={{fontSize:10, color:"var(--ink-3)", letterSpacing:".06em", textTransform:"uppercase", marginBottom:4, fontWeight:500}}>หมายเหตุ</div>
              {r.note}
            </div>
          )}
        </div>
      )}

      {/* Material breakdown — defect only */}
      {mode==="defect" && (
        <>
          <div>
            <div style={{fontSize:11, color:"var(--ink-3)", letterSpacing:".06em", textTransform:"uppercase", fontWeight:500, marginBottom:8}}>
              วัตถุดิบที่เสีย ({(r.materialBreakdown||[]).length})
            </div>
            {(r.materialBreakdown||[]).length === 0 ? (
              <div style={{padding:"12px 14px", background:"var(--paper)", border:"1px dashed var(--line-2)", borderRadius:10, fontSize:13, color:"var(--ink-3)"}}>
                ยังไม่ผูก BOM เสียหาย — ไม่มีการคำนวณ
              </div>
            ) : (
              <div style={{background:"var(--paper)", border:"1px solid var(--line)", borderRadius:12, overflow:"hidden"}}>
                <table className="t" style={{fontSize:13}}>
                  <thead>
                    <tr>
                      <th>รหัส</th>
                      <th>วัตถุดิบ</th>
                      <th style={{textAlign:"right"}}>จำนวน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.materialBreakdown.map(x => (
                      <tr key={x.code}>
                        <td className="font-mono" style={{fontSize:12, color:"var(--ink-2)"}}>{x.code}</td>
                        <td style={{fontWeight:500}}>{x.name}</td>
                        <td className="num" style={{textAlign:"right", color:"var(--bad)", fontWeight:500}}>{x.qty.toFixed(2)} <span style={{fontSize:11, color:"var(--ink-3)", fontWeight:400}}>{x.unit}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div>
            <div style={{fontSize:11, color:"var(--ink-3)", letterSpacing:".06em", textTransform:"uppercase", fontWeight:500, marginBottom:8}}>รายละเอียด</div>
            <div style={{display:"flex", flexDirection:"column", gap:8}}>
              {r.reason && <Tag k="สาเหตุ" v={r.reason} color="var(--warn)"/>}
              {r.by     && <Tag k="บันทึกโดย" v={r.by}/>}
              {r.note   && (
                <div style={{padding:"10px 14px", background:"var(--paper)", border:"1px solid var(--line)", borderRadius:10, fontSize:13, color:"var(--ink-2)"}}>
                  <div style={{fontSize:10, color:"var(--ink-3)", letterSpacing:".06em", textTransform:"uppercase", marginBottom:4, fontWeight:500}}>หมายเหตุ</div>
                  {r.note}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Tag({k, v, color}){
  return (
    <div style={{
      display:"inline-flex", alignItems:"center", gap:8,
      padding:"6px 12px", background:"var(--paper)",
      border:"1px solid var(--line)", borderRadius:99, fontSize:12,
    }}>
      {k && <span style={{color:"var(--ink-3)"}}>{k}:</span>}
      <span style={{color: color || "var(--ink)", fontWeight:500}}>{v}</span>
    </div>
  );
}

function DateQuickPresets({setFrom, setTo}){
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const apply = (n) => {
    if (n === "all"){ setFrom(""); setTo(""); }
    else if (n === "today"){ const t = todayISO(); setFrom(t); setTo(t); }
    else {
      const t = todayISO();
      const d = new Date(t + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() - (n-1));
      setFrom(d.toISOString().slice(0,10));
      setTo(t);
    }
    setOpen(false);
  };

  const presets = [
    { l:"วันนี้",        v:"today" },
    { l:"7 วันล่าสุด",   v:7 },
    { l:"30 วันล่าสุด",  v:30 },
    { l:"ทั้งหมด",       v:"all" },
  ];

  return (
    <div ref={ref} style={{position:"relative"}}>
      <button className="btn ghost" onClick={()=>setOpen(o=>!o)} style={{padding:"10px 14px"}}>
        <Icon name="calendar" size={14}/> ช่วงเวลา <Icon name="chevron" size={12}/>
      </button>
      {open && (
        <div className="card fade-up" style={{
          position:"absolute", right:0, top:"calc(100% + 6px)", zIndex:50,
          padding:6, minWidth:180, boxShadow:"var(--shadow-lg)"
        }}>
          {presets.map(p => (
            <button key={p.v} onClick={()=>apply(p.v)}
              style={{
                display:"block", width:"100%", padding:"9px 12px", borderRadius:8,
                background:"transparent", border:"none", textAlign:"left",
                fontFamily:"inherit", fontSize:13, color:"var(--ink-2)", cursor:"pointer",
                transition:"all 100ms",
              }}
              onMouseEnter={e=>e.currentTarget.style.background = "var(--bg)"}
              onMouseLeave={e=>e.currentTarget.style.background = "transparent"}>
              {p.l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { BranchView, RecordRow, HistoryView, SplitHistoryPage, DefectHistoryPage, DefectByMaterial, exportRecordsCSV, DateQuickPresets });
