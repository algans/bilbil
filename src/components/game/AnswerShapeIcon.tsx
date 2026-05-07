import type { AnswerShape } from "@/lib/game/answer-style";

interface Props {
  shape: AnswerShape;
  className?: string;
}

export function AnswerShapeIcon({ shape, className = "w-8 h-8" }: Props) {
  switch (shape) {
    case "triangle":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="white" aria-hidden="true">
          <path d="M12 3 L22 21 L2 21 Z" />
        </svg>
      );
    case "diamond":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="white" aria-hidden="true">
          <path d="M12 2 L22 12 L12 22 L2 12 Z" />
        </svg>
      );
    case "circle":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="white" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case "square":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="white" aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="1" />
        </svg>
      );
  }
}
