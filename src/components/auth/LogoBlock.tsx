// Bilbil logo + isim — auth + email + navbar'da paylaşılan blok.

interface LogoBlockProps {
  size?: "sm" | "md" | "lg";
}

export function LogoBlock({ size = "md" }: LogoBlockProps) {
  const cubeSize =
    size === "lg" ? "h-12 w-12 text-xl" : size === "sm" ? "h-7 w-7 text-sm" : "h-10 w-10 text-lg";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-xl";
  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      <div
        className={`${cubeSize} bg-brand flex items-center justify-center rounded-xl font-bold text-white`}
      >
        B
      </div>
      <span className={`display ${text}`}>Bilbil</span>
    </div>
  );
}
