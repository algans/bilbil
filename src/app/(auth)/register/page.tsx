// Mockup #4 birebir — Kayıt Ol.

import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Bilbil — Kayıt Ol",
};

export default function RegisterPage() {
  return (
    <RegisterForm
      footer={
        <>
          Zaten hesabın var mı?{" "}
          <Link href="/login" className="text-brand font-medium hover:underline">
            Giriş yap
          </Link>
        </>
      }
    />
  );
}
