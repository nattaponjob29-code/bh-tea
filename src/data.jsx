/* =========================================================
   DATA — seed + persistence
   ========================================================= */

const STORAGE_KEY = "tealog_v3";

const DEFAULT_BRANCHES = [
  { id: "BR01", name: "สาขาเซ็นทรัลลาดพร้าว",  area: "BKK-North" },
  { id: "BR02", name: "สาขาสยามสแควร์วัน",     area: "BKK-Central" },
  { id: "BR03", name: "สาขาเอ็มควอเทียร์",      area: "BKK-Central" },
  { id: "BR04", name: "สาขาเซ็นทรัลเวสต์เกต",   area: "BKK-West" },
  { id: "BR05", name: "สาขาฟิวเจอร์พาร์ครังสิต",  area: "BKK-North" },
  { id: "BR06", name: "สาขาเชียงใหม่นิมมาน",     area: "Upcountry" },
  { id: "BR07", name: "สาขาภูเก็ตเซ็นทรัล",       area: "Upcountry" },
];

const DEFAULT_MENUS = [
  { id: "M01", name: "เบสชาดำเข้มข้น",        category: "เบส",   yield: 5000, unit: "มล." },
  { id: "M02", name: "เบสครีมมี่",            category: "เบส",   yield: 4000, unit: "มล." },
  { id: "M03", name: "เบสชามะลิ",             category: "เบส",   yield: 5000, unit: "มล." },
  { id: "M04", name: "เบสชาไทยคาราเมลไลซ์",   category: "เบส",   yield: 4500, unit: "มล." },
  { id: "M05", name: "ชาฟองหมอหมื่นลี้",       category: "เครื่องดื่ม", yield: 30, unit: "แก้ว" },
  { id: "M06", name: "ชาฟองมะลิ (3.3)",       category: "3.3",   yield: 30, unit: "แก้ว" },
  { id: "M07", name: "ชานมมะลิ (3.3)",        category: "3.3",   yield: 30, unit: "แก้ว" },
  { id: "M08", name: "ชาไทยคาราเมลไลซ์ (3.3)", category: "3.3",   yield: 30, unit: "แก้ว" },
  { id: "M09", name: "ชาดำยูซุ (3.3)",        category: "3.3",   yield: 30, unit: "แก้ว" },
  { id: "M10", name: "ไข่มุกโมจิ",             category: "ท็อปปิ้ง", yield: 1500, unit: "กรัม" },
  { id: "M11", name: "นุ่มชีส",                category: "ท็อปปิ้ง", yield: 1000, unit: "กรัม" },
  { id: "M12", name: "มูนโมจิ",                category: "ท็อปปิ้ง", yield: 1200, unit: "กรัม" },
];

