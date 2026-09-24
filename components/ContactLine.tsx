import Link from "next/link";
import { SITE_CONTACT } from "@/lib/constants";

export default function ContactLine() {
  return SITE_CONTACT ? (
    <>ติดต่อผู้ดูแลเว็บได้ที่ <strong>{SITE_CONTACT}</strong></>
  ) : (
    <>ติดต่อผู้ดูแลเว็บได้ผ่านปุ่ม “แจ้งปัญหา” บนชีท หลัง <Link href="/login">เข้าสู่ระบบ</Link></>
  );
}
