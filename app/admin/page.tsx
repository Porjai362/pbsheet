import type { Metadata } from "next";
import Link from "next/link";
import { adminDeleteSheet, resolveReport, setSheetHidden, setUserBanned, setUserRole } from "@/app/admin/actions";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import SubmitButton from "@/components/SubmitButton";
import { requireAdmin } from "@/lib/auth";
import { EXAM_LABEL } from "@/lib/constants";
import { sheetUrl, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { AdminUser, Report, Sheet } from "@/lib/types";

export const metadata: Metadata = { title: "แผงควบคุมแอดมิน" };

type Tab = "reports" | "sheets" | "users";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const admin = await requireAdmin();
  const { tab: rawTab, q = "" } = await searchParams;
  const tab: Tab = rawTab === "sheets" || rawTab === "users" ? rawTab : "reports";
  const supabase = await createClient();

  const [{ data: sheetsData }, { data: reportsData }, { count: openReports }] = await Promise.all([
    supabase.from("sheets").select("*").order("created_at", { ascending: false }).limit(1000),
    supabase.from("reports").select("*").order("resolved").order("created_at", { ascending: false }).limit(300),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("resolved", false),
  ]);
  const sheets = (sheetsData ?? []) as Sheet[];
  const reports = (reportsData ?? []) as Report[];
  const byId = new Map(sheets.map((s) => [s.id, s]));

  const tabs: [Tab, string, number | null][] = [
    ["reports", "รายงานปัญหา", openReports ?? 0],
    ["sheets", "ชีททั้งหมด", null],
    ["users", "ผู้ใช้", null],
  ];

  return (
    <div className="page">
      <div className="page-head">
        <p className="eyebrow">แผงควบคุม · <span className="role-badge admin">ADMIN</span></p>
        <h1>จัดการชีทพิบูล</h1>
      </div>

      <dl className="stats" style={{ maxWidth: 640 }}>
        <div><dt>ชีททั้งหมด</dt><dd>{sheets.length}</dd></div>
        <div><dt>ถูกซ่อน</dt><dd>{sheets.filter((s) => s.hidden).length}</dd></div>
        <div><dt>รายงานรอดู</dt><dd>{openReports ?? 0}</dd></div>
      </dl>

      <nav className="tabs" aria-label="ส่วนของแผงควบคุม">
        {tabs.map(([key, label, count]) => (
          <Link key={key} href={`/admin?tab=${key}`} aria-current={tab === key ? "page" : undefined}>
            {label}{count ? <span className="count-pill">{count}</span> : null}
          </Link>
        ))}
      </nav>

      {tab === "reports" && <ReportsTab reports={reports} byId={byId} />}
      {tab === "sheets" && <SheetsTab sheets={sheets} q={q} />}
      {tab === "users" && <UsersTab adminId={admin.id} />}
    </div>
  );
}

function SheetTitle({ s }: { s: Sheet }) {
  const url = sheetUrl(s);
  return (
    <>
      <div className="cell-title">{url ? <a href={url} target="_blank" rel="noopener noreferrer">{s.title}</a> : s.title}</div>
      <div className="cell-sub">ม.{s.grade} · {s.subject} · เทอม {s.term} {EXAM_LABEL[s.exam]} · โดย {s.author_name} · {timeAgo(s.created_at)}</div>
    </>
  );
}

function SheetModeration({ s }: { s: Sheet }) {
  return (
    <>
      <form action={setSheetHidden}>
        <input type="hidden" name="id" value={s.id} />
        <input type="hidden" name="hidden" value={String(!s.hidden)} />
        <SubmitButton className="btn btn-ghost btn-xs">{s.hidden ? "เลิกซ่อน" : "ซ่อน"}</SubmitButton>
      </form>
      <Link className="btn btn-ghost btn-xs" href={`/share?edit=${s.id}`}>แก้ไข</Link>
      <form action={adminDeleteSheet}>
        <input type="hidden" name="id" value={s.id} />
        <ConfirmSubmit className="btn btn-danger btn-xs" message={`ลบ “${s.title}” และไฟล์ถาวร?`}>ลบ</ConfirmSubmit>
      </form>
    </>
  );
}

