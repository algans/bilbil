// PIN üretimi — 6 hane numerik (Kahoot tarzı), 100000-999999 aralığı.
// 1M olası kombinasyon, 50 oyuncu/oturum + makul concurrent oyun sayısında yeterli.
//
// Strateji (karar 11): Çakışma asla kabul edilmez. generateUniquePin() bir
// `isPinTaken` callback'i alır, çakışma varsa retry eder. maxAttempts dolarsa
// throw eder — bu durumda kullanıcı "tekrar dene" mesajı görür (production'da
// rate limit'e takılmadan ulaşılması imkansıza yakın).

const PIN_MIN = 100_000;
const PIN_MAX = 999_999;
export const DEFAULT_MAX_ATTEMPTS = 10;

export class PinGenerationError extends Error {
  constructor(attempts: number) {
    super(
      `PIN üretilemedi: ${attempts} deneme sonrası tüm pin'ler alınmış (sistem yoğun, lütfen tekrar dene).`
    );
    this.name = "PinGenerationError";
  }
}

export function generatePin(): string {
  const n = Math.floor(Math.random() * (PIN_MAX - PIN_MIN + 1)) + PIN_MIN;
  return n.toString();
}

export async function generateUniquePin(
  isPinTaken: (pin: string) => boolean | Promise<boolean>,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const pin = generatePin();
    if (!(await isPinTaken(pin))) return pin;
  }
  throw new PinGenerationError(maxAttempts);
}
