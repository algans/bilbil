// Host layout — Mockup #14 navbar + auth guard.

import { requireUser } from "@/lib/dal";
import { HostNavbar } from "@/components/layout/HostNavbar";

export default async function HostLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen bg-slate-100">
      <HostNavbar user={user} />
      {children}
    </div>
  );
}
