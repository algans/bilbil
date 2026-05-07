// Playwright globalTeardown — suite bitince fixture verilerini temizler.
// Sadece @bilbil.test domain'li kayıtları siler; manuel verilere dokunmaz.

import { cleanupTestData } from "./cleanup-test-data";

export default async function globalTeardown() {
  const result = await cleanupTestData();
  console.log(
    `[e2e:teardown] Test verisi temizlendi → ` +
      `${result.users} user, ${result.sessions} session, ${result.emails} mail`
  );
}
