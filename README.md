# ชีทพิบูล — รวมชีทสรุป ม.4–6 (Next.js + Supabase)

เว็บแบ่งปันชีทสรุปของนักเรียนพิบูลวิทยาลัย
Next.js 16 (App Router) · Supabase (Postgres + Auth + Storage) · Login ด้วย Google · สิทธิ์ user / admin

## สิทธิ์การใช้งาน

| ทำอะไรได้ | ไม่ได้ login | user | admin |
|---|:-:|:-:|:-:|
| ดู / ค้นหา / อ่านชีทบนหน้าเว็บ | ✓ | ✓ | ✓ |
| แบ่งปันชีท (อัปโหลดไฟล์ / แปะลิงก์) | | ✓ | ✓ |
| แก้ไข / ลบชีทของตัวเอง | | ✓ | ✓ |
| กดหัวใจ · แจ้งปัญหา | | ✓ | ✓ |
| ซ่อน / แก้ / ลบชีทของทุกคน | | | ✓ |
| ดูและปิดรายงานปัญหา | | | ✓ |
| ตั้ง/ถอดสิทธิ์แอดมิน · ระงับผู้ใช้ | | | ✓ |

## กันดาวน์โหลดไฟล์
- กด "อ่านชีท" → หน้า `/read/[id]` ของเว็บเอง ไม่มีลิงก์ไปไฟล์ใน Supabase
- bucket `sheets` เป็น **private** — ดึงไฟล์จาก Supabase ตรง ๆ ไม่ได้ ไฟล์ส่งผ่าน `/api/sheets/[id]/file` เท่านั้น
  ซึ่งตรวจสิทธิ์ด้วย RLS ก่อน และรับเฉพาะ request จากหน้าเว็บเราเอง (พิมพ์ URL ตรงในเบราว์เซอร์จะถูกปฏิเสธ)
- PDF/รูป ถูกวาดลง `<canvas>` ด้วย pdf.js (ไม่มีปุ่มดาวน์โหลดของ PDF viewer) พร้อมลายน้ำอีเมลผู้อ่าน
- ปิดคลิกขวา ลากรูป คัดลอก Ctrl+S / Ctrl+P และการพิมพ์
- ชีทแบบลิงก์ Google Drive/Docs/Canva ฝังแบบ preview ในหน้าเว็บ (ปิดปุ่มดาวน์โหลดได้ที่ Drive: แชร์ → ⚙ → ไม่ติ๊ก "ผู้มีสิทธิ์ดูสามารถดาวน์โหลด")

> ข้อจำกัด: ไม่มีเว็บไหนกันได้ 100% — คนที่ตั้งใจจริงยังแคปหน้าจอหรือใช้ DevTools ได้ ระบบนี้กันการโหลดแบบทั่วไปและทำให้ต้นทางสืบย้อนได้จากลายน้ำ

สิทธิ์ถูกบังคับใช้ 3 ชั้น: `proxy.ts` (ต้อง login) → ตรวจ role ในหน้า/Server Action → **Row Level Security ในฐานข้อมูล** (ชั้นที่สำคัญที่สุด ต่อให้มีคนยิง API ตรงก็ข้ามไม่ได้)

## ตั้งค่าครั้งแรก

### 1. Supabase
1. สร้างโปรเจกต์ที่ https://supabase.com
2. **SQL Editor** → วางเนื้อหา `supabase/schema.sql` ทั้งไฟล์ → Run
3. **Project Settings → API** → คัดลอก Project URL, `anon` public key และ `service_role` key (เก็บเป็นความลับ ใช้เฉพาะฝั่ง server)

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
where id = (select id from auth.users where email = 'your-email@gmail.com');
```
หลังจากนั้นแอดมินตั้งคนอื่นเป็นแอดมินได้จากหน้า `/admin → ผู้ใช้`

## Deploy (Vercel)
1. push โค้ดขึ้น GitHub → Import ใน https://vercel.com
2. ใส่ Environment Variables ตาม `.env.example` (รวม `SUPABASE_SERVICE_ROLE_KEY` — ถ้าไม่ใส่ หน้าอ่านชีทจะโหลดไฟล์ไม่ได้)
3. เพิ่ม `https://<โดเมน>.vercel.app/auth/callback` ใน Supabase Redirect URLs และตั้ง Site URL เป็นโดเมนนี้

## โครงสร้าง
```
app/
  page.tsx            หน้าแรก + ค้นหา/กรองชีท
  login/              หน้า login (Google)
  auth/callback/      รับ code จาก Google → สร้าง session
  auth/signout/       ออกจากระบบ
  read/[id]/          หน้าอ่านชีท (canvas + ลายน้ำ)
  api/sheets/[id]/file/  ส่งไฟล์จาก bucket private ให้หน้า read เท่านั้น
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
- จำกัดให้ login ได้เฉพาะอีเมลโรงเรียน: เพิ่มเงื่อนไขใน `handle_new_user()` ของ `schema.sql` (เช่น `if new.email not like '%@pibul.ac.th' then raise exception ...`)
