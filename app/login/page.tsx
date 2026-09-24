import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GoogleButton from "@/components/GoogleButton";
import { getViewer } from "@/lib/auth";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/constants";
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
      {error === "domain" ? (
        <p className="notice error">ใช้ได้เฉพาะอีเมลโรงเรียน @{ALLOWED_EMAIL_DOMAIN} — กด login อีกครั้งแล้วเลือกบัญชีโรงเรียน</p>
      ) : error ? (
        <p className="notice error">เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง</p>
      ) : null}
      <GoogleButton next={dest} />
      <p className="muted" style={{ fontSize: ".85rem" }}>
        ใช้อีเมลโรงเรียน <strong>@{ALLOWED_EMAIL_DOMAIN}</strong> เท่านั้น · เราใช้แค่ชื่อและรูปโปรไฟล์เพื่อแสดงในเว็บ
      </p>
    </section>
  );
}
