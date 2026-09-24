"use client";

import { useEffect, useState } from "react";
import { NEXT_EXAM_DATE, NEXT_EXAM_LABEL } from "@/lib/constants";

export default function Countdown() {
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(`${NEXT_EXAM_DATE}T08:00:00+07:00`).getTime();
    const tick = () => setDays(Number.isNaN(target) ? null : Math.ceil((target - Date.now()) / 86400e3));
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="note countdown" aria-live="polite">
      <p className="note-label">นับถอยหลัง</p>
      <p className="cd-num">{days === null ? "–" : Math.max(0, days)}<small>วัน</small></p>
      <p className="cd-label">
        {days === null ? NEXT_EXAM_LABEL : days > 0 ? `ถึง${NEXT_EXAM_LABEL}` : `${NEXT_EXAM_LABEL} — สู้ ๆ!`}
      </p>
      <p className="handwrite">ทีละบท ทีละนิด ก็พร้อมได้ ✎</p>
    </div>
  );
}
