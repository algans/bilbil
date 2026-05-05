// Mockup #6 birebir — Yeni şifre belirle.

import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = {
  title: "Bilbil — Şifre Sıfırla",
};

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <ResetPasswordForm
      token={token}
      footer={
        <>
          Hatırladın mı?{" "}
          <Link href="/login" className="text-brand font-medium hover:underline">
            Giriş yap
          </Link>
        </>
      }
    />
  );
}
