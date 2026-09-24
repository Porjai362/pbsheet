import { BUCKET, SUPABASE_URL } from "@/lib/supabase/env";
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

export function sheetUrl(s: Pick<Sheet, "link_url" | "file_path">) {
  if (s.link_url) return safeUrl(s.link_url);
  if (!s.file_path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${s.file_path.split("/").map(encodeURIComponent).join("/")}`;
}

export function sheetKind(s: Pick<Sheet, "link_url" | "file_path">) {
  if (s.link_url) return "LINK";
  return /\.(png|jpe?g|webp)$/i.test(s.file_path ?? "") ? "IMG" : "PDF";
}
