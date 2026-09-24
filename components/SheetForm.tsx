"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ACCEPTED_TYPES, MAX_FILE_MB, SUBJECT_NAMES } from "@/lib/constants";
import { safeUrl } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { BUCKET } from "@/lib/supabase/env";
import type { Sheet } from "@/lib/types";

export default function SheetForm({ userId, defaultAuthor, sheet }: { userId: string; defaultAuthor: string; sheet: Sheet | null }) {
  const router = useRouter();
  const [useLink, setUseLink] = useState(Boolean(sheet?.link_url));
  const [file, setFile] = useState<File | null>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function pick(f: File | undefined) {
    setError(null);
    if (!f) return;
    if (!ACCEPTED_TYPES.includes(f.type)) return setError("รองรับเฉพาะไฟล์ PDF, PNG, JPG, WEBP");
    if (f.size > MAX_FILE_MB * 1048576) return setError(`ไฟล์ใหญ่เกิน ${MAX_FILE_MB}MB ลองบีบอัด หรือแปะเป็นลิงก์ Google Drive แทน`);
    setFile(f);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const str = (k: string) => String(fd.get(k) ?? "").trim();

    const row = {
      title: str("title"),
      author_name: str("author_name"),
      grade: Number(str("grade")),
      term: Number(str("term")),
      exam: str("exam"),
      subject: str("subject"),
      description: str("description") || null,
      link_url: null as string | null,
      file_path: sheet?.file_path ?? null,
    };
    if (row.title.length < 3) return setError("ใส่ชื่อชีทอย่างน้อย 3 ตัวอักษร");
    if (!row.author_name) return setError("ใส่ชื่อหรือนามแฝงที่จะแสดงบนชีท");
    if (useLink) {
      row.link_url = safeUrl(str("link_url"));
      if (!row.link_url) return setError("ลิงก์ต้องขึ้นต้นด้วย https:// เช่น ลิงก์ Google Drive");
      row.file_path = null;
    } else if (!file && !sheet?.file_path) {
      return setError("เลือกไฟล์ชีท หรือสลับไปแปะลิงก์");
    }
    if (!sheet && fd.get("agree") !== "on") return setError("ติ๊กยืนยันว่าชีทนี้แชร์ได้ก่อนนะ");

    setPending(true);
    const supabase = createClient();
    try {
      const oldPath = sheet?.file_path ?? null;
      if (!useLink && file) {
        const ext = (file.name.split(".").pop() ?? "pdf").toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
        if (up.error) throw new Error("อัปโหลดไฟล์ไม่สำเร็จ: " + up.error.message);
        row.file_path = path;
      }

      const res = sheet
        ? await supabase.from("sheets").update(row).eq("id", sheet.id)
        : await supabase.from("sheets").insert(row);
      if (res.error) {
        if (row.file_path && row.file_path !== oldPath) await supabase.storage.from(BUCKET).remove([row.file_path]);
        throw new Error("บันทึกชีทไม่สำเร็จ: " + res.error.message);
      }
      if (oldPath && oldPath !== row.file_path) await supabase.storage.from(BUCKET).remove([oldPath]);

      router.push(sheet ? "/me?saved=1" : "/me?shared=1");
      router.refresh();
    } catch (x) {
      setError(x instanceof Error ? x.message : "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
      setPending(false);
    }
  }

  return (
    <form className="panel" onSubmit={submit} noValidate style={{ display: "grid", gap: 14 }}>
      <label className="field">
        <span>ชื่อชีท *</span>
        <input id="s-title" name="title" required minLength={3} maxLength={120} defaultValue={sheet?.title}
          placeholder="เช่น สรุปฟิสิกส์ บทที่ 2 การเคลื่อนที่แนวตรง" />
      </label>

      <div className="row3">
        <label className="field">
          <span>ชั้น *</span>
          <select id="s-grade" name="grade" defaultValue={sheet?.grade ?? 4}>
            <option value="4">ม.4</option><option value="5">ม.5</option><option value="6">ม.6</option>
          </select>
        </label>
        <label className="field">
          <span>เทอม *</span>
          <select id="s-term" name="term" defaultValue={sheet?.term ?? 1}>
            <option value="1">เทอม 1</option><option value="2">เทอม 2</option>
          </select>
        </label>
        <label className="field">
          <span>สอบ *</span>
          <select id="s-exam" name="exam" defaultValue={sheet?.exam ?? "midterm"}>
            <option value="midterm">กลางภาค</option><option value="final">ปลายภาค</option><option value="other">อื่น ๆ</option>
          </select>
        </label>
      </div>

      <div className="row2">
        <label className="field">
          <span>วิชา *</span>
          <select id="s-subject" name="subject" defaultValue={sheet?.subject ?? SUBJECT_NAMES[0]}>
            {SUBJECT_NAMES.map((n) => <option key={n}>{n}</option>)}
          </select>
        </label>
        <label className="field">
          <span>ชื่อที่แสดง / นามแฝง *</span>
          <input id="s-author" name="author_name" required maxLength={40} defaultValue={sheet?.author_name ?? defaultAuthor} />
        </label>
      </div>

      <label className="field">
        <span>คำอธิบายสั้น ๆ</span>
        <textarea id="s-desc" name="description" rows={2} maxLength={400} defaultValue={sheet?.description ?? ""}
          placeholder="ครอบคลุมบทไหนบ้าง มีเฉลยไหม ฯลฯ" />
      </label>

      <fieldset className="source">
        <legend>ไฟล์ชีท *</legend>
        <div className="seg" role="radiogroup">
          <label><input type="radio" name="src" id="src-file" checked={!useLink} onChange={() => setUseLink(false)} /> อัปโหลดไฟล์</label>
          <label><input type="radio" name="src" id="src-link" checked={useLink} onChange={() => setUseLink(true)} /> แปะลิงก์</label>
        </div>
        {useLink ? (
          <label className="field">
            <span className="sr-only">ลิงก์</span>
            <input id="s-link" name="link_url" type="url" defaultValue={sheet?.link_url ?? ""} placeholder="https://drive.google.com/…" />
          </label>
        ) : (
          <label
            className={`drop${over ? " over" : ""}${file ? " has-file" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]); }}
          >
            <input id="s-file" type="file" accept={ACCEPTED_TYPES.join(",")} onChange={(e) => pick(e.target.files?.[0])} />
            {file ? (
              <span>✓ {file.name}<br /><small>{(file.size / 1048576).toFixed(1)} MB · กดเพื่อเปลี่ยนไฟล์</small></span>
            ) : sheet?.file_path ? (
              <span>ใช้ไฟล์เดิมอยู่ · <u>เลือกไฟล์ใหม่</u> ถ้าต้องการเปลี่ยน</span>
            ) : (
              <span>ลากไฟล์มาวาง หรือ <u>เลือกไฟล์</u><br /><small>PDF, PNG, JPG · ไม่เกิน {MAX_FILE_MB}MB</small></span>
            )}
          </label>
        )}
      </fieldset>

      {!sheet && (
        <label className="check">
          <input type="checkbox" id="s-agree" name="agree" />
          <span>ชีทนี้เป็นของฉันหรือได้รับอนุญาตให้แชร์ และไม่ใช่ข้อสอบที่ห้ามเผยแพร่</span>
        </label>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="dialog-foot">
        <button type="button" className="btn btn-ghost" onClick={() => router.back()}>ยกเลิก</button>
        <button type="submit" className="btn btn-ink" disabled={pending}>
          {pending ? "กำลังบันทึก…" : sheet ? "บันทึกการแก้ไข" : "แบ่งปันเลย"}
        </button>
      </div>
    </form>
  );
}
