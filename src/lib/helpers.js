export const todayISO = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  return `${parts.find(p=>p.type==='year').value}-${parts.find(p=>p.type==='month').value}-${parts.find(p=>p.type==='day').value}`;
};

export const nowHM = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  return `${parts.find(p=>p.type==='hour').value}:${parts.find(p=>p.type==='minute').value}`;
};

export const fmtDateTH = (iso) => {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' });
};

export const fmtNum = (n) => Number(n || 0).toLocaleString('en-US');

export const greetingTH = () => {
  const h = new Date().getHours();
  if (h < 11) return 'อรุณสวัสดิ์';
  if (h < 14) return 'สวัสดีตอนเที่ยง';
  if (h < 17) return 'สวัสดีตอนบ่าย';
  return 'สวัสดีตอนเย็น';
};

export function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
