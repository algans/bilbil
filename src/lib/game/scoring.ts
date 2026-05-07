// Puanlama formülü — Faz 3.
//
// Karar (kullanıcı onaylı, 2026-05-07): Formül B — hız bonuslu.
//
// 3 yaklaşım vardı:
//   A) Linear:       correct ? 1000 : 0                        (hız önemsiz)
//   B) Hız bonuslu:  correct ? 500 + 500 * (kalan/toplam) : 0  (Kahoot-tarzı, seçilen)
//   C) Exponential:  correct ? 1000 * sqrt(kalan/toplam) : 0   (geç cevabı çok cezalandırır)
//
// B'nin gerekçesi:
// - Doğru cevabın taban değeri 500 (yarısı garantili) — hızlı yanıtla 1000'e ulaşır.
// - Hız bonusu lineer; oyuncu için tahmin edilebilir.
// - Tüm hızlarda makul fark yaratır.
//
// Yanlış cevap = 0. Cevapsız (timeout) = 0. Geç cevap (deadline sonrası) = 0.

export const MAX_SCORE_PER_QUESTION = 1000;
export const BASE_SCORE_FOR_CORRECT = 500;
export const SPEED_BONUS = 500;

export interface ScoreInput {
  isCorrect: boolean;
  /** Cevap zamanı — soru başlangıcından milisaniye. */
  answeredAtMs: number;
  /** Soru süresi — milisaniye. */
  totalTimeMs: number;
}

/**
 * Bir cevabın puanını hesaplar.
 *
 * Yanlış / cevapsız → 0.
 * Doğru → 500 + 500 * (kalanSüre / toplamSüre), yuvarlanmış.
 *
 * `answeredAtMs >= totalTimeMs` ise (geç cevap) → 0.
 * `answeredAtMs < 0` ise (saçma input) → 0.
 */
export function calculateScore(input: ScoreInput): number {
  if (!input.isCorrect) return 0;
  if (input.answeredAtMs < 0) return 0;
  if (input.answeredAtMs >= input.totalTimeMs) return 0;

  const remainingRatio = (input.totalTimeMs - input.answeredAtMs) / input.totalTimeMs;
  const bonus = Math.round(SPEED_BONUS * remainingRatio);
  return BASE_SCORE_FOR_CORRECT + bonus;
}
