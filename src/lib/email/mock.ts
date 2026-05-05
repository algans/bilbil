// Mock email gönderici (Faz 1) — Faz 5'te Resend ile değişecek.
// Email'leri tmp/emails/ altına JSON olarak yazar ve console'a basar.
// Test ve manuel doğrulama için: bir kayıt sonrası tmp/emails/ içine bakın.

import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

export interface SentEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  sentAt: string;
}

const EMAILS_DIR = path.join(process.cwd(), "tmp", "emails");

export async function sendEmail(input: Omit<SentEmail, "sentAt">): Promise<SentEmail> {
  const sentAt = new Date().toISOString();
  const record: SentEmail = { ...input, sentAt };

  await fs.mkdir(EMAILS_DIR, { recursive: true });
  const filename = `${sentAt.replace(/[:.]/g, "-")}_${slugify(input.subject)}.json`;
  await fs.writeFile(path.join(EMAILS_DIR, filename), JSON.stringify(record, null, 2), "utf8");

  // Console'da göster ki manuel test sırasında link kopyalanabilsin
  // (gerçek SMTP bağlantısı kurmadığımız için bu en hızlı feedback yolu)
  console.log("\n[mock-email] →", input.to);
  console.log("[mock-email]   konu:", input.subject);
  console.log(
    "[mock-email]   metin:\n" +
      input.text
        .split("\n")
        .map((l) => "             " + l)
        .join("\n")
  );
  console.log("[mock-email]   dosya: tmp/emails/" + filename + "\n");

  return record;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
