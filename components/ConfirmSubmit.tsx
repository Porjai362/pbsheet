"use client";

import { useFormStatus } from "react-dom";

/** ปุ่ม submit ที่ถามยืนยันก่อน (ใช้กับการกระทำที่ย้อนกลับไม่ได้) */
export default function ConfirmSubmit({ message, className, children }: { message: string; className?: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {pending ? "…" : children}
    </button>
  );
}
