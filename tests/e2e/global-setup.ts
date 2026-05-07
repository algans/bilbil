// Playwright globalSetup — suite başında önceki başarısız koşumdan kalan
// test verilerini temizler. Sadece @bilbil.test domain'li kayıtları etkiler.

import { cleanupTestData } from "./cleanup-test-data";

export default async function globalSetup() {
  const result = await cleanupTestData();
  if (result.users + result.sessions + result.emails > 0) {
    console.log(
      `[e2e:setup] Önceki koşumdan kalan test verisi temizlendi → ` +
        `${result.users} user, ${result.sessions} session, ${result.emails} mail`
    );
  }
}
