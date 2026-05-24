/* =========================================================
   ADMIN — full backend management
   ========================================================= */

function AdminView({user, store, refresh}){
  const [page, setPage] = useState("overview");
  const nav = [
    { key:"overview",      label:"ภาพรวมระบบ",    icon:"dashboard" },
    { key:"users",         label:"จัดการผู้ใช้",   icon:"user" },
    { key:"branches",      label:"จัดการสาขา",    icon:"store" },
    { key:"menus",         label:"จัดการเมนู",     icon:"menu" },
    { key:"materials",     label:"วัตถุดิบ",       icon:"box" },
    { key:"bom",           label:"ผูก BOM",        icon:"link" },
    { key:"history",       label:"ประวัติการผลิต",  icon:"history" },
    { key:"defectHistory", label:"ประวัติเสียหาย",  icon:"trash" },
  ];

  return (
    <AppShell user={user} onLogout={()=>window.__doLogout()} nav={nav} current={page} onNav={setPage}>
      {page==="overview"      && <AdminOverview store={store} refresh={refresh}/>}
      {page==="users"         && <AdminUsers    store={store} refresh={refresh}/>}
      {page==="branches"      && <AdminBranches store={store} refresh={refresh}/>}
      {page==="menus"         && <AdminMenus    store={store} refresh={refresh}/>}
      {page==="materials"     && <AdminMaterials store={store} refresh={refresh}/>}
      {page==="bom"           && <AdminBOM      store={store} refresh={refresh}/>}
      {page==="history"       && <SplitHistoryPage records={store.records} store={store}
                                  title="ประวัติการผลิตทั้งระบบ" eyebrow="Admin · Production"
                                  showBranch={true} showBranchFilter={true} refresh={refresh}/>}
      {page==="defectHistory" && <DefectHistoryPage records={store.records} store={store}
                                  title="ประวัติเสียหายทั้งระบบ" eyebrow="Admin · Defects"
                                  showBranch={true} showBranchFilter={true} refresh={refresh}/>}
    </AppShell>
  );
}

/* ---------- Admin overview ---------- */
function AdminOverview({store, refresh}){
  const toast = useToast();
  const prod = store.records.filter(r=>r.type==="production");
  const defects = store.records.filter(r=>r.type==="defect");
  const passed = prod.filter(r=>r.status==="passed").length;
  const passRate = prod.length ? Math.round(passed/prod.length*100) : 0;
  const bomCount = Object.values(store.bomProd||{}).reduce((s,arr)=>s+arr.length,0)
                 + Object.values(store.bomDefect||{}).reduce((s,arr)=>s+arr.length,0);
  const menusWithBom = Object.keys(store.bomProd||{}).filter(k => (store.bomProd[k]||[]).length>0).length;

  const trend = useMemo(() => {
    const arr = [];
    for (let d=13; d>=0; d--){
      const day = new Date(); day.setDate(day.getDate()-d);
      const iso = day.toISOString().slice(0,10);
      arr.push(prod.filter(r=>r.date===iso).length);
    }
    return arr;
  }, [prod]);

  return (
    <>
      <PageHeader
        eyebrow="System Admin"
        title="ภาพรวมระบบ"
        subtitle="ดูสุขภาพระบบ จัดการ master data และตั้งค่าหลังบ้าน"
        right={
          <button className="btn ghost" onClick={()=>{ if (confirm("รีเซ็ตข้อมูล demo ทั้งหมด?")) { resetStore(); refresh(); toast("รีเซ็ตเรียบร้อย", "ok"); } }}>
            <Icon name="trash" size={14}/> รีเซ็ตข้อมูล demo
          </button>
        }
      />

      <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:18, marginBottom:22}} className="fade-up">
        <StatCard label="สาขา"        value={store.branches.length}   sub="ที่เปิดใช้งาน" icon="store"   accent="var(--amber)"/>
        <StatCard label="เมนู"        value={store.menus.length}      sub={`${menusWithBom}/${store.menus.length} มี BOM`} icon="menu" accent="var(--matcha)"/>
        <StatCard label="ผู้ใช้งาน"   value={store.users.length}      sub={`${ROLE_OPTIONS.map(r=>store.users.filter(u=>u.role===r).length).join(" · ")}`} icon="user" accent="var(--info)"/>
        <StatCard label="ล็อตผลิตรวม" value={fmtNum(prod.length)}      sub={`${passRate}% pass`}     icon="factory" accent="var(--tea)" trend={trend}/>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:22}}>
        <div className="card" style={{padding:"24px 26px"}}>
          <h3 className="font-display" style={{margin:"0 0 16px", fontSize:18, fontWeight:600}}>การผลิตรวม 14 วันย้อนหลัง</h3>
          <Bars data={trend} color="var(--amber)" height={200}
            labels={Array.from({length:14}).map((_,i)=>{
              const d = new Date(); d.setDate(d.getDate()-(13-i));
              return d.toLocaleDateString("th-TH",{day:"2-digit"});
            })}/>
        </div>

        <div className="card" style={{padding:"24px 26px"}}>
          <h3 className="font-display" style={{margin:"0 0 16px", fontSize:18, fontWeight:600}}>สถานะระบบ</h3>
          <div style={{display:"flex", flexDirection:"column", gap:12}}>
            <SysRow label="Storage" value={`localStorage · ${(JSON.stringify(store).length/1024).toFixed(1)} KB`} ok/>
            <SysRow label="Records" value={`${store.records.length} entries`} ok/>
            <SysRow label="Demo accounts" value="Branch · Area · QC · Admin" ok/>
            <SysRow label="BOM coverage" value={`${menusWithBom}/${store.menus.length} เมนู`} ok={menusWithBom===store.menus.length}/>
          </div>
        </div>
      </div>

      {/* Defect by material */}
      <div style={{marginTop:22}}>
        <DefectMaterialDashboard records={store.records.filter(r => r.type==="defect")} store={store}/>
      </div>
    </>
  );
}

function SysRow({label, value, ok}){
  return (
    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:"var(--bg)", borderRadius:10, border:"1px solid var(--line)"}}>
      <div style={{display:"flex", alignItems:"center", gap:10}}>
        <span style={{width:8, height:8, borderRadius:"50%", background: ok ? "var(--ok)":"var(--warn)", boxShadow: ok ? "0 0 8px var(--ok)" : "0 0 8px var(--warn)"}}/>
        <span style={{fontSize:14}}>{label}</span>
      </div>
      <span style={{fontSize:13, color:"var(--ink-3)"}} className="font-mono">{value}</span>
    </div>
  );
}

