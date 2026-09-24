"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { BUCKET } from "@/lib/supabase/env";

/** ลบชีท — RLS อนุญาตเฉพาะเจ้าของหรือแอดมิน */
export async function deleteSheet(formData: FormData) {
  await requireUser("/me");
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { data: sheet } = await supabase.from("sheets").select("id, file_path").eq("id", id).maybeSingle();
  if (!sheet) return;
  const { error } = await supabase.from("sheets").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (sheet.file_path) await supabase.storage.from(BUCKET).remove([sheet.file_path]);
  revalidatePath("/", "layout");
}

export async function updateDisplayName(formData: FormData) {
  const viewer = await requireUser("/me");
  const name = String(formData.get("display_name") ?? "").trim().slice(0, 40);
  if (!name) return;
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", viewer.id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

/**
 * ลบบัญชีตัวเองถาวร — ลบไฟล์ชีททั้งหมดใน storage แล้วลบผู้ใช้ออกจาก auth
 * ข้อมูลใน DB (profile, ชีท, หัวใจ, รายงาน) ถูกลบตามด้วย on delete cascade
 */
export async function deleteAccount(_prev: { error: string | null }, formData: FormData): Promise<{ error: string | null }> {
  const viewer = await requireUser("/me");
  if (String(formData.get("confirm") ?? "").trim() !== "ลบบัญชี") {
    return { error: "พิมพ์คำว่า “ลบบัญชี” ให้ถูกต้องก่อนกดยืนยัน" };
  }

  const admin = createAdminClient();

  // แอดมินคนสุดท้ายลบบัญชีไม่ได้ — ไม่อย่างนั้นจะไม่มีใครดูแลเว็บ
  if (viewer.profile.role === "admin") {
    const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin").eq("banned", false);
    if ((count ?? 0) <= 1) return { error: "คุณเป็นแอดมินคนสุดท้าย ตั้งแอดมินคนอื่นก่อนแล้วค่อยลบบัญชี" };
  }

  // ไฟล์ที่ต้องลบ = ทุกไฟล์ในโฟลเดอร์ของผู้ใช้ + ไฟล์ของชีทที่ผู้ใช้เป็นเจ้าของ (กรณีแอดมินเคยเปลี่ยนไฟล์ให้)
  const paths = new Set<string>();
  const { data: owned } = await admin.from("sheets").select("file_path").eq("owner_id", viewer.id);
  owned?.forEach((s) => s.file_path && paths.add(s.file_path));
  for (let offset = 0; ; offset += 1000) {
    const { data: files, error } = await admin.storage.from(BUCKET).list(viewer.id, { limit: 1000, offset });
    if (error || !files?.length) break;
    files.forEach((f) => paths.add(`${viewer.id}/${f.name}`));
    if (files.length < 1000) break;
  }
  const list = [...paths];
  for (let i = 0; i < list.length; i += 500) {
    const { error } = await admin.storage.from(BUCKET).remove(list.slice(i, i + 500));
    if (error) return { error: "ลบไฟล์ชีทไม่สำเร็จ ลองใหม่อีกครั้ง: " + error.message };
  }

  const { error } = await admin.auth.admin.deleteUser(viewer.id);
  if (error) return { error: "ลบบัญชีไม่สำเร็จ: " + error.message };

  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  redirect("/?deleted=1");
}
