"use client";

import { useActionState, useState } from "react";
import { deleteAccount } from "@/app/actions";

export default function DeleteAccount({ sheetCount }: { sheetCount: number }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, action, pending] = useActionState(deleteAccount, { error: null });

  return (
    <section className="panel danger-zone">
      <h2>ลบบัญชี</h2>
      <p className="muted">
        ลบบัญชีถาวร ข้อมูลทั้งหมดของคุณจะหายและกู้คืนไม่ได้:
        ชีทที่แบ่งปัน{sheetCount ? ` (${sheetCount} ชีท)` : ""} พร้อมไฟล์ · หัวใจที่เคยกด · รายงานที่เคยแจ้ง · โปรไฟล์
      </p>
      {!open ? (
        <button className="btn btn-danger" onClick={() => setOpen(true)}>ฉันต้องการลบบัญชี</button>
      ) : (
        <form action={action} className="inline-form">
          <label className="field">
            <span>พิมพ์ <strong>ลบบัญชี</strong> เพื่อยืนยัน</span>
            <input id="confirm-delete" name="confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
          <button type="button" className="btn btn-ghost" onClick={() => { setOpen(false); setTyped(""); }}>ยกเลิก</button>
          <button type="submit" className="btn btn-danger-solid" disabled={pending || typed.trim() !== "ลบบัญชี"}>
            {pending ? "กำลังลบ…" : "ลบบัญชีถาวร"}
          </button>
        </form>
      )}
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
    </section>
  );
}
