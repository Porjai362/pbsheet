"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ReportDialog from "@/components/ReportDialog";
import { createClient } from "@/lib/supabase/client";

/** ปุ่มหัวใจ + แจ้งปัญหา ในหน้าอ่านชีท */
export default function ReadActions({
  sheet,
  viewerId,
  initialLiked,
}: {
  sheet: { id: string; title: string; author_name: string; like_count: number };
  viewerId: string | null;
  initialLiked: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(sheet.like_count);
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function say(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2800);
  }

  function needLogin() {
    router.push(`/login?next=${encodeURIComponent(pathname)}`);
  }

  async function toggleLike() {
    if (!viewerId) return needLogin();
    if (busy) return;
    const had = liked;
    setBusy(true);
    setLiked(!had);
    setCount((c) => c + (had ? -1 : 1));
    const supabase = createClient();
    const { error } = had
      ? await supabase.from("likes").delete().eq("sheet_id", sheet.id).eq("user_id", viewerId)
      : await supabase.from("likes").insert({ sheet_id: sheet.id, user_id: viewerId });
    if (error && error.code !== "23505") {
      setLiked(had);
      setCount((c) => c + (had ? 1 : -1));
      say("กดหัวใจไม่สำเร็จ ลองใหม่อีกครั้ง");
    } else if (!had) {
      say("ส่งหัวใจให้คนสรุปแล้ว ♥");
    }
    setBusy(false);
  }

  return (
    <div className="read-actions">
      <button className={`btn btn-ghost btn-sm like-big${liked ? " liked" : ""}`} aria-pressed={liked} onClick={toggleLike}>
        ♥ {liked ? "ถูกใจแล้ว" : "ถูกใจชีทนี้"} · {count}
      </button>
      <button className="btn btn-ghost btn-sm" onClick={() => (viewerId ? setReporting(true) : needLogin())}>
        แจ้งปัญหา
      </button>
      {reporting && (
        <ReportDialog
          sheet={sheet}
          onClose={() => setReporting(false)}
          onDone={(msg) => {
            setReporting(false);
            say(msg);
          }}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
