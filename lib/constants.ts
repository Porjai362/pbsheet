export const SUBJECTS: [name: string, tint: string][] = [
  ["คณิตศาสตร์พื้นฐาน", "#ffd9a8"], ["คณิตศาสตร์เพิ่มเติม", "#ffc98a"],
  ["ฟิสิกส์", "#bfe3ff"], ["เคมี", "#c9f0d8"], ["ชีววิทยา", "#d6f5b8"],
  ["โลกและอวกาศ", "#d8d2ff"], ["วิทยาการคำนวณ", "#c4ecf0"],
  ["ภาษาไทย", "#ffd0d6"], ["ภาษาอังกฤษ", "#ffe8a3"],
  ["สังคมศึกษา", "#f3dcc4"], ["ประวัติศาสตร์", "#ead7c2"],
  ["ภาษาจีน", "#ffc7c2"], ["ภาษาญี่ปุ่น", "#fbd3ea"], ["ภาษาฝรั่งเศส", "#d3e0ff"],
  ["สุขศึกษา/พลศึกษา", "#d9f2e6"], ["ศิลปะ/ดนตรี", "#f6d5ff"], ["การงานอาชีพ", "#e6e2d6"],
  ["อื่น ๆ", "#e4e7f0"],
];
export const SUBJECT_NAMES = SUBJECTS.map(([n]) => n);
export const TINT: Record<string, string> = Object.fromEntries(SUBJECTS);

export const EXAM_LABEL: Record<string, string> = { midterm: "กลางภาค", final: "ปลายภาค", other: "อื่น ๆ" };
export const MAX_FILE_MB = 20;
export const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export const NEXT_EXAM_DATE = process.env.NEXT_PUBLIC_NEXT_EXAM_DATE ?? "";
export const NEXT_EXAM_LABEL = process.env.NEXT_PUBLIC_NEXT_EXAM_LABEL ?? "วันสอบ";

// ช่องทางติดต่อผู้ดูแลเว็บ (เช่น IG/เพจ/อีเมล) — แสดงในหน้านโยบายและกติกา
export const SITE_CONTACT = process.env.NEXT_PUBLIC_CONTACT ?? "";
export const POLICY_UPDATED = "24 กันยายน 2569";
