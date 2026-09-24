import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SheetForm from "@/components/SheetForm";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Sheet } from "@/lib/types";

export const metadata: Metadata = { title: "แบ่งปันชีท" };

export default async function SharePage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const viewer = await requireUser(edit ? `/share?edit=${edit}` : "/share");

  let sheet: Sheet | null = null;
  if (edit) {
    const supabase = await createClient();
    const { data } = await supabase.from("sheets").select("*").eq("id", edit).maybeSingle<Sheet>();
    if (!data || (data.owner_id !== viewer.id && viewer.profile.role !== "admin")) notFound();
    sheet = data;
  }

  return (
    <div className="page" style={{ maxWidth: 680 }}>
      <div className="page-head">
        <p className="eyebrow">{sheet ? "แก้ไขชีท" : "แบ่งปันชีท"}</p>
        <h1>{sheet ? sheet.title : "ส่งต่อชีทของคุณให้เพื่อนพิบูล"}</h1>
      </div>
      {viewer.profile.banned ? (
        <p className="notice error">บัญชีนี้ถูกระงับการแบ่งปันชีท ติดต่อแอดมินหากคิดว่าผิดพลาด</p>
      ) : (
        <SheetForm userId={viewer.id} defaultAuthor={viewer.profile.display_name} sheet={sheet} />
      )}
    </div>
  );
}
