import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReadActions from "@/components/ReadActions";
import SheetReader from "@/components/SheetReader";
import { getViewer } from "@/lib/auth";
import { EXAM_LABEL } from "@/lib/constants";
import { embedUrl, safeUrl, sheetKind, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Sheet } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

async function getSheet(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("sheets").select("*").eq("id", id).maybeSingle<Sheet>();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const sheet = await getSheet((await params).id);
  return { title: sheet ? sheet.title : "ไม่พบชีท" };
}

export default async function ReadPage({ params }: Props) {
  const { id } = await params;
  const [sheet, viewer] = await Promise.all([getSheet(id), getViewer()]);
  if (!sheet) notFound();

  let liked = false;
  if (viewer) {
    const supabase = await createClient();
    const { data } = await supabase.from("likes").select("sheet_id").eq("sheet_id", sheet.id).eq("user_id", viewer.id).maybeSingle();
    liked = Boolean(data);
  }

  const kind = sheet.link_url ? "link" : sheetKind(sheet) === "IMG" ? "image" : "pdf";
  const watermark = viewer
    ? `ชีทพิบูล · ${viewer.email ?? viewer.profile.display_name}`
    : "ชีทพิบูล · ห้ามเผยแพร่ต่อ";

  return (
    <div className="page read-page">
      <div className="read-head">
        <Link href="/#browse" className="back-link">← กลับไปหน้าชีท</Link>
        <p className="eyebrow">ม.{sheet.grade} · {sheet.subject} · เทอม {sheet.term} {EXAM_LABEL[sheet.exam]}</p>
        <h1>{sheet.title}</h1>
        <p className="muted">โดย {sheet.author_name} · {timeAgo(sheet.created_at)} · เปิดอ่าน {sheet.open_count + 1} ครั้ง</p>
        {sheet.description && <p className="read-desc">{sheet.description}</p>}
        <ReadActions sheet={sheet} viewerId={viewer?.id ?? null} initialLiked={liked} />
        {sheet.hidden && <p className="notice error">ชีทนี้ถูกซ่อนอยู่ — เห็นได้เฉพาะเจ้าของและแอดมิน</p>}
      </div>

      <SheetReader
        sheetId={sheet.id}
        kind={kind}
        embed={kind === "link" ? embedUrl(sheet.link_url) : null}
        externalUrl={kind === "link" ? safeUrl(sheet.link_url) : null}
        watermark={watermark}
      />
    </div>
  );
}
