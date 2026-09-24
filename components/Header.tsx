import Link from "next/link";
import { getViewer } from "@/lib/auth";

export default async function Header() {
  const viewer = await getViewer();
  const p = viewer?.profile;

  return (
    <header className="topbar">
      <Link href="/" className="brand" aria-label="ชีทพิบูล หน้าแรก">
        <span className="brand-mark" aria-hidden="true">พ</span>
        <span>ชีทพิบูล</span>
      </Link>
      <nav className="topnav">
        <Link href="/#browse">หาชีท</Link>
        <Link href="/share" className="btn btn-ink btn-sm">+ แบ่งปันชีท</Link>
        {p ? (
          <details className="menu">
            <summary aria-label="เมนูบัญชี">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="avatar" src={p.avatar_url || "/avatar.svg"} alt="" referrerPolicy="no-referrer" />
            </summary>
            <div className="menu-pop">
              <div className="menu-who">
                <strong>{p.display_name}</strong>
                {viewer.email} {p.role === "admin" && <span className="role-badge admin">ADMIN</span>}
              </div>
              <Link href="/me">ชีทของฉัน & โปรไฟล์</Link>
              {p.role === "admin" && <Link href="/admin">แผงควบคุมแอดมิน</Link>}
              <form action="/auth/signout" method="post">
                <button type="submit">ออกจากระบบ</button>
              </form>
            </div>
          </details>
        ) : (
          <Link href="/login" className="btn btn-ghost btn-sm">เข้าสู่ระบบ</Link>
        )}
      </nav>
    </header>
  );
}
