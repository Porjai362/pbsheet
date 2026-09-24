"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Kind = "pdf" | "image" | "link";
type Status = { state: "loading" } | { state: "ready"; total?: number } | { state: "error"; message: string };

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
  const [status, setStatus] = useState<Status>({ state: "loading" });
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
    let cleanupPdf: (() => void) | null = null;

    (async () => {
      const res = await fetch(`/api/sheets/${sheetId}/file`, { cache: "no-store" });
      if (!res.ok) throw new Error(res.status === 404 ? "ไม่พบไฟล์ชีท" : "โหลดชีทไม่สำเร็จ");
      const blob = await res.blob();
      const width = Math.min(box.clientWidth || 900, 1100);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (kind === "image") {
        const bmp = await createImageBitmap(blob);
        const scale = Math.min(1, (width * dpr) / bmp.width) || 1;
        const { canvas } = makePage(box, watermarkBg);
        canvas.width = Math.round(bmp.width * scale);
        canvas.height = Math.round(bmp.height * scale);
        canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
        canvas.parentElement?.classList.add("is-drawn");
        bmp.close();
        if (!cancelled) setStatus({ state: "ready" });
        return;
      }

      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
      if (cancelled) return void doc.destroy();

      // สร้างกรอบทุกหน้าไว้ก่อน (ใช้สัดส่วนหน้าแรก) แล้ววาดเฉพาะหน้าที่ใกล้จอ — หน้าไกลจะคืนหน่วยความจำ
      const ratio = (await doc.getPage(1)).getViewport({ scale: 1 });
      const pages = Array.from({ length: doc.numPages }, (_, i) => {
        const { wrap, canvas } = makePage(box, watermarkBg);
        wrap.style.aspectRatio = `${ratio.width} / ${ratio.height}`;
        wrap.dataset.page = String(i + 1);
        return { wrap, canvas, task: null as { cancel(): void } | null, drawn: false, gen: 0 };
      });

      const draw = async (n: number) => {
        const pg = pages[n - 1];
        if (pg.drawn) return;
        pg.drawn = true;
        const gen = pg.gen;
        try {
          const page = await doc.getPage(n);
          if (gen !== pg.gen) return; // ถูก release ระหว่างรอ — ไม่ต้องวาด
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (width * dpr) / base.width });
          pg.wrap.style.aspectRatio = `${base.width} / ${base.height}`;
          pg.canvas.width = Math.floor(viewport.width);
          pg.canvas.height = Math.floor(viewport.height);
          const task = page.render({ canvas: pg.canvas, canvasContext: pg.canvas.getContext("2d")!, viewport });
          pg.task = task;
          await task.promise;
          if (pg.task === task) pg.task = null;
          if (gen === pg.gen) pg.wrap.classList.add("is-drawn");
        } catch {
          if (gen === pg.gen) {
            pg.drawn = false; // วาดไม่สำเร็จ — ลองใหม่เมื่อกลับมาเห็น
            pg.task = null;
          }
        }
      };
      const release = (n: number) => {
        const pg = pages[n - 1];
        if (!pg.drawn) return;
        pg.gen++;
        pg.task?.cancel();
        pg.canvas.width = pg.canvas.height = 0;
        pg.wrap.classList.remove("is-drawn");
        pg.drawn = false;
      };

      const observer = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            const n = Number((e.target as HTMLElement).dataset.page);
            if (e.isIntersecting) void draw(n);
            else release(n);
          }
        },
        { rootMargin: "1500px 0px" },
      );
      pages.forEach((pg) => observer.observe(pg.wrap));
      cleanupPdf = () => {
        observer.disconnect();
        pages.forEach((pg) => pg.task?.cancel());
        void doc.destroy();
      };
      setStatus({ state: "ready", total: doc.numPages });
    })().catch((e: unknown) => {
      if (!cancelled) setStatus({ state: "error", message: e instanceof Error ? e.message : "โหลดชีทไม่สำเร็จ" });
    });

    return () => {
      cancelled = true;
      cleanupPdf?.();
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
          {status.state === "loading" && "กำลังโหลดชีท…"}
          {status.state === "ready" && `${status.total ? `${status.total} หน้า · ` : ""}อ่านได้บนเว็บนี้เท่านั้น · ห้ามเผยแพร่ต่อ`}
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

function makePage(box: HTMLElement, watermarkBg: string): { wrap: HTMLDivElement; canvas: HTMLCanvasElement } {
  const wrap = document.createElement("div");
  wrap.className = "reader-page";
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 0; // ยังไม่วาด = ไม่กินหน่วยความจำ
  const mark = document.createElement("div");
  mark.className = "reader-mark";
  mark.style.backgroundImage = watermarkBg;
  wrap.append(canvas, mark);
  box.append(wrap);
  return { wrap, canvas };
}
