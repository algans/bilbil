// Auth formlarında paylaşılan küçük UI parçaları.

interface FieldErrorProps {
  messages?: string[];
}

export function FieldError({ messages }: FieldErrorProps) {
  if (!messages?.length) return null;
  return <p className="mt-1 text-xs text-rose-600">{messages[0]}</p>;
}

interface FormBannerProps {
  tone: "success" | "error";
  children: React.ReactNode;
}

export function FormBanner({ tone, children }: FormBannerProps) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-rose-200 bg-rose-50 text-rose-900";
  return <div className={`mb-4 rounded-lg border ${styles} p-3 text-sm`}>{children}</div>;
}
