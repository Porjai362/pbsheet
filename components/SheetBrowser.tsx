"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ReportDialog from "@/components/ReportDialog";
import SheetCard from "@/components/SheetCard";
import { SUBJECT_NAMES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Sheet } from "@/lib/types";

type Sort = "new" | "likes" | "opens";

export default function SheetBrowser({
  sheets: initial,
  likedIds,
  viewerId,
}: {
  sheets: Sheet[];
  likedIds: string[];
  viewerId: string | null;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [sheets, setSheets] = useState(initial);
  const [liked, setLiked] = useState(() => new Set(likedIds));
  const [grade, setGrade] = useState("all");
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("");
  const [term, setTerm] = useState("");
  const [exam, setExam] = useState("");
  const [sort, setSort] = useState<Sort>("new");
  const [toast, setToast] = useState<string | null>(null);
  const [reporting, setReporting] = useState<Sheet | null>(null);

  const [now] = useState(() => Date.now());

  // ข้อมูลใหม่จากเซิร์ฟเวอร์ (หลัง router.refresh) — รีเซ็ต state ระหว่าง render ตามแนวทางของ React
  const [prevInitial, setPrevInitial] = useState(initial);
  const [prevLiked, setPrevLiked] = useState(likedIds);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setSheets(initial);
  }
  if (likedIds !== prevLiked) {
    setPrevLiked(likedIds);
    setLiked(new Set(likedIds));
  }

  function say(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2800);
  }

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = sheets.filter(
      (s) =>
        (grade === "all" || String(s.grade) === grade) &&
        (!subject || s.subject === subject) &&
        (!term || String(s.term) === term) &&
        (!exam || s.exam === exam) &&
        (!needle || [s.title, s.subject, s.author_name, s.description].join(" ").toLowerCase().includes(needle)),
    );
    const key: Record<Sort, (s: Sheet) => number> = {
      new: (s) => -new Date(s.created_at).getTime(),
      likes: (s) => -s.like_count,
      opens: (s) => -s.open_count,
    };
    return list.sort((a, b) => key[sort](a) - key[sort](b));
  }, [sheets, grade, q, subject, term, exam, sort]);

  function patch(id: string, fn: (s: Sheet) => Sheet) {
    setSheets((all) => all.map((s) => (s.id === id ? fn(s) : s)));
  }

  async function toggleLike(s: Sheet) {
    if (!viewerId) return router.push("/login?next=/%23browse");
    const had = liked.has(s.id);
    const next = new Set(liked);
    if (had) next.delete(s.id);
    else next.add(s.id);
    setLiked(next);
    patch(s.id, (x) => ({ ...x, like_count: x.like_count + (had ? -1 : 1) }));
    const { error } = had
      ? await supabase.from("likes").delete().eq("sheet_id", s.id).eq("user_id", viewerId)
      : await supabase.from("likes").insert({ sheet_id: s.id, user_id: viewerId });
    if (error && error.code !== "23505") {
      setLiked(liked);
      patch(s.id, (x) => ({ ...x, like_count: x.like_count + (had ? 1 : -1) }));
      say("กดหัวใจไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  function report(s: Sheet) {
    if (!viewerId) return router.push("/login?next=/%23browse");
    setReporting(s);
  }

  return (
    <section id="browse" className="browse">
      <div className="section-head">
        <h2>ชีทจากชุมชน</h2>
        <p className="muted">พบ {visible.length} ชีท</p>
      </div>

      <div className="grade-tabs" role="tablist" aria-label="เลือกชั้น">
        {[["all", "ทุกชั้น"], ["4", "ม.4"], ["5", "ม.5"], ["6", "ม.6"]].map(([g, label]) => (
          <button key={g} role="tab" aria-selected={grade === g} onClick={() => setGrade(g)}>
            {label}
          </button>
        ))}
      </div>

      <div className="filters">
        <label className="field grow">
          <span className="sr-only">ค้นหา</span>
          <input id="f-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อชีท บทเรียน หรือคนสรุป…" />
        </label>
        <label className="field">
          <span className="sr-only">วิชา</span>
          <select id="f-subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">ทุกวิชา</option>
            {SUBJECT_NAMES.map((n) => <option key={n}>{n}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="sr-only">เทอม</span>
          <select id="f-term" value={term} onChange={(e) => setTerm(e.target.value)}>
            <option value="">ทุกเทอม</option>
            <option value="1">เทอม 1</option>
            <option value="2">เทอม 2</option>
          </select>
        </label>
        <label className="field">
          <span className="sr-only">การสอบ</span>
          <select id="f-exam" value={exam} onChange={(e) => setExam(e.target.value)}>
            <option value="">ทุกการสอบ</option>
            <option value="midterm">กลางภาค</option>
            <option value="final">ปลายภาค</option>
            <option value="other">อื่น ๆ</option>
          </select>
        </label>
        <label className="field">
          <span className="sr-only">เรียงตาม</span>
          <select id="f-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="new">ใหม่ล่าสุด</option>
            <option value="likes">หัวใจเยอะสุด</option>
            <option value="opens">เปิดอ่านเยอะสุด</option>
          </select>
        </label>
      </div>

      {visible.length > 0 ? (
        <div className="sheet-grid" aria-live="polite">
          {visible.map((s) => (
            <SheetCard
              key={s.id}
              sheet={s}
              now={now}
              liked={liked.has(s.id)}
              onLike={() => toggleLike(s)}
              onReport={() => report(s)}
            />
          ))}
        </div>
      ) : (
        <div className="empty">
          <p>{sheets.length ? "ยังไม่มีชีทตรงกับที่เลือก" : "ยังไม่มีชีทในเว็บเลย"}</p>
          <a className="btn btn-hl" href="/share">เป็นคนแรกที่แบ่งปัน</a>
        </div>
      )}

      {reporting && (
        <ReportDialog
          sheet={reporting}
          onClose={() => setReporting(null)}
          onDone={(msg) => {
            setReporting(null);
            say(msg);
          }}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </section>
  );
}
