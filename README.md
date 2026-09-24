# ชีทพิบูล — รวมชีทสรุป ม.4–6 (Next.js + Supabase)

เว็บแบ่งปันชีทสรุปของนักเรียนพิบูลวิทยาลัย
Next.js 16 (App Router) · Supabase (Postgres + Auth + Storage) · Login ด้วย Google · สิทธิ์ user / admin

## สิทธิ์การใช้งาน

| ทำอะไรได้ | ไม่ได้ login | user | admin |
|---|:-:|:-:|:-:|
| ดู / ค้นหา / เปิดอ่านชีท | ✓ | ✓ | ✓ |
| แบ่งปันชีท (อัปโหลดไฟล์ / แปะลิงก์) | | ✓ | ✓ |
| แก้ไข / ลบชีทของตัวเอง | | ✓ | ✓ |
| กดหัวใจ · แจ้งปัญหา | | ✓ | ✓ |
| ซ่อน / แก้ / ลบชีทของทุกคน | | | ✓ |
| ดูและปิดรายงานปัญหา | | | ✓ |
| ตั้ง/ถอดสิทธิ์แอดมิน · ระงับผู้ใช้ | | | ✓ |

**Login ได้เฉพาะอีเมล @pibul.ac.th** — บัญชีอื่นสมัครไม่ได้ (trigger ใน DB) และบัญชีเก่าที่ไม่ใช่อีเมลโรงเรียนจะไม่มีสิทธิ์ใด ๆ

สิทธิ์ถูกบังคับใช้ 3 ชั้น: `proxy.ts` (ต้อง login) → ตรวจ role ในหน้า/Server Action → **Row Level Security ในฐานข้อมูล** (ชั้นที่สำคัญที่สุด ต่อให้มีคนยิง API ตรงก็ข้ามไม่ได้)

## ตั้งค่าครั้งแรก

### 1. Supabase
1. สร้างโปรเจกต์ที่ https://supabase.com
2. **SQL Editor** → วางเนื้อหา `supabase/schema.sql` ทั้งไฟล์ → Run
3. **Project Settings → API** → คัดลอก Project URL และ `anon` public key

### 2. Google Login
1. ไปที่ https://console.cloud.google.com → สร้างโปรเจกต์ → **APIs & Services → OAuth consent screen** (External) กรอกชื่อแอป "ชีทพิบูล"
2. **Credentials → Create credentials → OAuth client ID** → Web application
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback` (ดูได้ในหน้า Supabase Google provider)
3. Supabase → **Authentication → Sign In / Providers → Google** → เปิดใช้ และใส่ Client ID / Secret
4. Supabase → **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000` (ตอนพัฒนา) หรือโดเมนจริง
   - Redirect URLs: เพิ่ม `http://localhost:3000/auth/callback` และ `https://<โดเมนจริง>/auth/callback`

### 3. รันในเครื่อง
```bash
cp .env.example .env.local   # แล้วใส่ค่า Supabase
npm install
npm run dev
```

### 4. ตั้งแอดมินคนแรก
Login ด้วย Google 1 ครั้ง แล้วรันใน SQL Editor (แก้อีเมล):
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'your-name@pibul.ac.th');
```
หลังจากนั้นแอดมินตั้งคนอื่นเป็นแอดมินได้จากหน้า `/admin → ผู้ใช้`

## Deploy (Vercel)
1. push โค้ดขึ้น GitHub → Import ใน https://vercel.com
2. ใส่ Environment Variables ตาม `.env.example`
3. เพิ่ม `https://<โดเมน>.vercel.app/auth/callback` ใน Supabase Redirect URLs และตั้ง Site URL เป็นโดเมนนี้

## โครงสร้าง
```
app/
  page.tsx            หน้าแรก + ค้นหา/กรองชีท
  login/              หน้า login (Google)
  auth/callback/      รับ code จาก Google → สร้าง session
  auth/signout/       ออกจากระบบ
  share/              แบ่งปัน / แก้ไขชีท (?edit=<id>)
  me/                 ชีทของฉัน + ชื่อที่แสดง
  admin/              แผงควบคุม: รายงาน · ชีททั้งหมด · ผู้ใช้
  actions.ts          Server Actions ของ user
  admin/actions.ts    Server Actions ของ admin
components/           Header, SheetBrowser, SheetCard, SheetForm, ...
lib/supabase/         client (browser) / server / proxy session refresh
supabase/schema.sql   ตาราง, RLS, trigger, storage bucket
proxy.ts              รีเฟรช session + กันหน้าที่ต้อง login
```

## ปรับแต่ง
- รายชื่อวิชา / สีปก: `lib/constants.ts`
- วันสอบที่นับถอยหลัง: `NEXT_PUBLIC_NEXT_EXAM_DATE`, `NEXT_PUBLIC_NEXT_EXAM_LABEL`
- โดเมนอีเมลที่อนุญาต (ตอนนี้ `@pibul.ac.th`): แก้ 2 ที่ให้ตรงกัน — `is_school_email()` ใน `supabase/schema.sql` และ `ALLOWED_EMAIL_DOMAIN` ใน `lib/constants.ts`
