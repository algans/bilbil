// Leaderboard sıralama + tie-break — Faz 3.
//
// Karar (kullanıcı onaylı, 2026-05-07): Tie-break = ortalama yanıt süresi.
//
// Eşit toplam skorda hangi oyuncu önce gelir?
//   - Düşük ortalama yanıt süresi → daha üstte (hızlı oyuncu kazanır).
//   - Cevapsız (timeout) sorularda yanıt süresi = soru toplam süresi (penalty).
//
// İkincil tie-break (ortalama da eşit ise): nickname alfabetik.
//
// Neden ortalama (toplam değil)?
//   - Soru başına eşit ağırlık. 5 soruda 3'üne hızlı, 2'sine geç cevaplayan ile
//     hepsine ortalama hızda cevaplayan adil karşılaştırılır.
//   - Soru sayısı game-by-game değişebilir → toplam karşılaştırılamaz.

export interface LeaderboardEntryInput {
  playerToken: string;
  nickname: string;
  totalScore: number;
  /** Her sorudaki yanıt süresi (ms). Cevapsız soru için soru toplam süresi yazılır. */
  answerTimesMs: number[];
}

export interface LeaderboardEntry {
  rank: number;
  playerToken: string;
  nickname: string;
  totalScore: number;
  averageAnswerTimeMs: number;
}

/**
 * Oyuncuları sırala:
 *   1. Toplam skor (yüksek → üstte)
 *   2. Ortalama yanıt süresi (düşük → üstte)
 *   3. Nickname (alfabetik)
 *
 * Boş `answerTimesMs` (henüz hiç soru çıkmamış) → ortalama Infinity (en aşağı çekilir).
 * Aynı skor + aynı ortalama olursa nickname'e göre kararlı.
 */
export function rankPlayers(input: LeaderboardEntryInput[]): LeaderboardEntry[] {
  const withAvg = input.map((p) => ({
    ...p,
    averageAnswerTimeMs:
      p.answerTimesMs.length > 0
        ? p.answerTimesMs.reduce((s, t) => s + t, 0) / p.answerTimesMs.length
        : Number.POSITIVE_INFINITY,
  }));

  withAvg.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (a.averageAnswerTimeMs !== b.averageAnswerTimeMs) {
      return a.averageAnswerTimeMs - b.averageAnswerTimeMs;
    }
    return a.nickname.localeCompare(b.nickname, "tr");
  });

  return withAvg.map((p, i) => ({
    rank: i + 1,
    playerToken: p.playerToken,
    nickname: p.nickname,
    totalScore: p.totalScore,
    averageAnswerTimeMs: p.averageAnswerTimeMs,
  }));
}

/** En üstteki N oyuncuyu döndürür (default 10). */
export function topN(entries: LeaderboardEntry[], n: number = 10): LeaderboardEntry[] {
  return entries.slice(0, n);
}
