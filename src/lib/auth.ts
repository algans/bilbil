// Auth.js v5 — Credentials provider + JWT session.
// Adapter kullanmıyoruz: JWT strategy ile gerek yok. User tablosunu kendimiz yönetiyoruz.

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation/auth";

export const { auth, handlers, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // E-postası doğrulanmamışsa giriş'e izin verme.
        // Auth.js'de mesaj iletmek için CredentialsSignin throw ediyoruz —
        // kullanıcıya "doğrulama bekleniyor" mesajını sayfada gösteriyoruz.
        if (!user.emailVerifiedAt) {
          throw new EmailNotVerifiedError();
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
});

// Auth.js v5 stilde özel hata sınıfı — UI'da yakalayıp özel mesaj gösteriyoruz.
export class EmailNotVerifiedError extends Error {
  static type = "EmailNotVerified" as const;
  type = EmailNotVerifiedError.type;
  constructor() {
    super("E-posta doğrulanmadı");
  }
}
