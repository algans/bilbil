// Mockup #14 — Navbar layout. Tüm host sayfalarında ortak.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/lib/actions/auth";

interface Props {
  user: { displayName: string };
}

const NAV_LINKS = [
  { href: "/dashboard", label: "Quiz'lerim" },
  { href: "/history", label: "Geçmiş" },
];

export function HostNavbar({ user }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Live host game ekranı (mockup #15-19) tam ekran mor gradient hedefler.
  // Navbar bu route'larda render edilmez.
  if (pathname.startsWith("/host/")) return null;
  const initials = user.displayName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="bg-brand flex h-8 w-8 items-center justify-center rounded-lg font-bold text-white">
              B
            </div>
            <span className="font-bold">Bilbil</span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_LINKS.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    active ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/quizzes/new"
            className="text-brand hover:bg-brand/5 hidden rounded-md px-3 py-1.5 text-sm font-medium sm:inline-block"
          >
            + Yeni Quiz
          </Link>
          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={open}
              className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-slate-100"
            >
              <div className="bg-brand flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white">
                {initials}
              </div>
              <span className="hidden text-sm font-medium sm:block">{user.displayName}</span>
              <svg
                className="h-3.5 w-3.5 text-slate-500"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {open ? (
              <div className="absolute right-0 mt-1 w-48 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    Çıkış Yap
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
