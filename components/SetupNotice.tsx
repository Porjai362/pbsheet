export default function SetupNotice() {
  return (
    <section className="setup panel">
      <h1>ยังไม่ได้เชื่อมต่อ Supabase</h1>
      <p className="muted">ทำตามนี้ครั้งเดียว แล้วรีสตาร์ท <code>npm run dev</code></p>
      <ol>
        <li>สร้างโปรเจกต์ที่ supabase.com แล้วรันไฟล์ <code>supabase/schema.sql</code> ใน SQL Editor</li>
        <li>เปิด Google provider ใน Authentication → Sign In / Providers</li>
        <li>คัดลอก <code>.env.example</code> เป็น <code>.env.local</code> แล้วใส่ URL และ anon key</li>
      </ol>
      <p className="muted">รายละเอียดทั้งหมดอยู่ใน README.md</p>
    </section>
  );
}
