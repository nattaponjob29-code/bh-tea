export const DEFECT_REASONS = [
  'วัตถุดิบหมดอายุ', 'ตักล้น/หกระหว่างผลิต', 'ปั่นไม่ละเอียด',
  'ลูกค้ายกเลิก', 'ทำผิดสูตร', 'อุปกรณ์เสีย', 'อื่นๆ',
];

export const FAIL_REASONS = [
  'สี/กลิ่นไม่ผ่าน', 'ความเข้มข้นต่ำ', 'ตกตะกอน', 'เก็บอุณหภูมิไม่ได้', 'อื่นๆ',
];

export const ROLE_OPTIONS = ['Branch', 'Area', 'QC', 'Admin'];
export const ROLE_TH = { Branch: 'พนักงานสาขา', Area: 'Area Manager', QC: 'QC', Admin: 'ผู้ดูแลระบบ' };
export const ROLE_COLOR = { Branch: 'var(--amber)', Area: 'var(--matcha)', QC: 'var(--info)', Admin: 'var(--tea)' };

export const ROLE_DEFS = {
  Branch: { roleLabel: 'พนักงานสาขา', color: 'var(--amber)', icon: 'store' },
  Area:   { roleLabel: 'Area Manager', color: 'var(--matcha)', icon: 'shield' },
  QC:     { roleLabel: 'QC',           color: 'var(--info)',   icon: 'shield' },
  Admin:  { roleLabel: 'ผู้ดูแลระบบ',  color: 'var(--tea)',   icon: 'shield' },
};

export const DEFAULT_BRANCHES = [
  { id: 'BR01', name: 'สาขาเซ็นทรัลลาดพร้าว',   area: 'BKK-North' },
  { id: 'BR02', name: 'สาขาสยามสแควร์วัน',       area: 'BKK-Central' },
  { id: 'BR03', name: 'สาขาเอ็มควอเทียร์',        area: 'BKK-Central' },
  { id: 'BR04', name: 'สาขาเซ็นทรัลเวสต์เกต',    area: 'BKK-West' },
  { id: 'BR05', name: 'สาขาฟิวเจอร์พาร์ครังสิต',  area: 'BKK-North' },
  { id: 'BR06', name: 'สาขาเชียงใหม่นิมมาน',      area: 'Upcountry' },
  { id: 'BR07', name: 'สาขาภูเก็ตเซ็นทรัล',       area: 'Upcountry' },
];

export const DEFAULT_MENUS = [
  { id: 'M01', name: 'เบสชาดำเข้มข้น',        category: 'เบส',         yield: 5000, unit: 'มล.' },
  { id: 'M02', name: 'เบสครีมมี่',             category: 'เบส',         yield: 4000, unit: 'มล.' },
  { id: 'M03', name: 'เบสชามะลิ',              category: 'เบส',         yield: 5000, unit: 'มล.' },
  { id: 'M04', name: 'เบสชาไทยคาราเมลไลซ์',   category: 'เบส',         yield: 4500, unit: 'มล.' },
  { id: 'M05', name: 'ชาฟองหมอหมื่นลี้',       category: 'เครื่องดื่ม', yield: 30,   unit: 'แก้ว' },
  { id: 'M06', name: 'ชาฟองมะลิ (3.3)',        category: '3.3',          yield: 30,   unit: 'แก้ว' },
  { id: 'M07', name: 'ชานมมะลิ (3.3)',         category: '3.3',          yield: 30,   unit: 'แก้ว' },
  { id: 'M08', name: 'ชาไทยคาราเมลไลซ์ (3.3)', category: '3.3',         yield: 30,   unit: 'แก้ว' },
  { id: 'M09', name: 'ชาดำยูซุ (3.3)',         category: '3.3',          yield: 30,   unit: 'แก้ว' },
  { id: 'M10', name: 'ไข่มุกโมจิ',             category: 'ท็อปปิ้ง',    yield: 1500, unit: 'กรัม' },
  { id: 'M11', name: 'นุ่มชีส',                category: 'ท็อปปิ้ง',    yield: 1000, unit: 'กรัม' },
  { id: 'M12', name: 'มูนโมจิ',                category: 'ท็อปปิ้ง',    yield: 1200, unit: 'กรัม' },
];

export const DEFAULT_INGREDIENTS = [
  { code: 'RM-00179', name: 'ไข่มุกโมจิแช่แข็ง',              unit: 'ถุง' },
  { code: 'RM-00240', name: 'เนื้อเผือกนุ่ม',                 unit: 'ถุง' },
  { code: 'SM-00055', name: 'เย็นเย็นเจลลี่',                unit: 'ถุง' },
  { code: 'RM-00250', name: 'ใบชาไทยคาราเมลไรซ์',            unit: 'ถุง' },
  { code: 'RM-00219', name: 'เนื้อมะพร้าวน้ำหอมตัดเส้นแช่แข็ง', unit: 'ถุง' },
  { code: 'RM-00015', name: 'น้ำตาลทรายขาวละเอียด เบเกอรี',   unit: 'ลัง' },
  { code: 'RM-00017', name: 'น้ำส้มยูซุ',                      unit: 'ขวด' },
  { code: 'RM-00253', name: 'น้ำนมโคพาสเจอร์ไรส์',            unit: 'แกลลอน' },
  { code: 'RM-00239', name: 'ข้าวเหนียวมูนแช่แข็ง',           unit: 'ถุง' },
  { code: 'RM-00214', name: 'ใบชาหอมหมื่นลี้ K',              unit: 'ถุง' },
  { code: 'RM-00216', name: 'ใบชาหอมหมื่นลี้ J',              unit: 'ถุง' },
  { code: 'RM-00237', name: 'แป้งมูนโมจิสำเร็จรูป',            unit: 'ถุง' },
  { code: 'RM-00178', name: 'ไซรัปมะพร้าว',                   unit: 'ถุง' },
  { code: 'RM-00074', name: 'ผงวิปปิ้งครีม ชนิดหวาน',         unit: 'ถุง' },
  { code: 'RM-00012', name: 'น้ำเชื่อมสำเร็จรูป 800 ml',      unit: 'ถุง' },
  { code: 'RM-00236', name: 'ชาดำ อัสสัม (ASSAM BLACK TEA)', unit: 'แพ็ค' },
  { code: 'RM-00153', name: 'นิวชาเทลครีมชีส',                unit: 'กล่อง' },
  { code: 'RM-00238', name: 'พรีมิกซ์นุ่มชีส ตราแบร์เฮาส์',  unit: 'ลัง' },
  { code: 'RM-00235', name: 'ใบชามะลิ ตราแบร์เฮ้าส์',         unit: 'แพ็ค' },
  { code: 'RM-00231', name: 'องุ่นแดงไร้เมล็ด',               unit: 'ลัง' },
  { code: 'RM-00079', name: 'NON DAIRY CREAMER',              unit: 'ลัง' },
  { code: 'RM-00159', name: 'ครีมเทียมข้นหวานชนิดพร่องมันเนย', unit: 'ลัง' },
];
