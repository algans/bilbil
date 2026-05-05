// Auth gate — /dashboard, /quizzes/*, /history protected.
// Auth.js v5'in middleware export'unu kullanıyoruz.
// Optimistic check (sadece JWT cookie var mı diye bakar — DB'ye gitmez).
//
// Not: Next.js 16 sözlüğü "Proxy" diyor ama dosya adı `middleware.ts` hâlâ
// destekleniyor ve Auth.js v5 bu adı bekliyor — runtime davranış aynı.

import { NextResponse } from "next/server";
import { auth as nextAuthMiddleware } from "@/lib/auth";

const PROTECTED_PREFIXES = ["/dashboard", "/quizzes", "/history", "/host"];
const AUTH_PATHS = new Set(["/login", "/register"]);

export default nextAuthMiddleware((req) => {
  const isLoggedIn = !!req.auth?.user;
  const path = req.nextUrl.pathname;

  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
  const isAuthPage = AUTH_PATHS.has(path);

  if (isProtected && !isLoggedIn) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("from", path);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
});

// Auth.js'in kendi config'i + statik asset'leri ve api'leri dışla.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
