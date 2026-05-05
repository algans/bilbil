// Mockup #6'daki tek auth-card şablonu — 5 ekran aynı görsel dilde.
// Logo + başlık + alt yazı + form + alt link slotu.

import { LogoBlock } from "./LogoBlock";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="auth-card w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7">
      <LogoBlock />
      <h1 className="display text-center text-2xl">{title}</h1>
      {subtitle ? (
        <p className="mt-1 mb-6 text-center text-sm text-slate-500">{subtitle}</p>
      ) : (
        <div className="mb-6" />
      )}
      {children}
      {footer ? <div className="mt-6 text-center text-xs text-slate-500">{footer}</div> : null}
    </div>
  );
}
