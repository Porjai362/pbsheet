import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/** client สิทธิ์เต็ม (ข้าม RLS) — ใช้เฉพาะดึงไฟล์จาก bucket private หลังตรวจสิทธิ์แล้วเท่านั้น */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY");
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
