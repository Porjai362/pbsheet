"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BUCKET } from "@/lib/supabase/env";

// ทุก action เช็คสิทธิ์แอดมินฝั่งเซิร์ฟเวอร์ก่อน และ RLS ใน DB ตรวจซ้ำอีกชั้น

export async function setSheetHidden(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("sheets")
    .update({ hidden: formData.get("hidden") === "true" })
    .eq("id", String(formData.get("id")));
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function adminDeleteSheet(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { data: sheet } = await supabase.from("sheets").select("file_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("sheets").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (sheet?.file_path) await supabase.storage.from(BUCKET).remove([sheet.file_path]);
  revalidatePath("/", "layout");
}

export async function resolveReport(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .update({ resolved: formData.get("resolved") !== "false" })
    .eq("id", String(formData.get("id")));
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function setUserRole(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  const role = formData.get("role") === "admin" ? "admin" : "user";
  if (id === admin.id) throw new Error("เปลี่ยนสิทธิ์ของตัวเองไม่ได้");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function setUserBanned(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  if (id === admin.id) throw new Error("ระงับบัญชีตัวเองไม่ได้");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ banned: formData.get("banned") === "true" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
