"use client";

// Mockup #4 — Register form. KVKK checkbox + canlı şifre güçlülük göstergesi.

import { useActionState, useState } from "react";
import { AuthCard } from "./AuthCard";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { registerAction, type ActionState } from "@/lib/actions/auth";
import { FieldError, FormBanner } from "./form-bits";

export function RegisterForm({ footer }: { footer: React.ReactNode }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    registerAction,
    undefined
  );
  const [password, setPassword] = useState("");
  const errors = state && !state.ok ? state.errors : undefined;

  return (
    <AuthCard title="Hesap oluştur" subtitle="Birkaç saniye sürer" footer={footer}>
      {state && !state.ok && state.message ? (
        <FormBanner tone="error">{state.message}</FormBanner>
      ) : null}

      <form action={formAction} className="space-y-3" noValidate>
        <div>
          <label htmlFor="displayName" className="mb-1 block text-sm font-medium">
            Ad Soyad
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            autoComplete="name"
            required
            placeholder="Sefer Algan"
            className="focus:ring-brand w-full rounded-md border border-slate-300 px-3 py-2.5 focus:ring-2 focus:outline-none"
          />
          <FieldError messages={errors?.displayName} />
        </div>
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
            placeholder="ornek@bilbil.app"
            className="focus:ring-brand w-full rounded-md border border-slate-300 px-3 py-2.5 focus:ring-2 focus:outline-none"
          />
          <FieldError messages={errors?.email} />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Şifre
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

        <label className="flex cursor-pointer items-start gap-2 pt-2 text-xs text-slate-600">
          <input type="checkbox" name="acceptTerms" required className="accent-brand mt-0.5" />
          <span>
            <span className="text-brand hover:underline">Kullanıcı sözleşmesi</span> ve{" "}
            <span className="text-brand hover:underline">KVKK aydınlatma metni</span>&apos;ni
            okudum, kabul ediyorum.
          </span>
        </label>
        <FieldError messages={errors?.acceptTerms} />

        <button
          type="submit"
          disabled={pending}
          className="bg-brand hover:bg-brand-dark mt-2 w-full rounded-md py-2.5 font-medium text-white shadow-sm transition disabled:opacity-60"
        >
          {pending ? "Hesap oluşturuluyor…" : "Hesap Oluştur"}
        </button>
      </form>
    </AuthCard>
  );
}