const DEFAULT_INGREDIENTS = [
  { code: "RM-00179", name: "ไข่มุกโมจิแช่แข็ง",                          unit: "ถุง"   },
  { code: "RM-00240", name: "เนื้อเผือกนุ่ม",                            unit: "ถุง"   },
  { code: "SM-00055", name: "เย็นเย็นเจลลี่",                           unit: "ถุง"   },
  { code: "RM-00250", name: "ใบชาไทยคาราเมลไรซ์",                       unit: "ถุง"   },
  { code: "RM-00219", name: "เนื้อมะพร้าวน้ำหอมตัดเส้นแช่แข็ง",  unit: "ถุง"   },
  { code: "RM-00015", name: "น้ำตาลทรายขาวละเอียด เบเกอรี",              unit: "ลัง"   },
  { code: "RM-00017", name: "น้ำส้มยูซุ",                                unit: "ขวด"   },
  { code: "RM-00253", name: "น้ำนมโคพาสเจอร์ไรส์",                      unit: "แกลลอน" },
  { code: "RM-00239", name: "ข้าวเหนียวมูนแช่แข็ง",                  unit: "ถุง"   },
  { code: "RM-00214", name: "ใบชาหอมหมื่นลี้ K",                       unit: "ถุง"   },
  { code: "RM-00216", name: "ใบชาหอมหมื่นลี้ J",                       unit: "ถุง"   },
  { code: "RM-00237", name: "แป้งมูนโมจิสำเร็จรูป",                       unit: "ถุง"   },
  { code: "RM-00178", name: "ไซรัปมะพร้าว",                              unit: "ถุง"   },
  { code: "RM-00074", name: "ผงวิปปิ้งครีม ชนิดหวาน",                  unit: "ถุง"   },
  { code: "RM-00012", name: "น้ำเชื่อมสำเร็จรูป 800 ml",              unit: "ถุง"   },
  { code: "RM-00236", name: "ชาดำ อัสสัม (ASSAM BLACK TEA)",       unit: "แพ็ค"  },
  { code: "RM-00153", name: "นิวชาเทลครีมชีส",                          unit: "กล่อง"  },
  { code: "RM-00238", name: "พรีมิกซ์นุ่มชีส ตราแบร์เฮาส์",            unit: "ลัง"   },
  { code: "RM-00235", name: "ใบชามะลิ ตราแบร์เฮ้าส์",                  unit: "แพ็ค"  },
  { code: "RM-00231", name: "องุ่นแดงไร้เมล็ด",                          unit: "ลัง"   },
  { code: "RM-00079", name: "NON DAIRY CREAMER",                       unit: "ลัง"   },
  { code: "RM-00159", name: "ครีมเทียมข้นหวานชนิดพร่องมันเนย",       unit: "ลัง"   },
];

const DEFAULT_BOM_PROD = {
  // menuId -> [{code}]  — รายการวัตถุดิบที่ใช้ผลิตล็อตนี้
};

const DEFAULT_BOM_DEFECT = {
  // menuId -> [{code, qty}]  — ปริมาณต่อกรัมของเบส (per gram)
};

const DEFECT_REASONS = [
  "วัตถุดิบหมดอายุ", "ตักล้น/หกระหว่างผลิต", "ปั่นไม่ละเอียด",
  "ลูกค้ายกเลิก", "ทำผิดสูตร", "อุปกรณ์เสีย", "อื่นๆ"
];

const FAIL_REASONS = [
  "สี/กลิ่นไม่ผ่าน", "ความเข้มข้นต่ำ", "ตกตะกอน", "เก็บอุณหภูมิไม่ได้", "อื่นๆ"
];

/* ---- default users (demo accounts seed) ---- */
const DEFAULT_USERS = [
  { user:"Branch", pass:"Branch", role:"Branch", branchId:"BR01", label:"คุณนาย (สาขาลาดพร้าว)", areas:[] },
  { user:"Area",   pass:"Area",   role:"Area",   branchId:"",     label:"คุณวิภา (Area BKK)",      areas:["BKK-North","BKK-Central"] },
  { user:"QC",     pass:"QC",     role:"QC",     branchId:"",     label:"ทีม QC กลาง",          areas:[] },
  { user:"Admin",  pass:"Admin",  role:"Admin",  branchId:"",     label:"ผู้ดูแลระบบ",            areas:[] },
];

