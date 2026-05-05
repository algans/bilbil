// Mockup #3 birebir — Giriş Yap.

import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Bilbil — Giriş Yap",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; verified?: string }>;
}) {
  const { reset, verified } = await searchParams;

  return (
    <LoginForm
      banner={
        reset
          ? { tone: "success", text: "Şifren güncellendi. Yeni şifrenle giriş yapabilirsin." }
          : verified
            ? { tone: "success", text: "E-posta doğrulandı. Şimdi giriş yapabilirsin." }
            : undefined
      }
      footer={
        <>
          Hesabın yok mu?{" "}
          <Link href="/register" className="text-brand font-medium hover:underline">
            Kayıt ol
          </Link>
        </>
      }
    />
  );
}
