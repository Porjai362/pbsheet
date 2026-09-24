import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSchoolEmail } from "@/lib/constants";
import { safeNext } from "@/lib/safe-next";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  const loginWith = (error: string) =>
    NextResponse.redirect(`${origin}/login?error=${error}&next=${encodeURIComponent(next)}`);

  // trigger ใน DB ปฏิเสธอีเมลที่ไม่ใช่ของโรงเรียน → Supabase ส่ง error กลับมาแทน code
  const description = searchParams.get("error_description") ?? "";
  if (/school_email_only|saving new user/i.test(description)) return loginWith("domain");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (!isSchoolEmail(data.user?.email)) {
        await supabase.auth.signOut();
        return loginWith("domain");
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return loginWith("1");
}
