"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Kind = "pdf" | "image" | "link";
type Status = { state: "loading"; done: number; total: number } | { state: "ready" } | { state: "error"; message: string };

/**
 * แสดงชีทบนหน้าเว็บโดยไม่ให้ไฟล์ต้นฉบับ: วาด PDF/รูปลง <canvas> + ลายน้ำ + ปิดคลิกขวา/ลาก/Ctrl+S/Ctrl+P/พิมพ์
 * หมายเหตุ: กันการดาวน์โหลดแบบทั่วไปได้ แต่กันการแคปหน้าจอไม่ได้ (ไม่มีเว็บไหนกันได้ 100%)
 */
export default function SheetReader({
  sheetId,
  kind,
  embed,
  externalUrl,
  watermark,
}: {
  sheetId: string;
  kind: Kind;
  embed: string | null;
  externalUrl: string | null;
  watermark: string;
}) {
  const pagesRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>({ state: "loading", done: 0, total: 0 });
  const [zoom, setZoom] = useState(100);

  const watermarkBg = useMemo(() => {
    const text = watermark.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="200"><text x="180" y="100" text-anchor="middle" transform="rotate(-24 180 100)" font-family="sans-serif" font-size="15" fill="rgba(28,35,64,0.13)">${text}</text></svg>`;
    return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
  }, [watermark]);

  // นับยอดเปิดอ่าน 1 ครั้งต่อการเปิดหน้า
  useEffect(() => {
    void createClient().rpc("bump_open", { sheet_id: sheetId });
  }, [sheetId]);

  // กันคีย์ลัดบันทึก/พิมพ์ระหว่างอยู่หน้านี้
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["s", "p"].includes(e.key.toLowerCase())) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // โหลดไฟล์ผ่าน API ของเว็บ แล้ววาดลง canvas
  useEffect(() => {
    if (kind === "link") return;
    const box = pagesRef.current!;
    let cancelled = false;

    (async () => {
      const res = await fetch(`/api/sheets/${sheetId}/file`, { cache: "no-store" });
      if (!res.ok) throw new Error(res.status === 404 ? "ไม่พบไฟล์ชีท" : "โหลดชีทไม่สำเร็จ");
      const blob = await res.blob();
      const width = Math.min(box.clientWidth || 900, 1100);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (kind === "image") {
        const bmp = await createImageBitmap(blob);
        const scale = Math.min(1, (width * dpr) / bmp.width) || 1;
        const canvas = makePage(box, watermarkBg);
        canvas.width = Math.round(bmp.width * scale);
        canvas.height = Math.round(bmp.height * scale);
        canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
        bmp.close();
        if (!cancelled) setStatus({ state: "ready" });
        return;
      }

      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
      setStatus({ state: "loading", done: 0, total: doc.numPages });

      for (let i = 1; i <= doc.numPages && !cancelled; i++) {
        const page = await doc.getPage(i);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: (width * dpr) / base.width });
        const canvas = makePage(box, watermarkBg);
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
        page.cleanup();
        if (!cancelled) setStatus({ state: "loading", done: i, total: doc.numPages });
      }
      await doc.destroy();
      if (!cancelled) setStatus({ state: "ready" });
    })().catch((e: unknown) => {
      if (!cancelled) setStatus({ state: "error", message: e instanceof Error ? e.message : "โหลดชีทไม่สำเร็จ" });
    });

    return () => {
      cancelled = true;
      box.replaceChildren();
    };
  }, [sheetId, kind, watermarkBg]);

  const block = (e: React.SyntheticEvent) => e.preventDefault();

  if (kind === "link") {
    return (
      <div className="reader" onContextMenu={block}>
        {embed ? (
          <div className="reader-embed">
            <iframe src={embed} title="ชีท" allow="fullscreen" referrerPolicy="no-referrer" loading="lazy" />
          </div>
        ) : (
          <div className="panel empty">
            <p>ชีทนี้อยู่บนเว็บอื่น ฝังในหน้านี้ไม่ได้</p>
            {externalUrl && (
              <a className="btn btn-ink" href={externalUrl} target="_blank" rel="noopener noreferrer">เปิดที่เว็บต้นทาง ↗</a>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="reader" onContextMenu={block} onDragStart={block} onCopy={block}>
      <div className="reader-bar">
        <span className="muted">
          {status.state === "loading" && (status.total ? `กำลังโหลดหน้า ${status.done}/${status.total}…` : "กำลังโหลดชีท…")}
          {status.state === "ready" && "อ่านได้บนเว็บนี้เท่านั้น · ห้ามเผยแพร่ต่อ"}
        </span>
        <div className="zoom" role="group" aria-label="ซูม">
          <button className="icon-btn" onClick={() => setZoom((z) => Math.max(50, z - 25))} aria-label="ซูมออก">−</button>
          <span className="zoom-val">{zoom}%</span>
          <button className="icon-btn" onClick={() => setZoom((z) => Math.min(200, z + 25))} aria-label="ซูมเข้า">+</button>
        </div>
      </div>
      {status.state === "error" && <p className="notice error">{status.message}</p>}
      <div className="reader-scroll">
        <div ref={pagesRef} className="reader-pages" style={{ width: `${zoom}%` }} />
      </div>
    </div>
  );
}

function makePage(box: HTMLElement, watermarkBg: string) {
  const wrap = document.createElement("div");
  wrap.className = "reader-page";
  const canvas = document.createElement("canvas");
  const mark = document.createElement("div");
  mark.className = "reader-mark";
  mark.style.backgroundImage = watermarkBg;
  wrap.append(canvas, mark);
  box.append(wrap);
  return canvas;
}
