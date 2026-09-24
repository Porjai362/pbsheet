import type { Metadata } from "next";
import Link from "next/link";
import { deleteSheet, updateDisplayName } from "@/app/actions";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import SubmitButton from "@/components/SubmitButton";
import { requireUser } from "@/lib/auth";
import { EXAM_LABEL } from "@/lib/constants";
import { readHref, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Sheet } from "@/lib/types";

export const metadata: Metadata = { title: "ชีทของฉัน" };

export default async function MePage({ searchParams }: { searchParams: Promise<{ shared?: string; saved?: string }> }) {
  const { shared, saved } = await searchParams;
  const viewer = await requireUser("/me");
  const supabase = await createClient();
  const { data } = await supabase.from("sheets").select("*").eq("owner_id", viewer.id).order("created_at", { ascending: false });
  const sheets = (data ?? []) as Sheet[];
  const likes = sheets.reduce((n, s) => n + s.like_count, 0);
  const opens = sheets.reduce((n, s) => n + s.open_count, 0);

  return (
    <div className="page">
      <div className="page-head">
        <p className="eyebrow">บัญชีของฉัน {viewer.profile.role === "admin" && <span className="role-badge admin">ADMIN</span>}</p>
        <h1>สวัสดี {viewer.profile.display_name}</h1>
      </div>
      {shared && <p className="notice">แบ่งปันชีทแล้ว ขอบคุณที่ช่วยเพื่อน ♥</p>}
      {saved && <p className="notice">บันทึกการแก้ไขแล้ว</p>}

      <dl className="stats" style={{ maxWidth: 520 }}>
        <div><dt>ชีทของฉัน</dt><dd>{sheets.length}</dd></div>
        <div><dt>หัวใจที่ได้</dt><dd>{likes}</dd></div>
        <div><dt>ยอดเปิดอ่าน</dt><dd>{opens}</dd></div>
      </dl>

      <form action={updateDisplayName} className="panel inline-form">
        <label className="field">
          <span>ชื่อที่แสดงเริ่มต้น</span>
          <input id="display-name" name="display_name" maxLength={40} defaultValue={viewer.profile.display_name} required />
        </label>
        <SubmitButton className="btn btn-ink">บันทึกชื่อ</SubmitButton>
      </form>

      <div className="section-head">
        <h2>ชีทที่ฉันแบ่งปัน</h2>
        <Link className="btn btn-hl" href="/share">+ แบ่งปันชีทใหม่</Link>
      </div>

      {sheets.length === 0 ? (
        <div className="empty panel"><p>ยังไม่ได้แบ่งปันชีทเลย เริ่มชีทแรกกัน!</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ชีท</th><th>สถานะ</th><th className="num">♥</th><th className="num">เปิดอ่าน</th><th></th></tr>
            </thead>
            <tbody>
              {sheets.map((s) => {
                return (
                  <tr key={s.id}>
                    <td>
                      <div className="cell-title"><Link href={readHref(s.id)}>{s.title}</Link></div>
                      <div className="cell-sub">ม.{s.grade} · {s.subject} · เทอม {s.term} {EXAM_LABEL[s.exam]} · {timeAgo(s.created_at)}</div>
                    </td>
                    <td>{s.hidden ? <span className="chip bad">ถูกซ่อนโดยแอดมิน</span> : <span className="chip">เผยแพร่</span>}</td>
                    <td className="num">{s.like_count}</td>
                    <td className="num">{s.open_count}</td>
                    <td>
                      <div className="row-actions">
                        <Link className="btn btn-ghost btn-xs" href={`/share?edit=${s.id}`}>แก้ไข</Link>
                        <form action={deleteSheet}>
                          <input type="hidden" name="id" value={s.id} />
                          <ConfirmSubmit className="btn btn-danger btn-xs" message={`ลบ “${s.title}” ถาวร? ย้อนกลับไม่ได้`}>ลบ</ConfirmSubmit>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
