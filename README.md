# Mini TimePay

> ระบบเช็คอินเข้างาน + คำนวณเงินเดือน สำหรับธุรกิจขนาดเล็ก 5–20 คน  
> Pastel Mobile-First HR App — ใช้งานจริงได้ทันที ไม่ต้องเซ็ตเซิร์ฟเวอร์

![Status](https://img.shields.io/badge/status-ready-success)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20Supabase-blue)

---

## ฟีเจอร์หลัก

### ฝั่งพนักงาน
- ✅ เช็คอิน/เช็คเอาท์ผ่านมือถือ (ปุ่มใหญ่ กดง่าย)
- ✅ ประวัติเวลาเข้า-ออก (วันนี้/สัปดาห์/เดือน/เลือกเดือน)
- ✅ ขอแก้ไขเวลา (ลืมเช็คอิน, เพิ่มเวลาออก, เพิ่มหมายเหตุ)
- ✅ ขอลางาน (ลาป่วย/ลากิจ/ลาพักร้อน/ลาไม่รับเงิน)
- ✅ ดูสลิปเงินเดือน + ดาวน์โหลด PDF
- ✅ GPS แบบเตือน (ไม่บล็อค) — ปรับได้ในตั้งค่า

### ฝั่งแอดมิน
- ✅ แดชบอร์ดสรุปภาพรวมวันนี้ (เข้า/สาย/ลา/ขาด/ลืมออก/OT/ค่าแรงประมาณการ)
- ✅ จัดการพนักงาน (CRUD + ผูก pay rule / shift / รีเซ็ตรหัสผ่าน)
- ✅ ดู/แก้ไข/ลบเวลาเข้างาน (พร้อม audit log)
- ✅ อนุมัติ/ปฏิเสธคำขอแก้เวลา + คำขอลา
- ✅ ตั้งค่ากะงาน (กะเช้า/กะบ่าย/พาร์ทไทม์)
- ✅ ตั้งค่าสูตรเงินเดือน 3 สูตร (ประจำผ่านโปร, ประจำยังไม่ผ่านโปร, พาร์ทไทม์)
- ✅ ตั้งค่าวันหยุดบริษัท/นักขัตฤกษ์ (ตัวคูณ x2)
- ✅ ตั้งค่าสถานที่ GPS
- ✅ ตั้งค่าประเภทการลา
- ✅ **คำนวณเงินเดือน** (Preview → ปรับ → ยืนยัน → ล็อกรอบ)
- ✅ **Export Excel** รายงานเวลา/เงินเดือน/การลา
- ✅ **สร้างสลิป PDF** ภาษาไทย

### Calculation Engine
- ✅ Timesheet: มาสาย, ออกก่อน, OT, ลืมเช็คเอาท์, ขาดงาน, ลา, วันหยุด
- ✅ Payroll 3 สูตรตามสเปคครบถ้วน
- ✅ Holiday multiplier (x2)
- ✅ Personal day-off pay
- ✅ Leave pay rules (ป่วย/กิจ/พักร้อน/ไม่รับเงิน)
- ✅ Preview → Lock payroll period workflow

### Design
- ✅ Pastel palette (Mint/Sky Blue/Lavender/Peach/Pink)
- ✅ Mobile-first, card-based
- ✅ Bottom tab bar + Sidebar (desktop)
- ✅ Avatar + initials fallback
- ✅ Soft animations
- ✅ Thai-friendly fonts (Noto Sans Thai + Prompt)
- ✅ **PWA** — ติดตั้งบนมือถือได้, มี manifest + service worker + offline

### Security
- ✅ RLS policies ครบทุกตาราง (SQL ในโฟลเดอร์ `supabase/migrations/`)
- ✅ Employee เห็นเฉพาะข้อมูลตัวเอง
- ✅ Admin เห็นเฉพาะบริษัทตัวเอง
- ✅ ไม่ข้ามบริษัท
- ✅ Audit log สำหรับการแก้ไขสำคัญ

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 18 + Vite 5 + TypeScript |
| UI | Tailwind CSS 3 + Lucide React |
| State | React Context + TanStack Query-ready |
| Forms | React Hook Form + Zod |
| Backend | Supabase (Postgres + Auth + Storage) |
| Reports | XLSX (Excel) + Custom PDF generator |
| Date | date-fns |
| PWA | vite-plugin-pwa + Workbox |

---

## Quick Start

### 1. ติดตั้ง

```bash
npm install
```

### 2. รันโหมด Demo (ไม่ต้องตั้ง Supabase)

```bash
npm run dev
```

เปิด http://localhost:5173 แล้วใช้บัญชีตัวอย่าง:
- `owner@demo.com` / `demo1234` — เจ้าของ
- `manager@demo.com` / `demo1234` — แอดมิน
- `piya@demo.com` / `demo1234` — พนักงาน
- `arun@demo.com` / `demo1234` — พนักงานพาร์ทไทม์

> ⚠️ โหมด Demo จะเก็บข้อมูลทั้งหมดใน `localStorage` ของเบราว์เซอร์ (เคลียร์แล้วข้อมูลหาย)

### 3. ตั้งค่า Supabase (Production)

#### 3.1 สร้าง Supabase project
1. ไปที่ https://supabase.com → New project
2. จด **Project URL** และ **anon public key** จาก Settings → API

#### 3.2 รัน SQL
ใน Supabase SQL Editor รันตามลำดับ:
1. `supabase/migrations/0001_init.sql` — สร้างตาราง + triggers + helper functions
2. `supabase/migrations/0002_rls.sql` — เปิด RLS policies
3. (optional) `supabase/seed/seed.sql` — ข้อมูลตัวอย่าง

#### 3.3 ตั้งค่า env
ก๊อปปี้ `.env.example` เป็น `.env` แล้วใส่ค่า:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

#### 3.4 สร้าง Admin user แรก
1. Supabase Dashboard → Authentication → Users → Add user (email + password)
2. SQL Editor รัน:
```sql
insert into public.companies (id, name) 
values ('00000000-0000-0000-0000-000000000001', 'บริษัทของฉัน');

insert into public.profiles (id, company_id, email, full_name, role, is_active)
values (
  '<USER_UUID จาก auth.users>',
  '00000000-0000-0000-0000-000000000001',
  'admin@mycompany.com',
  'ผู้ดูแลระบบ',
  'owner',
  true
);
```

### 4. Build & Deploy

```bash
npm run build       # สร้าง production bundle ใน dist/
npm run preview     # ทดสอบ production
```

Deploy ได้ที่ **Vercel** หรือ **Cloudflare Pages**:
- Build command: `npm run build`
- Output dir: `dist`
- เพิ่ม env vars ใน UI ของแพลตฟอร์ม

---

## โครงสร้างโปรเจกต์

```
mini-timepay/
├── src/
│   ├── components/
│   │   ├── ui/             # shadcn-style primitives
│   │   ├── shared/         # Avatar, Modal, EmptyState, ...
│   │   ├── layout/         # AppShell, Navigation, RequireAuth
│   │   ├── employee/       # (ถ้ามี component เฉพาะ)
│   │   └── admin/          # (ถ้ามี component เฉพาะ)
│   ├── pages/
│   │   ├── auth/           # LoginPage
│   │   ├── employee/       # Home, History, Leave, Adjust, Payslip
│   │   └── admin/          # Dashboard, Employees, Attendance, ...
│   ├── lib/
│   │   ├── utils.ts        # formatters, helpers
│   │   ├── store.ts        # localStorage data store (demo mode)
│   │   ├── supabase/       # Supabase client
│   │   ├── calculations/   # timesheet.ts, payroll.ts (PURE)
│   │   ├── repos/          # data access layer
│   │   └── exports/        # excel.ts, payslipPdf.ts
│   ├── contexts/           # AuthContext, ToastContext
│   ├── types/              # all domain types
│   ├── App.tsx             # routing
│   └── main.tsx
├── supabase/
│   ├── migrations/         # SQL migrations (0001, 0002)
│   └── seed/               # seed SQL
├── public/                 # static assets
├── tailwind.config.js      # pastel theme
├── vite.config.ts          # PWA + alias
├── tsconfig.json
├── eslint.config.js
└── package.json
```

---

## Database Schema

18 ตารางหลัก ครอบคลุมทุกฟีเจอร์:

| ตาราง | ใช้สำหรับ |
|-------|-----------|
| `companies` | ข้อมูลบริษัท |
| `profiles` | ผู้ใช้ + role (owner/admin/employee) |
| `employees` | ข้อมูลพนักงาน + pay rule + shift |
| `branches` | สาขา (optional) |
| `shifts` | กะงาน (เช้า/บ่าย/พาร์ทไทม์) |
| `employee_schedules` | ตารางกะรายวัน (optional) |
| `attendance_logs` | บันทึกเช็คอิน-เช็คเอาท์ |
| `daily_timesheets` | สรุปเวลารายวัน (denormalized) |
| `leave_types` | ประเภทการลา |
| `leave_requests` | คำขอลา |
| `time_adjustment_requests` | คำขอแก้เวลา |
| `pay_rules` | สูตรเงินเดือน |
| `payroll_periods` | รอบเงินเดือน |
| `payroll_items` | รายการเงินเดือนพนักงาน |
| `payroll_adjustments` | รายการปรับ (เพิ่ม/หัก) |
| `holidays` | วันหยุดบริษัท/นักขัตฤกษ์ |
| `locations` | พิกัด GPS |
| `app_settings` | ตั้งค่าต่อบริษัท (location_check_mode, ...) |
| `audit_logs` | บันทึกการแก้ไข |

ทุกตารางมี RLS policies แยกตาม role

---

## วิธีใช้งาน

### พนักงาน
1. Login → หน้าแรกแสดงสถานะวันนี้
2. กด **"เข้างาน"** ตอนมาทำงาน
3. กด **"ออกงาน"** ตอนเลิกงาน
4. ดู **ประวัติ** → กรองตามช่วงเวลา
5. ลืมเช็คอิน? → **ขอแก้ไขเวลา** → แอดมินอนุมัติ
6. จะลา → **ลางาน** → เลือกประเภท/วันที่
7. ดู **สลิป** ย้อนหลัง → กดดาวน์โหลด PDF

### แอดมิน
1. Login → แดชบอร์ดสรุปภาพรวม
2. **พนักงาน** → เพิ่ม/แก้ไข/ปิดใช้งาน → ผูก pay rule + shift
3. **เวลาเข้างาน** → กรอง/แก้ไข/Export Excel
4. **คำขออนุมัติ** → อนุมัติ/ปฏิเสธ (ขอแก้เวลา + ขอลา)
5. **เงินเดือน** → เลือกเดือน → กด **คำนวณ** → ตรวจสอบ → **ยืนยันรอบ** → Export/PDF
6. **ตั้งค่า** → จัดการกะ, pay rule, วันหยุด, GPS, ประเภทลา
7. **รายงาน** → Export ตามช่วงเวลา

---

## QA Checklist (ผลทดสอบ)

### Build & Code Quality
- ✅ `npm run lint` ผ่าน (0 errors, 0 warnings)
- ✅ `npm run typecheck` ผ่าน (no TS errors)
- ✅ `npm run build` ผ่าน (production bundle 842 KB → 250 KB gzipped)
- ✅ PWA generated (sw.js, manifest, workbox)

### ฟีเจอร์ที่ทำเสร็จ
- ✅ เข้าสู่ระบบ / ออกจากระบบ
- ✅ Role-based routing (admin vs employee)
- ✅ เช็คอิน/เช็คเอาท์ (กันซ้ำ)
- ✅ Timesheet (มาสาย/ออกก่อน/OT/ลืมออก/ขาด)
- ✅ ขอแก้เวลา + อนุมัติ → อัปเดต attendance จริง
- ✅ ลางาน + อนุมัติ → ส่งผลต่อ payroll
- ✅ จัดการพนักงาน (CRUD + status)
- ✅ ตั้งค่ากะ/สูตรเงินเดือน/วันหยุด/สถานที่/ประเภทลา
- ✅ Payroll 3 สูตร คำนวณถูก
- ✅ Holiday x2 multiplier
- ✅ Preview → Lock → Unlock payroll
- ✅ Export Excel (3 ประเภท)
- ✅ สร้าง PDF payslip
- ✅ GPS 4 โหมด (off/record_only/warn_only/enforce)
- ✅ PWA manifest + service worker

### ที่อาจปรับปรุงเพิ่ม
- ไม่มีภาพถ่ายเช็คอิน (ตามสเปค — เวอร์ชันแรก)
- ไม่มี QR Code (ตามสเปค)
- ไม่มี Device Binding บังคับ (ตามสสเปค)
- ไม่มีแผนที่ (ตามสเปค)
- ไม่มี SSO / OAuth (ใช้ email+password พอ)

---

## Deploy ไปยัง Production

### Vercel
```bash
npm install -g vercel
vercel
```

### Cloudflare Pages
1. Push โค้ดขึ้น GitHub
2. Cloudflare Dashboard → Pages → Connect to Git
3. Build command: `npm run build`
4. Output: `dist`
5. เพิ่ม env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

---

## License

MIT — ใช้งานได้ทั้งเชิงพาณิชย์และส่วนตัว

---

## Credits

Built with ❤️ for small Thai businesses.
