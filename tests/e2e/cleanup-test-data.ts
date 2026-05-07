// Test verisi temizleyicisi.
// SADECE @bilbil.test domain'li kayıtları siler — manuel veriler asla silinmez.
//
// Çağrı yerleri: tests/e2e/global-setup.ts (suite başında) ve global-teardown.ts (suite sonunda).
// Konvansiyon: helpers.ts içindeki uniqueEmail() her zaman @bilbil.test üretir.

import { PrismaClient } from "@prisma/client";
import { promises as fs } from "node:fs";
import path from "node:path";

const TEST_EMAIL_DOMAIN = "@bilbil.test";

export async function cleanupTestData(): Promise<{
  users: number;
  sessions: number;
  emails: number;
}> {
  const db = new PrismaClient();
  try {
    const testUsers = await db.user.findMany({
      where: { email: { endsWith: TEST_EMAIL_DOMAIN } },
      select: { id: true },
    });
    const userIds = testUsers.map((u) => u.id);

    let sessionCount = 0;
    if (userIds.length > 0) {
      const sessionResult = await db.gameSession.deleteMany({
        where: { hostId: { in: userIds } },
      });
      sessionCount = sessionResult.count;

      await db.emailVerificationToken.deleteMany({ where: { userId: { in: userIds } } });
      await db.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });

      await db.user.deleteMany({ where: { id: { in: userIds } } });
    }

    const emailCount = await cleanupTestEmails();

    return { users: userIds.length, sessions: sessionCount, emails: emailCount };
  } finally {
    await db.$disconnect();
  }
}

async function cleanupTestEmails(): Promise<number> {
  const emailsDir = path.join(process.cwd(), "tmp", "emails");
  let removed = 0;
  try {
    const files = await fs.readdir(emailsDir);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const fullPath = path.join(emailsDir, file);
      try {
        const raw = await fs.readFile(fullPath, "utf8");
        const record = JSON.parse(raw) as { to?: string };
        if (typeof record.to === "string" && record.to.endsWith(TEST_EMAIL_DOMAIN)) {
          await fs.unlink(fullPath);
          removed++;
        }
      } catch {
        // Bozuk JSON ya da paralel yazımdan kalan artık — sessizce sil
        await fs.unlink(fullPath).catch(() => {});
        removed++;
      }
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  return removed;
}
