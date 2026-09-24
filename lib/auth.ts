import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Profile } from "@/lib/types";

/** ผู้ใช้ที่ login อยู่ + profile (null ถ้ายังไม่ login) — cache ต่อ 1 request */
export const getViewer = cache(async (): Promise<{ id: string; email: string | null; profile: Profile } | null> => {
  await connection(); // ขึ้นกับ cookie ของผู้ใช้เสมอ — ห้าม prerender
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, role, banned")
    .eq("id", data.user.id)
    .single<Profile>();
  if (!profile) return null;
  return { id: data.user.id, email: data.user.email ?? null, profile };
});

export async function requireUser(next = "/") {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`);
  return viewer;
}

export async function requireAdmin() {
  const viewer = await requireUser("/admin");
  if (viewer.profile.role !== "admin" || viewer.profile.banned) redirect("/?denied=1");
  return viewer;
}
