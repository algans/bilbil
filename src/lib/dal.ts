// Data Access Layer — server-only auth check'leri tek noktada.
// Server action'lar ve server component'ler buradan geçer.
// Next.js 16 önerisi: layout.tsx'te değil, veri kaynağına yakın yerde auth check.

import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
}

// React.cache: aynı render pass'te birden çok yerden çağrılırsa tek query.
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, displayName: true, emailVerifiedAt: true },
  });
  if (!user || !user.emailVerifiedAt) return null;

  return { id: user.id, email: user.email, displayName: user.displayName };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
