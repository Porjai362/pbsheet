import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { BUCKET } from "@/lib/supabase/env";

// ส่งไฟล์ชีทให้หน้า /read เท่านั้น — ไม่มีลิงก์ Supabase ให้เห็น และเปิด URL นี้ตรง ๆ ในเบราว์เซอร์ไม่ได้
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // อนุญาตเฉพาะ fetch() จากหน้าเว็บเราเอง (กันการวาง URL ในแถบที่อยู่ / ฝังจากเว็บอื่น)
  const site = request.headers.get("sec-fetch-site");
  const dest = request.headers.get("sec-fetch-dest");
  if (site !== "same-origin" || dest !== "empty") {
    return new Response("อ่านชีทได้ที่หน้าเว็บเท่านั้น", { status: 403 });
  }

  // ตรวจสิทธิ์ด้วย RLS ของผู้ใช้คนนี้ (ชีทที่ถูกซ่อนจะหาไม่เจอ ยกเว้นเจ้าของ/แอดมิน)
  const supabase = await createClient();
  const { data: sheet } = await supabase.from("sheets").select("file_path").eq("id", id).maybeSingle();
  if (!sheet?.file_path) return new Response("ไม่พบชีท", { status: 404 });

  const { data: blob, error } = await createAdminClient().storage.from(BUCKET).download(sheet.file_path);
  if (error || !blob) return new Response("โหลดไฟล์ไม่สำเร็จ", { status: 502 });

  return new Response(blob.stream(), {
    headers: {
      "Content-Type": blob.type || "application/octet-stream",
      "Content-Length": String(blob.size),
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
