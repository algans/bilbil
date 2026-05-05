"use client";

// Mockup #3 — Login form (client component, useActionState).

import { useActionState } from "react";
import Link from "next/link";
import { AuthCard } from "./AuthCard";
import { loginAction, type ActionState } from "@/lib/actions/auth";
import { FieldError, FormBanner } from "./form-bits";

interface Banner {
  tone: "success" | "error";
  text: string;
}

interface LoginFormProps {
  footer: React.ReactNode;
  banner?: Banner;
}

export function LoginForm({ footer, banner }: LoginFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    loginAction,
    undefined
  );

  const errors = state && !state.ok ? state.errors : undefined;

  return (
    <AuthCard title="Tekrar hoş geldin" subtitle="Hesabına giriş yap" footer={footer}>
      {banner ? <FormBanner tone={banner.tone}>{banner.text}</FormBanner> : null}
      {state && !state.ok && state.message ? (
        <FormBanner tone="error">{state.message}</FormBanner>
      ) : null}

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
            placeholder="ornek@bilbil.app"
            className="focus:ring-brand w-full rounded-md border border-slate-300 px-3 py-2.5 focus:border-transparent focus:ring-2 focus:outline-none"
          />
          <FieldError messages={errors?.email} />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              Şifre
            </label>
            <Link
              href="/forgot-password"
              className="text-brand text-xs hover:underline"
              tabIndex={-1}
            >
              Unuttum
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="focus:ring-brand w-full rounded-md border border-slate-300 px-3 py-2.5 focus:ring-2 focus:outline-none"
          />
          <FieldError messages={errors?.password} />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="bg-brand hover:bg-brand-dark w-full rounded-md py-2.5 font-medium text-white shadow-sm transition disabled:opacity-60"
        >
          {pending ? "Giriş yapılıyor…" : "Giriş Yap"}
        </button>
      </form>
    </AuthCard>
  );
}
