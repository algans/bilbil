"use client";

// Mockup #7b — "Yeni Bağlantı Gönder" butonu.
// Kullanıcının email'ini bilmediğimiz için tek tıkla otomatik gönderemiyoruz;
// inline mini form açıyoruz.

import { useActionState, useState } from "react";
import { resendVerificationAction, type ActionState } from "@/lib/actions/auth";
import { FormBanner } from "./form-bits";

export function ResendVerificationButton() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    resendVerificationAction,
    undefined
  );
  const [open, setOpen] = useState(false);

  if (state?.ok) {
    return (
      <FormBanner tone="success">
        {state.message ?? "Doğrulama bağlantısı yeniden gönderildi."}
      </FormBanner>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-brand hover:bg-brand-dark w-full rounded-md py-2.5 font-medium text-white shadow-sm transition"
      >
        Yeni Bağlantı Gönder
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2 text-left">
      <label className="block text-sm font-medium" htmlFor="resend-email">
        E-posta adresin
      </label>
      <input
        id="resend-email"
        name="email"
        type="email"
        required
        placeholder="ornek@bilbil.app"
        className="focus:ring-brand w-full rounded-md border border-slate-300 px-3 py-2.5 focus:ring-2 focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="bg-brand hover:bg-brand-dark w-full rounded-md py-2.5 font-medium text-white shadow-sm transition disabled:opacity-60"
      >
        {pending ? "Gönderiliyor…" : "Bağlantıyı Gönder"}
      </button>
    </form>
  );
}
