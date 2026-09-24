import type { Metadata } from "next";
import Link from "next/link";
import { Caveat, IBM_Plex_Sans_Thai, Mitr } from "next/font/google";
import Header from "@/components/Header";
import SetupNotice from "@/components/SetupNotice";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import "./globals.css";

const mitr = Mitr({ subsets: ["thai", "latin"], weight: ["400", "500", "600"], variable: "--font-mitr" });
const plex = IBM_Plex_Sans_Thai({ subsets: ["thai", "latin"], weight: ["400", "500", "600"], variable: "--font-plex" });
const caveat = Caveat({ subsets: ["latin"], weight: ["600"], variable: "--font-caveat" });

export const metadata: Metadata = {
  title: { default: "ชีทพิบูล · รวมชีทสรุป ม.4–6", template: "%s · ชีทพิบูล" },
  description: "พื้นที่แบ่งปันชีทสรุป ม.4–6 ของนักเรียนพิบูลวิทยาลัย เพื่อนช่วยเพื่อน อ่านฟรี แชร์ง่าย",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={`${mitr.variable} ${plex.variable} ${caveat.variable}`}>
      <body>
        <Header />
        <main id="top">{isSupabaseConfigured ? children : <SetupNotice />}</main>
        <footer className="footer">
          <p>ชีทพิบูล — ทำโดยนักเรียน เพื่อนักเรียนพิบูลวิทยาลัย · ไม่ใช่เว็บไซต์ทางการของโรงเรียน</p>
          <nav className="footer-links" aria-label="ข้อมูลเว็บไซต์">
            <Link href="/terms">กติกาการใช้งาน</Link>
            <Link href="/privacy">นโยบายความเป็นส่วนตัว</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
