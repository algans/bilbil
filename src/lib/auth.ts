// Auth.js v5 skeleton — Faz 1'de Credentials provider + email verification eklenecek
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      // Faz 1'de gerçek implementation: bcrypt karşılaştırma + db lookup
      authorize: async (_credentials) => {
        // TODO Faz 1: validate credentials, return user or null
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
