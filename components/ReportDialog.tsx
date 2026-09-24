"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ReportTarget = { id: string; title: string; author_name: string };

export default function ReportDialog({ sheet, onClose, onDone }: { sheet: ReportTarget; onClose: () => void; onDone: (msg: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 3) return setError("เขียนเหตุผลสั้น ๆ อย่างน้อย 3 ตัวอักษร");
    setPending(true);
    const { error } = await createClient().from("reports").insert({ sheet_id: sheet.id, reason: reason.trim() });
    setPending(false);
    if (error?.code === "23505") return onDone("คุณแจ้งปัญหาชีทนี้ไปแล้ว");
    if (error) return setError("ส่งไม่สำเร็จ: " + error.message);
    onDone("ส่งเรื่องให้แอดมินแล้ว ขอบคุณที่ช่วยดูแล");
  }

  return (
    <dialog ref={ref} className="sheet-dialog" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <form onSubmit={submit}>
        <div className="dialog-head">
          <h2>แจ้งปัญหาชีท</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="ปิด">✕</button>
        </div>
        <p className="muted">“{sheet.title}” โดย {sheet.author_name}</p>
        <label className="field">
          <span>เกิดอะไรขึ้น?</span>
          <textarea id="report-reason" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="เช่น ลิงก์เสีย / เนื้อหาผิด / เป็นข้อสอบจริง / ไม่เหมาะสม" autoFocus />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button type="submit" className="btn btn-ink" disabled={pending}>{pending ? "กำลังส่ง…" : "ส่งให้แอดมิน"}</button>
        </div>
      </form>
    </dialog>
  );
}
