import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import GoogleButton from "@/components/GoogleButton";
import { getViewer } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const dest = safeNext(next);
  if (await getViewer()) redirect(dest);

  return (
    <section className="login-card panel">
      <span className="brand-mark" aria-hidden="true">พ</span>
      <h1>เข้าสู่ระบบชีทพิบูล</h1>
      <p className="muted">
        อ่านชีทได้โดยไม่ต้อง login — เข้าสู่ระบบเมื่ออยากแบ่งปันชีท กดหัวใจ หรือแจ้งปัญหา
      </p>
      {error && <p className="notice error">เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง</p>}
      <GoogleButton next={dest} />
      <p className="muted" style={{ fontSize: ".85rem" }}>
        การเข้าสู่ระบบถือว่าคุณยอมรับ <Link href="/terms">กติกาการใช้งาน</Link> และ{" "}
        <Link href="/privacy">นโยบายความเป็นส่วนตัว</Link> · เราใช้แค่อีเมล ชื่อ และรูปโปรไฟล์ Google ของคุณ
      </p>
    </section>
  );
}
