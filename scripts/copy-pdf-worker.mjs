// คัดลอก worker ของ pdf.js ไปไว้ใน public/ ให้หน้า /read โหลดได้ (รันอัตโนมัติตอน npm install / build)
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const src = join(dirname(require.resolve("pdfjs-dist/package.json")), "build", "pdf.worker.min.mjs");
mkdirSync("public", { recursive: true });
copyFileSync(src, join("public", "pdf.worker.min.mjs"));
console.log("pdf.js worker → public/pdf.worker.min.mjs");
