"use client";

import { EXAM_LABEL, TINT } from "@/lib/constants";
import { sheetKind, sheetUrl, timeAgo } from "@/lib/format";
import type { Sheet } from "@/lib/types";

export default function SheetCard({
  sheet: s,
  now,
  liked,
  onLike,
  onOpen,
  onReport,
}: {
  sheet: Sheet;
  now: number;
  liked: boolean;
  onLike: () => void;
  onOpen: () => void;
  onReport: () => void;
}) {
  const url = sheetUrl(s);
  const isNew = now - new Date(s.created_at).getTime() < 3 * 86400e3;

  return (
    <article className="card">
      <div className="cover" style={{ "--tint": TINT[s.subject] ?? TINT["อื่น ๆ"] } as React.CSSProperties}>
        <p className="cover-subj">{s.subject}</p>
        <div className="cover-meta">
          <span className="grade-chip">ม.{s.grade}</span>
          <span className="kind">{sheetKind(s)}</span>
        </div>
      </div>
      {isNew && <span className="card-new">ใหม่!</span>}
      <div className="card-body">
        <h3 className="card-title">{s.title}</h3>
        <p className="card-meta">เทอม {s.term} · {EXAM_LABEL[s.exam]} · โดย {s.author_name}</p>
        {s.description && <p className="card-desc">{s.description}</p>}
        <p className="card-meta" suppressHydrationWarning>
          {timeAgo(s.created_at)} · เปิดอ่าน {s.open_count} ครั้ง
        </p>
        <div className="card-foot">
          {url ? (
            <a className="btn btn-ink" href={url} target="_blank" rel="noopener noreferrer" onClick={onOpen}>
              {s.link_url ? "เปิดชีท ↗" : "อ่าน / ดาวน์โหลด"}
            </a>
          ) : (
            <span className="btn btn-ink" aria-disabled="true">ไม่มีไฟล์</span>
          )}
          <button className={`icon-btn${liked ? " liked" : ""}`} aria-pressed={liked} aria-label="ให้หัวใจชีทนี้" onClick={onLike}>
            ♥ <span>{s.like_count}</span>
          </button>
        </div>
        <button className="card-report" onClick={onReport}>แจ้งปัญหา</button>
      </div>
    </article>
  );
}