/* ---------- Branches CRUD ---------- */
function AdminBranches({store, refresh}){
  const toast = useToast();
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({ id:"", name:"", area:"" });
  const [editing, setEditing] = useState(null);

  const submit = () => {
    if (!form.id || !form.name || !form.area) return toast("กรอกข้อมูลให้ครบ", "bad");
    const s = loadStore();
    if (editing){
      const idx = s.branches.findIndex(b=>b.id===editing);
      s.branches[idx] = { ...form };
    } else {
      if (s.branches.find(b=>b.id===form.id)) return toast("รหัสสาขาซ้ำ", "bad");
      s.branches.push({...form});
    }
    saveStore(s); refresh();
    toast(editing ? "แก้ไขสาขาแล้ว" : "เพิ่มสาขาแล้ว", "ok");
    setOpenAdd(false); setEditing(null);
    setForm({ id:"", name:"", area:"" });
  };

  const onEdit = (b) => { setEditing(b.id); setForm(b); setOpenAdd(true); };

  const onDelete = (id) => {
    if (!confirm("ลบสาขานี้?")) return;
    const s = loadStore();
    s.branches = s.branches.filter(b=>b.id!==id);
    saveStore(s); refresh();
    toast("ลบเรียบร้อย", "ok");
  };

  return (
    <>
      <PageHeader
        eyebrow="Master Data"
        title="จัดการสาขา"
        subtitle={`มี ${store.branches.length} สาขาในระบบ`}
        right={
          <button className="btn amber" onClick={()=>{setEditing(null); setForm({id:"",name:"",area:""}); setOpenAdd(true);}}>
            <Icon name="plus" size={14}/> เพิ่มสาขาใหม่
          </button>
        }
      />
      <div className="card" style={{overflow:"hidden"}}>
        <table className="t">
          <thead>
            <tr><th>รหัส</th><th>ชื่อสาขา</th><th>เขต / พื้นที่</th><th style={{textAlign:"right"}}>กิจกรรม</th><th style={{width:140}}></th></tr>
          </thead>
          <tbody>
            {store.branches.map(b=>{
              const cnt = store.records.filter(r=>r.branchId===b.id).length;
              return (
                <tr key={b.id}>
                  <td className="font-mono" style={{fontSize:13, color:"var(--ink)"}}>{b.id}</td>
                  <td style={{fontWeight:500}}>{b.name}</td>
                  <td><span className="badge">{b.area}</span></td>
                  <td className="num" style={{textAlign:"right"}}>{cnt.toLocaleString()} records</td>
                  <td style={{textAlign:"right"}}>
                    <button className="btn ghost sm" onClick={()=>onEdit(b)} style={{marginRight:6}}><Icon name="edit" size={12}/></button>
                    <button className="btn ghost sm" onClick={()=>onDelete(b.id)}><Icon name="trash" size={12}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={openAdd} onClose={()=>{setOpenAdd(false); setEditing(null);}} title={editing?"แก้ไขสาขา":"เพิ่มสาขาใหม่"}
        footer={<>
          <button className="btn ghost" onClick={()=>{setOpenAdd(false); setEditing(null);}}>ยกเลิก</button>
          <button className="btn amber" onClick={submit}><Icon name="check" size={14}/> บันทึก</button>
        </>}>
        <div style={{display:"flex", flexDirection:"column", gap:14}}>
          <label className="field">
            <span>รหัสสาขา</span>
            <input className="inp" value={form.id} onChange={e=>setForm({...form, id:e.target.value.toUpperCase()})} placeholder="BR08" disabled={!!editing}/>
          </label>
          <label className="field">
            <span>ชื่อสาขา</span>
            <input className="inp" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} placeholder="สาขา..."/>
          </label>
          <label className="field">
            <span>เขต / พื้นที่ (Area)</span>
            <input className="inp" value={form.area} onChange={e=>setForm({...form, area:e.target.value})} placeholder="BKK-Central / Upcountry / ..."/>
          </label>
        </div>
      </Modal>
    </>
  );
}

/* ---------- Menus CRUD ---------- */
function AdminMenus({store, refresh}){
  const toast = useToast();
  const [openAdd, setOpenAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ id:"", name:"", category:"", yield:"", unit:"" });

  const submit = () => {
    if (!form.id || !form.name || !form.category || !form.yield || !form.unit) return toast("กรอกให้ครบ","bad");
    const s = loadStore();
    if (editing){
      const idx = s.menus.findIndex(m=>m.id===editing);
      s.menus[idx] = { ...form, yield:Number(form.yield) };
    } else {
      if (s.menus.find(m=>m.id===form.id)) return toast("รหัสเมนูซ้ำ", "bad");
      s.menus.push({ ...form, yield:Number(form.yield) });
    }
    saveStore(s); refresh();
    toast(editing?"แก้ไขเมนูแล้ว":"เพิ่มเมนูแล้ว","ok");
    setOpenAdd(false); setEditing(null);
    setForm({id:"",name:"",category:"",yield:"",unit:""});
  };

  const onEdit = (m) => { setEditing(m.id); setForm({...m, yield:String(m.yield)}); setOpenAdd(true); };

  const onDelete = (id) => {
    if (!confirm("ลบเมนูนี้?")) return;
    const s = loadStore();
    s.menus = s.menus.filter(m=>m.id!==id);
    delete s.bomProd[id];
    delete s.bomDefect[id];
    saveStore(s); refresh();
    toast("ลบเรียบร้อย","ok");
  };

  return (
    <>
      <PageHeader
        eyebrow="Master Data"
        title="จัดการเมนู"
        subtitle={`มี ${store.menus.length} เมนูในระบบ`}
        right={
          <button className="btn amber" onClick={()=>{setEditing(null); setForm({id:"",name:"",category:"",yield:"",unit:""}); setOpenAdd(true);}}>
            <Icon name="plus" size={14}/> เพิ่มเมนูใหม่
          </button>
        }
      />
      <div className="card" style={{overflow:"hidden"}}>
        <table className="t">
          <thead>
            <tr><th>รหัส</th><th>ชื่อเมนู</th><th>หมวด</th><th style={{textAlign:"right"}}>Yield ต่อล็อต</th><th>BOM</th><th style={{width:120}}></th></tr>
          </thead>
          <tbody>
            {store.menus.map(m=>{
              const bp = (store.bomProd?.[m.id])||[];
              const bd = (store.bomDefect?.[m.id])||[];
              return (
                <tr key={m.id}>
                  <td className="font-mono" style={{fontSize:13}}>{m.id}</td>
                  <td style={{fontWeight:500}}>{m.name}</td>
                  <td><span className="badge">{m.category}</span></td>
                  <td className="num" style={{textAlign:"right"}}>{m.yield.toLocaleString()} {m.unit}</td>
                  <td>
                    <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
                      <span className={`badge ${bp.length?"ok":"bad"}`}><span className="dot"/>ผลิต {bp.length}</span>
                      <span className={`badge ${bd.length?"info":"bad"}`}><span className="dot"/>เสีย {bd.length}</span>
                    </div>
                  </td>
                  <td style={{textAlign:"right"}}>
                    <button className="btn ghost sm" onClick={()=>onEdit(m)} style={{marginRight:6}}><Icon name="edit" size={12}/></button>
                    <button className="btn ghost sm" onClick={()=>onDelete(m.id)}><Icon name="trash" size={12}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={openAdd} onClose={()=>{setOpenAdd(false); setEditing(null);}} title={editing?"แก้ไขเมนู":"เพิ่มเมนูใหม่"}
        footer={<>
          <button className="btn ghost" onClick={()=>{setOpenAdd(false); setEditing(null);}}>ยกเลิก</button>
          <button className="btn amber" onClick={submit}><Icon name="check" size={14}/> บันทึก</button>
        </>}>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
          <label className="field" style={{gridColumn:"1/-1"}}>
            <span>รหัสเมนู</span>
            <input className="inp" value={form.id} onChange={e=>setForm({...form, id:e.target.value.toUpperCase()})} placeholder="M13" disabled={!!editing}/>
          </label>
          <label className="field" style={{gridColumn:"1/-1"}}>
            <span>ชื่อเมนู</span>
            <input className="inp" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
          </label>
          <label className="field">
            <span>หมวด</span>
            <input className="inp" value={form.category} onChange={e=>setForm({...form, category:e.target.value})} placeholder="เบส / 3.3 / ท็อปปิ้ง"/>
          </label>
          <label className="field">
            <span>Yield ต่อล็อต</span>
            <input type="number" className="inp" value={form.yield} onChange={e=>setForm({...form, yield:e.target.value})}/>
          </label>
          <label className="field" style={{gridColumn:"1/-1"}}>
            <span>หน่วย</span>
            <input className="inp" value={form.unit} onChange={e=>setForm({...form, unit:e.target.value})} placeholder="มล. / กรัม / แก้ว"/>
          </label>
        </div>
      </Modal>
    </>
  );
}

/* ---------- Materials CRUD ---------- */
function AdminMaterials({store, refresh}){
  const toast = useToast();
  const [openAdd, setOpenAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code:"", name:"", unit:"" });
  const [q, setQ] = useState("");

  const submit = () => {
    if (!form.code || !form.name || !form.unit) return toast("กรอกให้ครบ","bad");
    const s = loadStore();
    if (editing){
      const idx = s.ingredients.findIndex(i=>i.code===editing);
      s.ingredients[idx] = { ...form };
    } else {
      if (s.ingredients.find(i=>i.code===form.code)) return toast("รหัสซ้ำ", "bad");
      s.ingredients.push({...form});
    }
    saveStore(s); refresh();
    toast(editing?"แก้ไขแล้ว":"เพิ่มวัตถุดิบแล้ว","ok");
    setOpenAdd(false); setEditing(null);
    setForm({code:"",name:"",unit:""});
  };

  const onEdit = (i) => { setEditing(i.code); setForm(i); setOpenAdd(true); };
  const onDelete = (code) => {
    if (!confirm("ลบวัตถุดิบนี้?")) return;
    const s = loadStore();
    s.ingredients = s.ingredients.filter(i=>i.code!==code);
    // also remove from BOMs
    Object.keys(s.bomProd||{}).forEach(k => { s.bomProd[k] = (s.bomProd[k]||[]).filter(b=>b.code!==code); });
    Object.keys(s.bomDefect||{}).forEach(k => { s.bomDefect[k] = (s.bomDefect[k]||[]).filter(b=>b.code!==code); });
    saveStore(s); refresh();
    toast("ลบเรียบร้อย","ok");
  };

  const filtered = store.ingredients.filter(i => {
    if (!q) return true;
    const hay = (i.code + " " + i.name).toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  // usage count per material
  const usage = {};
  Object.entries(store.bomProd||{}).forEach(([mid, arr]) => {
    arr.forEach(b => { usage[b.code] = (usage[b.code]||0)+1; });
  });
  Object.entries(store.bomDefect||{}).forEach(([mid, arr]) => {
    arr.forEach(b => { usage[b.code] = (usage[b.code]||0)+1; });
  });

  return (
    <>
      <PageHeader
        eyebrow="Master Data"
        title="วัตถุดิบ"
        subtitle={`มี ${store.ingredients.length} รายการ · รหัสสินค้า · ชื่อ · หน่วย`}
        right={
          <button className="btn amber" onClick={()=>{setEditing(null); setForm({code:"",name:"",unit:""}); setOpenAdd(true);}}>
            <Icon name="plus" size={14}/> เพิ่มวัตถุดิบ
          </button>
        }
      />

      <div style={{maxWidth:380, marginBottom:16}}>
        <SearchBox value={q} onChange={setQ} placeholder="ค้นหารหัส หรือชื่อวัตถุดิบ..."/>
      </div>

      <div className="card" style={{overflow:"hidden"}}>
        <table className="t">
          <thead>
            <tr><th>รหัสสินค้า</th><th>ชื่อวัตถุดิบ</th><th>หน่วย</th><th style={{textAlign:"right"}}>ใช้ในเมนู</th><th style={{width:120}}></th></tr>
          </thead>
          <tbody>
            {filtered.map(i=>(
              <tr key={i.code}>
                <td className="font-mono" style={{fontSize:13, color:"var(--ink)"}}>{i.code}</td>
                <td style={{fontWeight:500}}>{i.name}</td>
                <td><span className="badge">{i.unit}</span></td>
                <td className="num" style={{textAlign:"right"}}>{usage[i.code]||0} เมนู</td>
                <td style={{textAlign:"right"}}>
                  <button className="btn ghost sm" onClick={()=>onEdit(i)} style={{marginRight:6}}><Icon name="edit" size={12}/></button>
                  <button className="btn ghost sm" onClick={()=>onDelete(i.code)}><Icon name="trash" size={12}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={openAdd} onClose={()=>{setOpenAdd(false); setEditing(null);}} title={editing?"แก้ไขวัตถุดิบ":"เพิ่มวัตถุดิบใหม่"}
        footer={<>
          <button className="btn ghost" onClick={()=>{setOpenAdd(false); setEditing(null);}}>ยกเลิก</button>
          <button className="btn amber" onClick={submit}><Icon name="check" size={14}/> บันทึก</button>
        </>}>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
          <label className="field">
            <span>รหัสสินค้า</span>
            <input className="inp" value={form.code} onChange={e=>setForm({...form, code:e.target.value.toUpperCase()})} placeholder="RM015" disabled={!!editing}/>
          </label>
          <label className="field">
            <span>หน่วย</span>
            <input className="inp" value={form.unit} onChange={e=>setForm({...form, unit:e.target.value})} placeholder="กรัม / มล."/>
          </label>
          <label className="field" style={{gridColumn:"1/-1"}}>
            <span>ชื่อวัตถุดิบ</span>
            <input className="inp" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
          </label>
        </div>
      </Modal>
    </>
  );
}

/* ---------- BOM linking — two modes ---------- */
function AdminBOM({store, refresh}){
  const toast = useToast();
  const [mode, setMode] = useState("prod"); // 'prod' | 'defect'
  const [selectedId, setSelectedId] = useState(store.menus[0]?.id || null);
  const selected = store.menus.find(m=>m.id===selectedId);

  const isProd = mode === "prod";
  const bomKey = isProd ? "bomProd" : "bomDefect";
  const bom = (store[bomKey]?.[selectedId]) || [];

  const [newCode, setNewCode] = useState("");
  const [newQty, setNewQty] = useState("");

  const addLine = () => {
    if (!newCode) return toast("เลือกวัตถุดิบ", "bad");
    if (!isProd && !newQty) return toast("กรอกปริมาณต่อกรัม", "bad");
    const s = loadStore();
    if (!s[bomKey][selectedId]) s[bomKey][selectedId] = [];
    if (s[bomKey][selectedId].find(b=>b.code===newCode)){
      return toast("วัตถุดิบนี้อยู่ใน BOM นี้แล้ว", "warn");
    }
    s[bomKey][selectedId].push(isProd ? { code: newCode } : { code: newCode, qty: Number(newQty) });
    saveStore(s); refresh();
    setNewCode(""); setNewQty("");
    toast("เพิ่มเข้า BOM แล้ว", "ok");
  };

  const removeLine = (code) => {
    const s = loadStore();
    s[bomKey][selectedId] = (s[bomKey][selectedId]||[]).filter(b=>b.code!==code);
    saveStore(s); refresh();
    toast("ลบ BOM line แล้ว", "ok");
  };

  const updateQty = (code, qty) => {
    const s = loadStore();
    s[bomKey][selectedId] = (s[bomKey][selectedId]||[]).map(b => b.code===code ? {...b, qty: Number(qty)||0} : b);
    saveStore(s); refresh();
  };

  return (
    <>
      <PageHeader
        eyebrow="Bill of Materials"
        title="ผูก BOM เมนู ↔ วัตถุดิบ"
        subtitle="แยก 2 ฟีเจอร์ — ผูกวัตถุดิบที่ใช้ในการผลิต และผูกอัตราคำนวณของเสีย"
      />

      {/* mode switcher */}
      <div style={{
        display:"inline-flex", padding:4, background:"var(--bg-2)", border:"1px solid var(--line)",
        borderRadius:99, marginBottom:20, gap:0,
      }} className="fade-up">
        {[
          {k:"prod",   l:"ผูกบอมล็อตการผลิต",     ic:"factory"},
          {k:"defect", l:"ผูกบอมวัตถุดิบเสียหาย",  ic:"alert"},
        ].map(t => (
          <button key={t.k} onClick={()=>setMode(t.k)}
            style={{
              padding:"10px 18px", borderRadius:99, border:"none", cursor:"pointer", fontFamily:"inherit",
              background: mode===t.k ? "var(--paper)" : "transparent",
              color: mode===t.k ? "var(--ink)" : "var(--ink-3)",
              boxShadow: mode===t.k ? "var(--shadow-sm)" : "none",
              fontSize:14, fontWeight: mode===t.k ? 600 : 500,
              display:"inline-flex", alignItems:"center", gap:8,
              transition:"all 140ms", whiteSpace:"nowrap",
            }}>
            <Icon name={t.ic} size={14}/>
            {t.l}
          </button>
        ))}
      </div>

      <div style={{
        marginBottom:18, padding:"12px 16px",
        background: isProd ? "rgba(201,138,60,.08)" : "rgba(176,70,52,.08)",
        border: `1px dashed ${isProd ? "var(--amber)" : "var(--bad)"}`,
        borderRadius:12, fontSize:13, color:"var(--ink-2)",
        display:"flex", gap:10, alignItems:"flex-start"
      }}>
        <Icon name="sparkle" size={14} style={{marginTop:2, color: isProd ? "var(--amber)" : "var(--bad)"}}/>
        <div>
          {isProd ? (
            <>
              <b>ผูกบอมล็อตการผลิต</b> — ไม่ต้องระบุปริมาณ ใช้สำหรับให้พนักงานกรอกล็อตวัตถุดิบตอนบันทึกการผลิต
            </>
          ) : (
            <>
              <b>ผูกบอมวัตถุดิบเสียหาย</b> — ต้องระบุปริมาณ <b>ต่อกรัมของผลิตภัณฑ์</b> เช่น 0.001 ถุง/กรัม ใช้แปลงปริมาณของเสียเป็นจำนวนวัตถุดิบ
              <div style={{fontSize:12, color:"var(--ink-3)", marginTop:4}}>
                สูตรคำนวณ: <span className="font-mono">จำนวนวัตถุดิบที่เสีย = ปริมาณของเสีย(กรัม) × ปริมาณต่อกรัม</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"320px 1fr", gap:22}}>
        {/* Menu list */}
        <div className="card" style={{padding:14, height:"fit-content", maxHeight:"75vh", overflow:"auto"}}>
          <div style={{padding:"8px 10px 12px", fontSize:11, color:"var(--ink-3)", letterSpacing:".06em", textTransform:"uppercase"}}>เมนู ({store.menus.length})</div>
          <div style={{display:"flex", flexDirection:"column", gap:4}}>
            {store.menus.map(m => {
              const bn = (store[bomKey]?.[m.id]||[]).length;
              return (
                <button key={m.id} onClick={()=>setSelectedId(m.id)}
                  style={{
                    display:"flex", alignItems:"center", gap:10,
                    padding:"10px 12px", borderRadius:10,
                    background: selectedId===m.id ? "var(--ink)" : "transparent",
                    color: selectedId===m.id ? "#fffdf7" : "var(--ink-2)",
                    border:"none", textAlign:"left", cursor:"pointer", fontFamily:"inherit", fontSize:13,
                    transition:"all 140ms",
                  }}
                  onMouseEnter={e=>{ if (selectedId!==m.id) e.currentTarget.style.background = "var(--bg)"; }}
                  onMouseLeave={e=>{ if (selectedId!==m.id) e.currentTarget.style.background = "transparent"; }}>
                  <span style={{flex:1, minWidth:0}}>
                    <span style={{display:"block", fontSize:9, opacity:.6, letterSpacing:".06em", textTransform:"uppercase"}}>{m.category}</span>
                    <span style={{fontWeight:500}}>{m.name}</span>
                  </span>
                  <span style={{
                    fontSize:11, padding:"2px 8px", borderRadius:999,
                    background: bn ? (selectedId===m.id ? "rgba(255,253,247,.2)" : "var(--bg-2)") : "rgba(176,70,52,.15)",
                    color: bn ? (selectedId===m.id ? "#fffdf7" : "var(--ink-3)") : "var(--bad)",
                    fontWeight:500,
                  }}>{bn}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* BOM editor */}
        <div>
          {selected ? (
            <>
              <div className="card" style={{padding:"22px 26px", marginBottom:16}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:20}}>
                  <div>
                    <div style={{fontSize:11, color:"var(--ink-3)", letterSpacing:".06em", textTransform:"uppercase", marginBottom:4}}>{selected.category} · {selected.id}</div>
                    <h3 className="font-display" style={{margin:0, fontSize:24, fontWeight:600}}>{selected.name}</h3>
                  </div>
                  <span className={`badge ${bom.length ? (isProd?"ok":"info") : "bad"}`}><span className="dot"/>{bom.length} วัตถุดิบ</span>
                </div>
              </div>

              <div className="card" style={{padding:"20px 24px", marginBottom:14}}>
                <div style={{fontSize:11, color:"var(--ink-3)", letterSpacing:".06em", textTransform:"uppercase", marginBottom:10}}>
                  เพิ่มวัตถุดิบเข้า BOM {isProd ? "ผลิต" : "เสียหาย"}
                </div>
                <div style={{display:"grid", gridTemplateColumns: isProd ? "1fr 100px" : "1fr 180px 100px", gap:10}}>
                  <select className="inp" value={newCode} onChange={e=>setNewCode(e.target.value)}>
                    <option value="">— เลือกวัตถุดิบ —</option>
                    {store.ingredients.map(i => <option key={i.code} value={i.code}>{i.code} · {i.name}</option>)}
                  </select>
                  {!isProd && (
                    <div style={{position:"relative"}}>
                      <input type="number" step="0.0001" className="inp" value={newQty} onChange={e=>setNewQty(e.target.value)} placeholder="0.001"/>
                      <span style={{position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", fontSize:11, color:"var(--ink-3)"}}>
                        {newCode ? `${store.ingredients.find(i=>i.code===newCode)?.unit}/g` : "/g"}
                      </span>
                    </div>
                  )}
                  <button className="btn" onClick={addLine} style={{justifyContent:"center"}}>
                    <Icon name="plus" size={14}/> เพิ่ม
                  </button>
                </div>
              </div>

              <div className="card" style={{overflow:"hidden"}}>
                {bom.length===0
                  ? <Empty icon="link" title={`ยังไม่มี BOM ${isProd?"ผลิต":"เสียหาย"}`} subtitle="เพิ่มวัตถุดิบรายการแรกข้างบน"/>
                  : (
                    <table className="t">
                      <thead>
                        <tr>
                          <th>รหัส</th>
                          <th>วัตถุดิบ</th>
                          {!isProd && <th style={{textAlign:"right"}}>ปริมาณต่อกรัม</th>}
                          <th>หน่วย</th>
                          <th style={{width:80}}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {bom.map(b => {
                          const ing = store.ingredients.find(i=>i.code===b.code);
                          return (
                            <tr key={b.code}>
                              <td className="font-mono" style={{fontSize:13, color:"var(--ink)"}}>{b.code}</td>
                              <td style={{fontWeight:500}}>{ing?.name || "—"}</td>
                              {!isProd && (
                                <td style={{textAlign:"right"}}>
                                  <input type="number" step="0.0001" className="inp" style={{width:140, padding:"7px 10px", textAlign:"right", fontFamily:"Space Grotesk"}}
                                         value={b.qty} onChange={e=>updateQty(b.code, e.target.value)}/>
                                </td>
                              )}
                              <td><span className="badge">{ing?.unit}</span></td>
                              <td style={{textAlign:"right"}}>
                                <button className="btn ghost sm" onClick={()=>removeLine(b.code)}><Icon name="trash" size={12}/></button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
              </div>
            </>
          ) : <Empty title="เลือกเมนูทางซ้ายเพื่อเริ่ม"/>}
        </div>
      </div>
    </>
  );
}

Object.assign(window, { AdminView });

/* =========================================================
   USERS — single + bulk add
   ========================================================= */

const ROLE_OPTIONS = ["Branch", "Area", "QC", "Admin"];
const ROLE_TH = { Branch:"พนักงานสาขา", Area:"Area Manager", QC:"QC", Admin:"ผู้ดูแลระบบ" };
const ROLE_COLOR = { Branch:"var(--amber)", Area:"var(--matcha)", QC:"var(--info)", Admin:"var(--tea)" };

function AdminUsers({store, refresh}){
  const toast = useToast();
  const [openSingle, setOpenSingle] = useState(false);
  const [openBulk, setOpenBulk]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [singleForm, setSingleForm] = useState(emptyUser());
  const [filterRole, setFilterRole] = useState("all");
  const [q, setQ] = useState("");

  function emptyUser(){
    return { user:"", pass:"", role:"Branch", branchId:"", areas:[], label:"" };
  }

  // bulk state — rows
  const [bulkRows, setBulkRows] = useState(() => Array.from({length:5}).map(emptyUser));

  const allAreas = Array.from(new Set(store.branches.map(b=>b.area)));

  const filtered = store.users.filter(u => {
    if (filterRole!=="all" && u.role!==filterRole) return false;
    if (q && !(u.user+" "+u.label+" "+(u.branchId||"")).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  /* ----- single submit ----- */
  const submitSingle = () => {
    const err = validateUser(singleForm, store.users, editing);
    if (err) return toast(err, "bad");
    const s = loadStore();
    if (editing){
      const idx = s.users.findIndex(u=>u.user===editing);
      s.users[idx] = { ...singleForm };
    } else {
      s.users.push({ ...singleForm });
    }
    saveStore(s); refresh();
    toast(editing ? "แก้ไขผู้ใช้แล้ว" : "เพิ่มผู้ใช้แล้ว", "ok");
    setOpenSingle(false); setEditing(null); setSingleForm(emptyUser());
  };

  /* ----- bulk submit ----- */
  const submitBulk = () => {
    const s = loadStore();
    const existing = new Set(s.users.map(u=>u.user.toLowerCase()));
    const valid = [];
    const errors = [];
    bulkRows.forEach((row, i) => {
      // skip empty rows
      if (!row.user && !row.pass && !row.label) return;
      const err = validateUser(row, [...s.users, ...valid], null);
      if (err){
        errors.push(`แถว ${i+1}: ${err}`);
      } else {
        valid.push({...row});
        existing.add(row.user.toLowerCase());
      }
    });
    if (errors.length){
      toast(errors[0] + (errors.length>1 ? ` (+${errors.length-1} อื่นๆ)` : ""), "bad");
      return;
    }
    if (valid.length===0){
      toast("ยังไม่ได้กรอกข้อมูลใดเลย", "warn");
      return;
    }
    s.users.push(...valid);
    saveStore(s); refresh();
    toast(`เพิ่มผู้ใช้ ${valid.length} คนสำเร็จ`, "ok");
    setOpenBulk(false);
    setBulkRows(Array.from({length:5}).map(emptyUser));
  };

  const onEdit = (u) => { setEditing(u.user); setSingleForm({...u, areas: u.areas||[]}); setOpenSingle(true); };
  const onDelete = (uname) => {
    if (!confirm(`ลบผู้ใช้ "${uname}"?`)) return;
    const s = loadStore();
    s.users = s.users.filter(u=>u.user!==uname);
    saveStore(s); refresh();
    toast("ลบเรียบร้อย", "ok");
  };

  /* ----- bulk row ops ----- */
  const updateRow = (i, patch) => {
    setBulkRows(rows => rows.map((r,idx)=> idx===i ? {...r, ...patch} : r));
  };
  const addBulkRow = () => setBulkRows(rs => [...rs, emptyUser()]);
  const removeBulkRow = (i) => setBulkRows(rs => rs.filter((_,idx)=>idx!==i));
  const clearBulk = () => setBulkRows(Array.from({length:5}).map(emptyUser));
  const fillBulkTemplate = () => {
    setBulkRows([
      { user:"branch02", pass:"P@ssw0rd", role:"Branch", branchId: store.branches[1]?.id||"", areas:[], label:"พนักงาน สาขา 02" },
      { user:"branch03", pass:"P@ssw0rd", role:"Branch", branchId: store.branches[2]?.id||"", areas:[], label:"พนักงาน สาขา 03" },
      { user:"areaBkk",  pass:"P@ssw0rd", role:"Area",   branchId:"", areas:[allAreas[0]||"BKK-Central"], label:"Area Manager BKK" },
      { user:"qc02",     pass:"P@ssw0rd", role:"QC",     branchId:"", areas:[], label:"QC อุษา" },
      { user:"admin02",  pass:"P@ssw0rd", role:"Admin",  branchId:"", areas:[], label:"Admin สำรอง" },
    ]);
  };

  /* ----- CSV download template ----- */
  const downloadTemplate = () => {
    const lines = [];
    lines.push("# TeaLog · Template เพิ่มผู้ใช้");
    lines.push("# คอลัมน์: username,password,role,branchId,areas,label");
    lines.push("# role ต้องเป็น: Branch | Area | QC | Admin");
    lines.push("# Branch ระบุ branchId (เช่น BR01) · Area ระบุ areas คั่นด้วย | เช่น BKK-North|BKK-Central");
    lines.push(`# รหัสสาขาที่มี: ${store.branches.map(b=>b.id).join(", ")}`);
    lines.push(`# พื้นที่ที่มี: ${allAreas.join(", ")}`);
    lines.push("username,password,role,branchId,areas,label");
    // example rows
    lines.push(`branch02,P@ssw0rd,Branch,${store.branches[1]?.id||"BR02"},,พนักงาน สาขา 02`);
    lines.push(`areaBkk,P@ssw0rd,Area,,${allAreas.slice(0,2).join("|")},Area Manager BKK`);
    lines.push(`qc02,P@ssw0rd,QC,,,QC อุษา`);
    lines.push(`admin02,P@ssw0rd,Admin,,,Admin สำรอง`);
    // BOM-prefixed for Excel Thai support
    const csv = "\uFEFF" + lines.join("\r\n") + "\r\n";
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tealog-users-template-${todayISO()}.csv`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    toast("ดาวน์โหลด template แล้ว", "ok");
  };

  /* ----- CSV upload parse ----- */
  const fileInputRef = useRef(null);
  const onUploadClick = () => fileInputRef.current?.click();

  const onFileChosen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseUsersCSV(text, store.branches, allAreas);
      if (parsed.rows.length === 0){
        toast("ไม่พบข้อมูลในไฟล์", "bad");
        return;
      }
      setBulkRows(parsed.rows);
      const warnMsg = parsed.warnings.length ? ` (มีข้อควรตรวจสอบ ${parsed.warnings.length})` : "";
      toast(`อัพโหลด ${parsed.rows.length} แถว${warnMsg}`, parsed.warnings.length ? "warn" : "ok");
    } catch(err){
      toast("อ่านไฟล์ไม่สำเร็จ: " + err.message, "bad");
    } finally {
      e.target.value = "";
    }
  };

  const counts = useMemo(() => {
    const out = { all: store.users.length };
    ROLE_OPTIONS.forEach(r => { out[r] = store.users.filter(u=>u.role===r).length; });
    return out;
  }, [store.users]);

  return (
    <>
      <PageHeader
        eyebrow="User Management"
        title="จัดการผู้ใช้"
        subtitle={`มีผู้ใช้ ${store.users.length} คน · กำหนดสิทธิ์ตาม Role`}
        right={
          <div style={{display:"flex", gap:10}}>
            <button className="btn ghost" onClick={()=>{ setSingleForm(emptyUser()); setEditing(null); setOpenSingle(true); }}>
              <Icon name="plus" size={14}/> เพิ่มทีละคน
            </button>
            <button className="btn amber" onClick={()=>setOpenBulk(true)}>
              <Icon name="plus" size={14}/> เพิ่มหลายคนพร้อมกัน
            </button>
          </div>
        }
      />

      {/* role counts */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:14, marginBottom:20}} className="fade-up">
        <RoleStat label="ทั้งหมด"      n={counts.all}    color="var(--ink)"           active={filterRole==="all"}    onClick={()=>setFilterRole("all")}/>
        {ROLE_OPTIONS.map(r => (
          <RoleStat key={r} label={ROLE_TH[r]} n={counts[r]} color={ROLE_COLOR[r]} active={filterRole===r} onClick={()=>setFilterRole(r)}/>
        ))}
      </div>

      <div style={{maxWidth:380, marginBottom:14}}>
        <SearchBox value={q} onChange={setQ} placeholder="ค้นหา username, ชื่อ..."/>
      </div>

      <div className="card" style={{overflow:"hidden"}}>
        {filtered.length===0
          ? <Empty icon="user" title="ไม่พบผู้ใช้" subtitle="ลองล้างตัวกรองหรือเพิ่มผู้ใช้ใหม่"/>
          : (
            <table className="t">
              <thead>
                <tr>
                  <th>Username</th><th>ชื่อแสดง</th><th>Role</th><th>สาขา / พื้นที่</th>
                  <th>รหัสผ่าน</th><th style={{width:130}}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const branch = u.branchId ? store.branches.find(b=>b.id===u.branchId) : null;
                  return (
                    <tr key={u.user}>
                      <td className="font-mono" style={{fontSize:13, color:"var(--ink)", fontWeight:500}}>{u.user}</td>
                      <td>{u.label || <span style={{color:"var(--ink-3)"}}>—</span>}</td>
                      <td>
                        <span className="badge" style={{
                          background: `color-mix(in oklch, ${ROLE_COLOR[u.role]} 18%, white)`,
                          color: ROLE_COLOR[u.role],
                          fontWeight:500,
                        }}><span className="dot"/>{ROLE_TH[u.role]}</span>
                      </td>
                      <td style={{fontSize:13, color:"var(--ink-2)"}}>
                        {u.role==="Branch" && branch && <>{branch.name}</>}
                        {u.role==="Area" && (u.areas||[]).length>0 && (u.areas||[]).map(a => <span key={a} className="badge" style={{marginRight:4}}>{a}</span>)}
                        {(u.role==="QC" || u.role==="Admin") && <span style={{color:"var(--ink-3)"}}>ทุกสาขา</span>}
                        {u.role==="Branch" && !branch && <span style={{color:"var(--bad)"}}>ยังไม่ผูกสาขา</span>}
                        {u.role==="Area" && (u.areas||[]).length===0 && <span style={{color:"var(--bad)"}}>ยังไม่ผูกพื้นที่</span>}
                      </td>
                      <td className="font-mono" style={{fontSize:12, color:"var(--ink-3)"}}>
                        {u.pass.slice(0,2) + "•".repeat(Math.max(u.pass.length-2,0))}
                      </td>
                      <td style={{textAlign:"right"}}>
                        <button className="btn ghost sm" onClick={()=>onEdit(u)} style={{marginRight:6}}><Icon name="edit" size={12}/></button>
                        <button className="btn ghost sm" onClick={()=>onDelete(u.user)}><Icon name="trash" size={12}/></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
      </div>

      {/* SINGLE modal */}
      <Modal open={openSingle} onClose={()=>{setOpenSingle(false); setEditing(null);}} title={editing?"แก้ไขผู้ใช้":"เพิ่มผู้ใช้ใหม่"} width={520}
        footer={<>
          <button className="btn ghost" onClick={()=>{setOpenSingle(false); setEditing(null);}}>ยกเลิก</button>
          <button className="btn amber" onClick={submitSingle}><Icon name="check" size={14}/> บันทึก</button>
        </>}>
        <UserFormFields form={singleForm} setForm={setSingleForm} branches={store.branches} areas={allAreas} disableUser={!!editing}/>
      </Modal>

      {/* BULK modal */}
      <Modal open={openBulk} onClose={()=>setOpenBulk(false)} title="เพิ่มผู้ใช้หลายคนพร้อมกัน" width={1100}
        footer={<>
          <span style={{marginRight:"auto", fontSize:13, color:"var(--ink-3)"}}>
            <Icon name="sparkle" size={12} style={{verticalAlign:"-2px", marginRight:4}}/>
            กรอกแถวว่างจะถูกข้าม · กดปุ่ม "+ เพิ่มแถว" ด้านล่างสำหรับเพิ่มอีก
          </span>
          <button className="btn ghost" onClick={()=>setOpenBulk(false)}>ยกเลิก</button>
          <button className="btn amber" onClick={submitBulk}><Icon name="check" size={14}/> เพิ่มทั้งหมด</button>
        </>}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, fontSize:13, flexWrap:"wrap", gap:10}}>
          <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
            <button className="btn ghost sm" onClick={downloadTemplate}>
              <Icon name="arrow-down" size={12}/> ดาวน์โหลด Template CSV
            </button>
            <button className="btn ghost sm" onClick={onUploadClick}>
              <Icon name="arrow-up" size={12}/> อัพโหลดไฟล์ CSV
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={onFileChosen} style={{display:"none"}}/>
            <div style={{width:1, height:24, background:"var(--line-2)"}}/>
            <button className="btn ghost sm" onClick={fillBulkTemplate}><Icon name="sparkle" size={12}/> ตัวอย่าง</button>
            <button className="btn ghost sm" onClick={clearBulk}><Icon name="x" size={12}/> เคลียร์</button>
          </div>
          <div style={{color:"var(--ink-3)"}}>
            {bulkRows.filter(r=>r.user).length} แถวพร้อมบันทึก
          </div>
        </div>

        {/* CSV format hint */}
        <div style={{
          padding:"10px 14px", background:"var(--bg)", border:"1px dashed var(--line-2)", borderRadius:10,
          fontSize:12, color:"var(--ink-3)", marginBottom:14, display:"flex", gap:10, alignItems:"flex-start"
        }}>
          <Icon name="sparkle" size={14} style={{marginTop:2, color:"var(--amber)"}}/>
          <div>
            <div style={{color:"var(--ink-2)", fontWeight:500, marginBottom:2}}>รูปแบบไฟล์ CSV</div>
            <div>คอลัมน์: <span className="font-mono">username, password, role, branchId, areas, label</span> · role = <span className="font-mono">Branch|Area|QC|Admin</span> · หลาย areas คั่นด้วย <span className="font-mono">|</span> เช่น <span className="font-mono">BKK-North|BKK-Central</span></div>
          </div>
        </div>

        <div style={{overflow:"auto", maxHeight:"60vh", border:"1px solid var(--line)", borderRadius:12}}>
          <table className="t" style={{minWidth:1000}}>
            <thead style={{position:"sticky", top:0, background:"var(--paper)", zIndex:1}}>
              <tr>
                <th style={{width:36}}>#</th>
                <th>Username *</th>
                <th>รหัสผ่าน *</th>
                <th style={{width:140}}>Role *</th>
                <th>ผูกสาขา / พื้นที่</th>
                <th>ชื่อแสดง</th>
                <th style={{width:50}}></th>
              </tr>
            </thead>
            <tbody>
              {bulkRows.map((row, i) => (
                <BulkRow key={i}
                  i={i}
                  row={row}
                  onChange={(p) => updateRow(i, p)}
                  onRemove={() => removeBulkRow(i)}
                  branches={store.branches}
                  areas={allAreas}
                />
              ))}
              <tr>
                <td colSpan={7} style={{textAlign:"center", padding:14, background:"var(--bg)"}}>
                  <button className="btn ghost sm" onClick={addBulkRow}>
                    <Icon name="plus" size={12}/> เพิ่มแถว
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
}

function RoleStat({label, n, color, active, onClick}){
  return (
    <button onClick={onClick}
      style={{
        textAlign:"left", padding:"16px 18px", borderRadius:14, cursor:"pointer",
        background: active ? color : "var(--paper)",
        color: active ? "#fffdf7" : "var(--ink)",
        border: `1px solid ${active ? color : "var(--line)"}`,
        fontFamily:"inherit", transition:"all 200ms",
        boxShadow: active ? "var(--shadow)" : "var(--shadow-sm)",
        transform: active ? "translateY(-1px)" : "none",
      }}
      onMouseEnter={e=>{ if (!active){ e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = "translateY(-1px)"; } }}
      onMouseLeave={e=>{ if (!active){ e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.transform = "none"; } }}
    >
      <div style={{fontSize:11, letterSpacing:".06em", textTransform:"uppercase", opacity: active ? .8 : .6, marginBottom:6}}>{label}</div>
      <div className="num font-display" style={{fontSize:30, fontWeight:600, lineHeight:1}}>{n}</div>
    </button>
  );
}

function UserFormFields({form, setForm, branches, areas, disableUser}){
  return (
    <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
      <label className="field">
        <span>Username</span>
        <input className="inp" value={form.user} onChange={e=>setForm({...form, user:e.target.value})} disabled={disableUser}/>
      </label>
      <label className="field">
        <span>รหัสผ่าน</span>
        <input className="inp" value={form.pass} onChange={e=>setForm({...form, pass:e.target.value})}/>
      </label>
      <label className="field" style={{gridColumn:"1/-1"}}>
        <span>ชื่อแสดง</span>
        <input className="inp" value={form.label} onChange={e=>setForm({...form, label:e.target.value})} placeholder="ชื่อ-นามสกุล / ชื่อเล่น"/>
      </label>
      <label className="field" style={{gridColumn:"1/-1"}}>
        <span>Role</span>
        <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:8}}>
          {ROLE_OPTIONS.map(r => (
            <button key={r} onClick={()=>setForm({...form, role:r, branchId:"", areas:[]})}
              style={{
                padding:"12px 8px", borderRadius:10, cursor:"pointer", fontFamily:"inherit",
                background: form.role===r ? ROLE_COLOR[r] : "var(--paper)",
                color: form.role===r ? "#fffdf7" : "var(--ink)",
                border: `1px solid ${form.role===r ? ROLE_COLOR[r] : "var(--line-2)"}`,
                fontSize:13, fontWeight:500, transition:"all 140ms",
              }}>
              {ROLE_TH[r]}
            </button>
          ))}
        </div>
      </label>
      {form.role==="Branch" && (
        <label className="field fade-up" style={{gridColumn:"1/-1"}}>
          <span>ผูกสาขา</span>
          <select className="inp" value={form.branchId} onChange={e=>setForm({...form, branchId:e.target.value})}>
            <option value="">— เลือกสาขา —</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.id} · {b.name}</option>)}
          </select>
        </label>
      )}
      {form.role==="Area" && (
        <label className="field fade-up" style={{gridColumn:"1/-1"}}>
          <span>ผูกพื้นที่ (เลือกได้หลายอัน)</span>
          <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
            {areas.map(a => {
              const active = (form.areas||[]).includes(a);
              return (
                <button key={a} className={`chip ${active?"active":""}`}
                  onClick={()=>{
                    const next = active ? form.areas.filter(x=>x!==a) : [...(form.areas||[]), a];
                    setForm({...form, areas: next});
                  }}>{a}</button>
              );
            })}
          </div>
        </label>
      )}
    </div>
  );
}

function BulkRow({i, row, onChange, onRemove, branches, areas}){
  return (
    <tr>
      <td style={{color:"var(--ink-3)", fontSize:12}}>{i+1}</td>
      <td>
        <input className="inp" style={inputCellStyle} value={row.user} onChange={e=>onChange({user:e.target.value})} placeholder="username"/>
      </td>
      <td>
        <input className="inp" style={inputCellStyle} value={row.pass} onChange={e=>onChange({pass:e.target.value})} placeholder="password"/>
      </td>
      <td>
        <select className="inp" style={inputCellStyle} value={row.role} onChange={e=>onChange({role:e.target.value, branchId:"", areas:[]})}>
          {ROLE_OPTIONS.map(r=> <option key={r} value={r}>{ROLE_TH[r]}</option>)}
        </select>
      </td>
      <td>
        {row.role==="Branch" ? (
          <select className="inp" style={inputCellStyle} value={row.branchId} onChange={e=>onChange({branchId:e.target.value})}>
            <option value="">— เลือกสาขา —</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.id} · {b.name}</option>)}
          </select>
        ) : row.role==="Area" ? (
          <div style={{display:"flex", flexWrap:"wrap", gap:4}}>
            {areas.map(a => {
              const active = (row.areas||[]).includes(a);
              return (
                <button key={a} type="button"
                  className={`chip ${active?"active":""}`}
                  style={{padding:"4px 10px", fontSize:11}}
                  onClick={()=>{
                    const next = active ? row.areas.filter(x=>x!==a) : [...(row.areas||[]), a];
                    onChange({areas: next});
                  }}>{a}</button>
              );
            })}
          </div>
        ) : (
          <span style={{color:"var(--ink-3)", fontSize:13}}>เข้าถึงได้ทุกสาขา</span>
        )}
      </td>
      <td>
        <input className="inp" style={inputCellStyle} value={row.label} onChange={e=>onChange({label:e.target.value})} placeholder="ชื่อแสดง"/>
      </td>
      <td>
        <button className="btn ghost sm" onClick={onRemove}><Icon name="x" size={12}/></button>
      </td>
    </tr>
  );
}

const inputCellStyle = { padding:"7px 10px", fontSize:13 };

function validateUser(u, existing, editingUser){
  if (!u.user || !u.user.trim()) return "ระบุ username";
  if (!u.pass || !u.pass.trim()) return "ระบุรหัสผ่าน";
  if (!u.role) return "ระบุ role";
  if (!editingUser){
    if (existing.some(x => x.user.toLowerCase() === u.user.toLowerCase())) return `username "${u.user}" ซ้ำ`;
  }
  if (u.role==="Branch" && !u.branchId) return "Branch ต้องเลือกสาขา";
  if (u.role==="Area"   && (!u.areas || u.areas.length===0)) return "Area ต้องเลือกพื้นที่อย่างน้อย 1 อัน";
  return null;
}

Object.assign(window, { AdminUsers });

/* ---------- CSV parser for users ---------- */
function parseUsersCSV(text, branches, allAreas){
  // strip BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const lines = text.split(/\r?\n/);
  const rows = [];
  const warnings = [];
  const branchIds = new Set(branches.map(b=>b.id));
  const areaSet   = new Set(allAreas);
  let headerSeen = false;
  let colIdx = { user:0, pass:1, role:2, branchId:3, areas:4, label:5 };

  lines.forEach((line, lineNo) => {
    const raw = line.trim();
    if (!raw) return;
    if (raw.startsWith("#")) return; // comment
    const cells = splitCSVRow(raw);
    if (!cells.length) return;

    // detect header
    const lower = cells.map(c=>c.toLowerCase().trim());
    if (!headerSeen && (lower.includes("username") || lower.includes("user"))){
      // map columns by name if present
      lower.forEach((name, idx) => {
        if (name==="username" || name==="user") colIdx.user = idx;
        else if (name==="password" || name==="pass") colIdx.pass = idx;
        else if (name==="role") colIdx.role = idx;
        else if (name==="branchid" || name==="branch") colIdx.branchId = idx;
        else if (name==="areas" || name==="area") colIdx.areas = idx;
        else if (name==="label" || name==="name" || name==="displayname") colIdx.label = idx;
      });
      headerSeen = true;
      return;
    }

    const get = (k) => (cells[colIdx[k]] || "").trim();
    const user = get("user");
    const pass = get("pass");
    let role   = get("role");
    const branchId = get("branchId");
    const areasRaw = get("areas");
    const label = get("label");

    if (!user) return; // skip blank lines

    // normalize role (case-insensitive)
    const roleMatch = ROLE_OPTIONS.find(r => r.toLowerCase() === role.toLowerCase());
    if (!roleMatch){
      warnings.push(`บรรทัด ${lineNo+1}: role "${role}" ไม่ถูกต้อง — ใช้ Branch แทน`);
      role = "Branch";
    } else role = roleMatch;

    let bId = "";
    if (role === "Branch"){
      if (branchId && branchIds.has(branchId)) bId = branchId;
      else if (branchId) warnings.push(`บรรทัด ${lineNo+1}: branchId "${branchId}" ไม่พบในระบบ`);
    }

    let areas = [];
    if (role === "Area"){
      const list = areasRaw.split(/[|;,]/).map(a=>a.trim()).filter(Boolean);
      list.forEach(a => {
        if (areaSet.has(a)) areas.push(a);
        else warnings.push(`บรรทัด ${lineNo+1}: พื้นที่ "${a}" ไม่พบในระบบ`);
      });
    }

    rows.push({ user, pass, role, branchId: bId, areas, label });
  });

  return { rows, warnings };
}

function splitCSVRow(line){
  // Minimal CSV splitter that supports double-quoted fields with comma inside.
  const out = [];
  let cur = "";
  let inQuote = false;
  for (let i=0; i<line.length; i++){
    const ch = line[i];
    if (inQuote){
      if (ch === '"' && line[i+1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuote = false; }
      else cur += ch;
    } else {
      if (ch === ',') { out.push(cur); cur = ""; }
      else if (ch === '"') inQuote = true;
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

Object.assign(window, { parseUsersCSV });