function ReportsTab({ reports, byId }: { reports: Report[]; byId: Map<string, Sheet> }) {
  if (!reports.length) return <div className="empty panel"><p>ยังไม่มีรายงานปัญหา 🎉</p></div>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>ชีท</th><th>เหตุผล</th><th>สถานะ</th><th></th></tr></thead>
        <tbody>
          {reports.map((r) => {
            const s = byId.get(r.sheet_id);
            return (
              <tr key={r.id}>
                <td>{s ? <SheetTitle s={s} /> : <span className="muted">ชีทถูกลบแล้ว</span>}</td>
                <td style={{ maxWidth: 280 }}>{r.reason}<div className="cell-sub">{timeAgo(r.created_at)}</div></td>
                <td>
                  {r.resolved ? <span className="chip">จัดการแล้ว</span> : <span className="chip warn">รอดู</span>}
                  {s?.hidden && <> <span className="chip bad">ซ่อนอยู่</span></>}
                </td>
                <td>
                  <div className="row-actions">
                    {s && <SheetModeration s={s} />}
                    <form action={resolveReport}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="resolved" value={String(!r.resolved)} />
                      <SubmitButton className="btn btn-ink btn-xs">{r.resolved ? "เปิดใหม่" : "ปิดเรื่อง"}</SubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SheetsTab({ sheets, q }: { sheets: Sheet[]; q: string }) {
  const needle = q.trim().toLowerCase();
  const list = needle
    ? sheets.filter((s) => [s.title, s.subject, s.author_name].join(" ").toLowerCase().includes(needle))
    : sheets;
  return (
    <>
      <form className="inline-form" action="/admin">
        <input type="hidden" name="tab" value="sheets" />
        <label className="field">
          <span className="sr-only">ค้นหาชีท</span>
          <input id="admin-q" name="q" type="search" defaultValue={q} placeholder="ค้นหาชื่อชีท วิชา คนสรุป…" />
        </label>
        <button className="btn btn-ink" type="submit">ค้นหา</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead><tr><th>ชีท</th><th>สถานะ</th><th className="num">♥</th><th className="num">เปิด</th><th></th></tr></thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id}>
                <td><SheetTitle s={s} /></td>
                <td>{s.hidden ? <span className="chip bad">ซ่อน</span> : <span className="chip">เผยแพร่</span>}</td>
                <td className="num">{s.like_count}</td>
                <td className="num">{s.open_count}</td>
                <td><div className="row-actions"><SheetModeration s={s} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

async function UsersTab({ adminId }: { adminId: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_users");
  if (error) return <p className="notice error">โหลดรายชื่อผู้ใช้ไม่สำเร็จ: {error.message}</p>;
  const users = (data ?? []) as AdminUser[];

  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>ผู้ใช้</th><th>สิทธิ์</th><th className="num">ชีท</th><th>เข้าร่วม</th><th></th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>
                <div className="userbox">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="avatar" src={u.avatar_url || "/avatar.svg"} alt="" referrerPolicy="no-referrer" />
                  <div>
                    <div className="cell-title">{u.display_name}{u.id === adminId && " (คุณ)"}</div>
                    <div className="cell-sub">{u.email}</div>
                  </div>
                </div>
              </td>
              <td>
                <span className={`role-badge${u.role === "admin" ? " admin" : ""}`}>{u.role.toUpperCase()}</span>
                {u.banned && <> <span className="chip bad">ถูกระงับ</span></>}
              </td>
              <td className="num">{u.sheet_count}</td>
              <td className="cell-sub">{timeAgo(u.created_at)}</td>
              <td>
                {u.id !== adminId && (
                  <div className="row-actions">
                    <form action={setUserRole}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="role" value={u.role === "admin" ? "user" : "admin"} />
                      <ConfirmSubmit className="btn btn-ghost btn-xs"
                        message={u.role === "admin" ? `ลดสิทธิ์ ${u.display_name} เป็นผู้ใช้ทั่วไป?` : `ให้ ${u.display_name} เป็นแอดมิน?`}>
                        {u.role === "admin" ? "ลดเป็น user" : "ตั้งเป็น admin"}
                      </ConfirmSubmit>
                    </form>
                    <form action={setUserBanned}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="banned" value={String(!u.banned)} />
                      <ConfirmSubmit className="btn btn-danger btn-xs"
                        message={u.banned ? `ยกเลิกการระงับ ${u.display_name}?` : `ระงับ ${u.display_name}? จะอัปโหลด กดหัวใจ และแจ้งปัญหาไม่ได้`}>
                        {u.banned ? "ยกเลิกระงับ" : "ระงับ"}
                      </ConfirmSubmit>
                    </form>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