/* ---- generate seed batch records ---- */
function seedRecords() {
  const today = new Date();
  const records = [];
  const branches = DEFAULT_BRANCHES;
  const menus = DEFAULT_MENUS;
  let counter = 1;
  for (let d = 0; d < 14; d++) {
    const day = new Date(today); day.setDate(today.getDate() - d);
    const dayStr = day.toISOString().slice(0,10);
    branches.forEach(b => {
      const numBatches = 2 + Math.floor(Math.random()*4);
      for (let i=0;i<numBatches;i++){
        const m = menus[Math.floor(Math.random()*menus.length)];
        const passed = Math.random() > 0.12;
        records.push({
          id: `LOT-${dayStr.replace(/-/g,"")}-${String(counter).padStart(4,"0")}`,
          type: "production",
          date: dayStr,
          time: `${String(7+Math.floor(Math.random()*12)).padStart(2,"0")}:${String(Math.floor(Math.random()*60)).padStart(2,"0")}`,
          branchId: b.id,
          menuId: m.id,
          qty: m.yield,
          unit: m.unit,
          status: passed ? "passed" : "failed",
          reason: passed ? "" : FAIL_REASONS[Math.floor(Math.random()*FAIL_REASONS.length)],
          note: "",
          by: "พนักงานกะเช้า"
        });
        counter++;
      }
      // defect records
      if (Math.random() > 0.55){
        const m = menus[Math.floor(Math.random()*menus.length)];
        records.push({
          id: `DEF-${dayStr.replace(/-/g,"")}-${String(counter).padStart(4,"0")}`,
          type: "defect",
          date: dayStr,
          time: `${String(10+Math.floor(Math.random()*10)).padStart(2,"0")}:${String(Math.floor(Math.random()*60)).padStart(2,"0")}`,
          branchId: b.id,
          menuId: m.id,
          qty: Math.ceil(Math.random()*4) * 100,
          unit: m.unit,
          reason: DEFECT_REASONS[Math.floor(Math.random()*DEFECT_REASONS.length)],
          note: "",
          by: "พนักงานกะบ่าย"
        });
        counter++;
      }
    });
  }
  return records;
}

function loadStore(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (!s.users) s.users = DEFAULT_USERS;
      // BOM migration v2->v3 — split bom into bomProd + bomDefect
      if (!s.bomProd){
        s.bomProd = {};
        if (s.bom){
          Object.entries(s.bom).forEach(([menuId, arr]) => {
            s.bomProd[menuId] = arr.map(b => ({ code: b.code }));
          });
        }
      }
      if (!s.bomDefect){
        s.bomDefect = {};
        if (s.bom){
          Object.entries(s.bom).forEach(([menuId, arr]) => {
            s.bomDefect[menuId] = arr.map(b => ({ code: b.code, qty: b.qty }));
          });
        }
      }
      delete s.bom; // legacy
      return s;
    }
  }catch(e){}
  const init = {
    branches: DEFAULT_BRANCHES,
    menus: DEFAULT_MENUS,
    ingredients: DEFAULT_INGREDIENTS,
    bomProd: DEFAULT_BOM_PROD,
    bomDefect: DEFAULT_BOM_DEFECT,
    users: DEFAULT_USERS,
    records: seedRecords(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
  return init;
}

function saveStore(s){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function resetStore(){
  localStorage.removeItem(STORAGE_KEY);
  return loadStore();
}

/* helpers */
/* Bangkok timezone (Asia/Bangkok, UTC+7) — fixed offset */
const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;
const bkkNow = () => new Date(Date.now() + BKK_OFFSET_MS - new Date().getTimezoneOffset()*60000);
// Simpler & reliable: compute YYYY-MM-DD and HH:mm in Asia/Bangkok via Intl
const todayISO = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year:"numeric", month:"2-digit", day:"2-digit"
  }).formatToParts(new Date());
  const y = parts.find(p=>p.type==="year").value;
  const m = parts.find(p=>p.type==="month").value;
  const d = parts.find(p=>p.type==="day").value;
  return `${y}-${m}-${d}`;
};
const nowHM = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok", hour:"2-digit", minute:"2-digit", hour12:false
  }).formatToParts(new Date());
  const h = parts.find(p=>p.type==="hour").value;
  const m = parts.find(p=>p.type==="minute").value;
  return `${h}:${m}`;
};

const fmtDateTH = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { day:"2-digit", month:"short", year:"2-digit" });
};
const fmtNum = (n) => Number(n||0).toLocaleString("en-US");

Object.assign(window, {
  STORAGE_KEY, DEFAULT_BRANCHES, DEFAULT_MENUS, DEFAULT_INGREDIENTS,
  DEFAULT_BOM_PROD, DEFAULT_BOM_DEFECT,
  DEFAULT_USERS, DEFECT_REASONS, FAIL_REASONS,
  loadStore, saveStore, resetStore, todayISO, nowHM, fmtDateTH, fmtNum,
});
