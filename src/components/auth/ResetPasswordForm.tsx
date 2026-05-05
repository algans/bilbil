"use client";

// Mockup #6 — Reset password. Strength meter + canlı eşleşme feedback'i.

import { useActionState, useState } from "react";
import { AuthCard } from "./AuthCard";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { resetPasswordAction, type ActionState } from "@/lib/actions/auth";
import { FieldError, FormBanner } from "./form-bits";

export function ResetPasswordForm({ token, footer }: { token: string; footer: React.ReactNode }) {
  const action = resetPasswordAction.bind(null, token);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const errors = state && !state.ok ? state.errors : undefined;

  const matched = confirm.length > 0 && password === confirm;
  const mismatched = confirm.length > 0 && !matched;

  return (
    <AuthCard
      title="Yeni şifre belirle"
      subtitle="En az 8 karakter, harf + sayı içersin"
      footer={footer}
    >
      {state && !state.ok && state.message ? (
        <FormBanner tone="error">{state.message}</FormBanner>
      ) : null}

      <form action={formAction} className="space-y-3" noValidate>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Yeni şifre
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="focus:ring-brand w-full rounded-md border border-slate-300 px-3 py-2.5 focus:ring-2 focus:outline-none"
          />
          <PasswordStrengthMeter password={password} />
          <FieldError messages={errors?.password} />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium">
            Şifreyi tekrarla
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={`w-full rounded-md px-3 py-2.5 focus:ring-2 focus:outline-none ${
              matched
                ? "border-emerald-400 bg-emerald-50 focus:ring-emerald-500"
                : mismatched
                  ? "border-rose-400 bg-rose-50 focus:ring-rose-500"
                  : "focus:ring-brand border border-slate-300"
            }`}
          />
          {matched ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              Şifreler eşleşiyor
            </p>
          ) : null}
          <FieldError messages={errors?.confirmPassword} />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="bg-brand hover:bg-brand-dark mt-3 w-full rounded-md py-2.5 font-medium text-white shadow-sm transition disabled:opacity-60"
        >
          {pending ? "Sıfırlanıyor…" : "Şifreyi Sıfırla"}
        </button>
      </form>
    </AuthCard>
  );
}
