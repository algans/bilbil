// Cevap şıkları için kalıcı renk + şekil eşlemesi (mockup'lardan).
// Renk körü a11y için renk + şekil ikili kodlama.
// 4 sabit pozisyon: 0=kırmızı üçgen, 1=mavi elmas, 2=sarı daire, 3=yeşil kare.

export type AnswerShape = "triangle" | "diamond" | "circle" | "square";

export interface AnswerStyle {
  /** Tailwind background class (a-red, a-blue, a-yellow, a-green) */
  bgClass: string;
  /** Tailwind opacity-30 background (vote bar arka planı) */
  bgSoftClass: string;
  /** Şekil enum */
  shape: AnswerShape;
  /** Şekilin Unicode glyph karşılığı (UI'da küçük gösterim için) */
  glyph: string;
  /** Türkçe ismi (a11y için) */
  label: string;
}

export const ANSWER_STYLES: readonly AnswerStyle[] = [
  {
    bgClass: "bg-a-red",
    bgSoftClass: "bg-a-red/30",
    shape: "triangle",
    glyph: "▲",
    label: "üçgen",
  },
  {
    bgClass: "bg-a-blue",
    bgSoftClass: "bg-a-blue/30",
    shape: "diamond",
    glyph: "◆",
    label: "elmas",
  },
  {
    bgClass: "bg-a-yellow",
    bgSoftClass: "bg-a-yellow/30",
    shape: "circle",
    glyph: "●",
    label: "daire",
  },
  {
    bgClass: "bg-a-green",
    bgSoftClass: "bg-a-green/30",
    shape: "square",
    glyph: "■",
    label: "kare",
  },
];

export function styleForPosition(position: number): AnswerStyle {
  return ANSWER_STYLES[position] ?? ANSWER_STYLES[0];
}
