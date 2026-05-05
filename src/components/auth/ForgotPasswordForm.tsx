"use client";

// Mockup #5 — Forgot password (inline success state, mockup #5b).

import { useActionState } from "react";
import { AuthCard } from "./AuthCard";
import { requestPasswordResetAction, type ActionState } from "@/lib/actions/auth";
import { FieldError } from "./form-bits";

export function ForgotPasswordForm({ footer }: { footer: React.ReactNode }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    requestPasswordResetAction,
    undefined
  );

  if (state?.ok) {
    return (
      <AuthCard title="Şifrenizi mi unuttunuz?" footer={footer}>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <div className="flex items-start gap-2">
            <svg
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-emerald-900">Bağlantı gönderildi</p>
              <p className="mt-0.5 text-xs text-emerald-700">
                E-postanın gelen kutusunu kontrol et. 5 dk içinde gelmezse spam&apos;a bak.
              </p>
            </div>
          </div>
        </div>
      </AuthCard>
    );
  }

  const errors = state && !state.ok ? state.errors : undefined;

  return (
    <AuthCard
      title="Şifrenizi mi unuttunuz?"
      subtitle="E-postana sıfırlama bağlantısı göndereceğiz"
      footer={footer}
    >
      <form action={formAction} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            E-posta
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="hesap@bilbil.app"
            className="focus:ring-brand w-full rounded-md border border-slate-300 px-3 py-2.5 focus:ring-2 focus:outline-none"
          />
          <FieldError messages={errors?.email} />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="bg-brand hover:bg-brand-dark w-full rounded-md py-2.5 font-medium text-white shadow-sm transition disabled:opacity-60"
        >
          {pending ? "Gönderiliyor…" : "Bağlantı Gönder"}
        </button>
      </form>
    </AuthCard>
  );
}
