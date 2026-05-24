# BH Tea Production Log · Setup Guide

Stack: **Vite + React 18 + Supabase (Auth + DB) + Vercel**  
ทุกอย่าง free tier — Supabase Free + Vercel Hobby

---

## 1. สร้าง Supabase Project

1. ไปที่ [supabase.com](https://supabase.com) → **New Project**
2. ตั้งชื่อ project เช่น `bh-tea` → เลือก region ใกล้ไทย (`Southeast Asia`)
3. ตั้ง **Database Password** (เก็บไว้) → **Create New Project** (รอ ~2 นาที)

---

## 2. รัน Schema + Seed

ไปที่ **SQL Editor** → **New Query**

**รอบที่ 1** — paste เนื้อหาจากไฟล์ `supabase/schema.sql` ทั้งหมด → **Run**

**รอบที่ 2** — paste เนื้อหาจากไฟล์ `supabase/seed.sql` ทั้งหมด → **Run**

ตรวจสอบ: ไปที่ **Table Editor** จะเห็น tables: `branches`, `menus`, `ingredients`, `bom_prod`, `bom_defect`, `records`, `profiles`

---

## 3. เอา API Keys

ไปที่ **Project Settings → API**

คัดลอก 3 ค่า:
| ค่า | ใช้ที่ไหน |
|-----|----------|
| **Project URL** | `VITE_SUPABASE_URL` และ `SUPABASE_URL` |
| **anon public** key | `VITE_SUPABASE_ANON_KEY` |
| **service_role** key | `SUPABASE_SERVICE_ROLE_KEY` (⚠️ เก็บเป็นความลับ) |

---

## 4. ตั้งค่า Local

```bash
cp .env.example .env.local
```

แก้ไข `.env.local`:
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key...
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...
```

---

## 5. ติดตั้งและรัน Local

```bash
npm install
npm run dev
```

เปิด http://localhost:5173

---

## 6. สร้าง Admin User คนแรก

เพราะ Admin user ต้องมีอยู่ก่อน จึงต้องสร้างผ่าน Supabase Dashboard ครั้งแรก:

1. ไปที่ **Authentication → Users → Add User**
2. Email: `admin@bh.local` (หรือ `your-username@bh.local`)
3. Password: ตั้งตามต้องการ
4. เช็ค **Auto Confirm User**

จากนั้นไปที่ **SQL Editor** รัน:
```sql
insert into profiles (id, username, role, label)
select id, 'admin', 'Admin', 'ผู้ดูแลระบบ'
from auth.users
where email = 'admin@bh.local'
on conflict (id) do update set role = 'Admin', username = 'admin';
```
*(เปลี่ยน `admin` และ `admin@bh.local` ให้ตรงกับที่สร้าง)*

---

## 7. Deploy ไป Vercel

### Push ขึ้น GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/bh-tea.git
git push -u origin main
```

### Connect Vercel
1. ไปที่ [vercel.com](https://vercel.com) → **New Project**
2. Import จาก GitHub repository
3. Framework: **Vite** (detect อัตโนมัติ)
4. **Environment Variables** — เพิ่ม 4 ค่า:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. **Deploy**

⚠️ `SUPABASE_SERVICE_ROLE_KEY` ต้องเพิ่มใน Vercel env เท่านั้น ห้ามใส่ใน `.env.local` ที่ push ขึ้น git (ไฟล์ `.env.local` อยู่ใน `.gitignore` แล้ว)

---

## 8. เพิ่ม Supabase Redirect URL (ถ้าใช้ magic link)

ไปที่ **Authentication → URL Configuration → Redirect URLs**  
เพิ่ม: `https://your-app.vercel.app/**`

---

## สรุป Roles

| Role | สิทธิ์ |
|------|--------|
| **Branch** | บันทึกการผลิต + ของเสียของสาขาตัวเอง |
| **Area** | ดูภาพรวมสาขาในพื้นที่ที่รับผิดชอบ |
| **QC** | ดูทุกสาขา วิเคราะห์คุณภาพ |
| **Admin** | จัดการ master data + ผู้ใช้ทุกอย่าง |

Login format: ใช้ `username` (ไม่ต้องใส่ `@bh.local`)  
ระบบเติม email ให้อัตโนมัติเป็น `username@bh.local`

---

## Troubleshooting

**Login แล้ว "ไม่พบข้อมูลผู้ใช้"**  
→ ตรวจสอบว่า profile ถูกสร้างใน `profiles` table แล้ว

**API route 401/403**  
→ ตรวจสอบว่า `SUPABASE_SERVICE_ROLE_KEY` ตั้งค่าใน Vercel env ถูกต้อง

**ข้อมูลไม่โหลด**  
→ ตรวจสอบ RLS policies ใน Supabase Dashboard → Authentication → Policies

**Build fail**  
→ รัน `npm run build` ใน local ก่อน deploy เพื่อดู error
