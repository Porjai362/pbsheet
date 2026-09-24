import Link from "next/link";
import Countdown from "@/components/Countdown";
import SheetBrowser from "@/components/SheetBrowser";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Sheet } from "@/lib/types";

export default async function Home({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const supabase = await createClient();
  const viewer = await getViewer();

  const [{ data: sheets }, { data: likes }] = await Promise.all([
    supabase.from("sheets").select("*").eq("hidden", false).order("created_at", { ascending: false }).limit(1000),
    viewer ? supabase.from("likes").select("sheet_id").eq("user_id", viewer.id) : Promise.resolve({ data: [] }),
  ]);
  const list = (sheets ?? []) as Sheet[];

  return (
    <>
      {denied && <p className="notice error" style={{ marginTop: 16 }}>หน้านั้นสำหรับแอดมินเท่านั้น</p>}
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">พิบูลวิทยาลัย · ม.ปลาย</p>
          <h1>ชีทดี ๆ<br />จาก<mark>เพื่อนพิบูล</mark><br />ถึงเพื่อนพิบูล</h1>
          <p className="lede">
            รวมชีทสรุป ม.4–ม.6 ที่เพื่อนและพี่ ๆ ตั้งใจเขียน เลือกตามชั้น วิชา และเทอม อ่านฟรีไม่ต้องสมัคร —
            มีชีทดี ๆ ก็ login ด้วย Google แล้วส่งต่อได้ในไม่กี่วินาที
          </p>
          <div className="hero-cta">
            <a className="btn btn-hl" href="#browse">เริ่มหาชีท</a>
            <Link className="btn btn-ghost" href="/share">แบ่งปันชีทของฉัน</Link>
          </div>
        </div>
        <aside className="hero-side">
          <Countdown />
          <dl className="stats">
            <div><dt>ชีททั้งหมด</dt><dd>{list.length.toLocaleString("th-TH")}</dd></div>
            <div><dt>วิชา</dt><dd>{new Set(list.map((s) => s.subject)).size}</dd></div>
            <div><dt>คนแบ่งปัน</dt><dd>{new Set(list.map((s) => s.owner_id)).size}</dd></div>
          </dl>
        </aside>
      </section>

      <SheetBrowser
        sheets={list}
        likedIds={(likes ?? []).map((l: { sheet_id: string }) => l.sheet_id)}
        viewerId={viewer?.id ?? null}
      />

      <section className="split">
        <div className="split-card">
          <p className="eyebrow">สำหรับคนมาอ่าน</p>
          <h3>เจอสรุปที่เข้าใจ ในสไตล์ของเรา</h3>
          <p>กรองตามชั้น วิชา เทอม กดเปิดอ่านได้ทันที ชอบชีทไหนกดหัวใจให้คนสรุปมีกำลังใจ</p>
        </div>
        <div className="split-card alt">
          <p className="eyebrow">สำหรับคนแบ่งปัน</p>
          <h3>ชีทที่เราตั้งใจ อาจช่วยเพื่อนได้อีกหลายคน</h3>
          <p>อัปโหลด PDF / รูป หรือแปะลิงก์ Google Drive, Canva ใส่นามแฝงได้ แก้ไขหรือลบชีทของตัวเองได้ตลอด</p>
          <Link className="btn btn-ink" href="/share">เริ่มแบ่งปันชีท</Link>
        </div>
      </section>

      <section id="faq" className="faq">
        <h2>คำถามที่พบบ่อย</h2>
        <details>
          <summary>อ่านชีทฟรีไหม ต้อง login หรือเปล่า?</summary>
          <p>อ่านและดาวน์โหลดได้ฟรีโดยไม่ต้อง login ต้อง login ด้วย Google เฉพาะตอนแบ่งปันชีท กดหัวใจ หรือแจ้งปัญหา</p>
        </details>
        <details>
          <summary>อยากแบ่งปันชีท ต้องทำยังไง?</summary>
          <p>กด “แบ่งปันชีท” → login ด้วย Google → กรอกชื่อชีท ชั้น วิชา เทอม แล้วแนบ PDF/รูป (ไม่เกิน 20MB) หรือแปะลิงก์ที่ตั้งค่าให้ “ทุกคนที่มีลิงก์ดูได้”</p>
        </details>
        <details>
          <summary>ชีทแบบไหนที่ไม่ควรลง?</summary>
          <p>ข้อสอบจริงที่ครูไม่อนุญาตให้เผยแพร่ เนื้อหาที่คัดลอกจากชีทที่ขายโดยไม่ได้รับอนุญาต และข้อมูลส่วนตัวของผู้อื่น แอดมินจะซ่อนหรือลบชีทที่ไม่เหมาะสม</p>
        </details>
        <details>
          <summary>เจอชีทผิดหรือไม่เหมาะสม ทำยังไง?</summary>
          <p>กด “แจ้งปัญหา” บนการ์ดชีทแล้วเขียนเหตุผลสั้น ๆ แอดมินจะเห็นในแผงควบคุมและจัดการให้</p>
        </details>
      </section>
    </>
  );
}
