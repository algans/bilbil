// Mockup #5 birebir — Şifremi unuttum + inline success state.

import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "Bilbil — Şifremi Unuttum",
};

export default function ForgotPasswordPage() {
  return (
    <ForgotPasswordForm
      footer={
        <Link href="/login" className="text-brand font-medium hover:underline">
          ← Giriş&apos;e dön
        </Link>
      }
    />
  );
}
