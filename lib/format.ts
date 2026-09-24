import type { Sheet } from "@/lib/types";

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} นาทีที่แล้ว`;
  if (s < 86400) return `${Math.round(s / 3600)} ชม.ที่แล้ว`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

export function safeUrl(u: string | null | undefined) {
  if (!u) return null;
  try {
    const x = new URL(u);
    return x.protocol === "https:" || x.protocol === "http:" ? x.href : null;
  } catch {
    return null;
  }
}

/** หน้าอ่านชีทของเว็บ (ทุกชีทเปิดอ่านผ่านหน้านี้ ไม่ลิงก์ไปไฟล์ตรง) */
export function readHref(id: string) {
  return `/read/${id}`;
}

/** แปลงลิงก์ Google Drive / Docs / Canva เป็นแบบฝังในหน้าเว็บได้ (null = ฝังไม่ได้ ต้องเปิดที่เว็บต้นทาง) */
export function embedUrl(link: string | null | undefined) {
  const href = safeUrl(link);
  if (!href) return null;
  const u = new URL(href);
  const host = u.hostname.replace(/^www\./, "");

  if (host === "drive.google.com") {
    const id = u.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] ?? u.searchParams.get("id");
    return id ? `https://drive.google.com/file/d/${id}/preview` : null;
  }
  if (host === "docs.google.com") {
    const m = u.pathname.match(/^\/(document|presentation|spreadsheets)\/d\/([\w-]+)/);
    return m ? `https://docs.google.com/${m[1]}/d/${m[2]}/preview` : null;
  }
  if (host === "canva.com") {
    const m = u.pathname.match(/^\/design\/([\w-]+)(?:\/([\w-]+))?/);
    return m ? `https://www.canva.com/design/${m[1]}${m[2] ? "/" + m[2] : ""}/view?embed` : null;
  }
  return null;
}

export function sheetKind(s: Pick<Sheet, "link_url" | "file_path">) {
  if (s.link_url) return "LINK";
  return /\.(png|jpe?g|webp)$/i.test(s.file_path ?? "") ? "IMG" : "PDF";
}
