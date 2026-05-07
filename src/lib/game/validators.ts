// Nickname validation + duplication suggestion.
// Karar 5: aynı oyunda dublication varsa "Ayşe_2" otomatik üret.
// Mockup #21 birebir: 2-16 char, alfanumerik + Türkçe + boşluk/_/.//- ; küfür reddet.

export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 16;

// Alfanumerik (Latin) + Türkçe + boşluk + bazı yumuşatıcı karakterler.
// Emoji, semboller, RTL trick'leri dışlanır.
const NICKNAME_PATTERN = /^[a-zA-ZçğıöşüÇĞİÖŞÜ0-9 _.-]+$/;

const RESERVED = new Set(["host", "admin", "moderator", "system", "bilbil", "anonymous"]);

// Faz 1 deneme listesi — kullanıcı tarafından sağlandı ("eşek", "yaramaz").
// Faz 4 polish'inde bu liste genişletilebilir veya bir 3rd party servis bağlanabilir.
const PROFANITY: readonly string[] = ["eşek", "yaramaz"];

export type NicknameValidationResult =
  | { ok: true; nickname: string }
  | { ok: false; reason: "too_short" | "too_long" | "invalid_chars" | "reserved" | "profanity" };

export function validateNickname(input: unknown): NicknameValidationResult {
  if (typeof input !== "string") return { ok: false, reason: "invalid_chars" };
  const nickname = input.trim();

  if (nickname.length < NICKNAME_MIN_LENGTH) return { ok: false, reason: "too_short" };
  if (nickname.length > NICKNAME_MAX_LENGTH) return { ok: false, reason: "too_long" };
  if (!NICKNAME_PATTERN.test(nickname)) return { ok: false, reason: "invalid_chars" };

  const lower = nickname.toLocaleLowerCase("tr-TR");
  if (RESERVED.has(lower)) return { ok: false, reason: "reserved" };
  if (PROFANITY.some((p) => lower.includes(p))) return { ok: false, reason: "profanity" };

  return { ok: true, nickname };
}

// Aynı session'da alınmış nickname'lerden kaçınmak için alternatif öner.
// Mantık: "Ayşe" alınmışsa "Ayşe_2", o da alınmışsa "Ayşe_3"...
// 50+ aynı isim olursa (pratikte imkansız) random suffix.
export function suggestUniqueNickname(
  baseNickname: string,
  existingNicknames: ReadonlySet<string>,
  maxSequential = 50
): string {
  if (!existingNicknames.has(baseNickname)) return baseNickname;
  for (let i = 2; i <= maxSequential + 1; i++) {
    const candidate = `${baseNickname}_${i}`;
    if (!existingNicknames.has(candidate)) return candidate;
  }
  return `${baseNickname}_${Math.floor(Math.random() * 9000) + 1000}`;
}
