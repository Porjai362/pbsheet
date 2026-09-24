"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
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
