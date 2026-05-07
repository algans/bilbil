// Mockup #15 Host Lobby — büyük ekran (TV/projeksiyon dostu).
// Server component: auth + DB lookup + page render. Live update HostLobby (client).

import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { HostGameOrchestrator } from "@/components/game/HostGameOrchestrator";

export const metadata = { title: "Bilbil — Canlı Oyun" };

// Bu route /host/[pin] altında ama (host) layout grubunda HostNavbar var.
// Lobby ekranı dramatik mor gradient ile kaplı; navbar varlığı tasarımı bozuyor.
// Bu yüzden bu sayfada layout'u override etmemize gerek yok — Next.js layout
// kalsın, lobby kısmı zaten viewport-fill ile navbar'ı küçük gösterir.

export default async function HostLobbyPage({ params }: { params: Promise<{ pin: string }> }) {
  const { pin } = await params;
  const user = await requireUser();

  const session = await db.gameSession.findUnique({
    where: { pin },
    select: {
      id: true,
      pin: true,
      hostId: true,
      status: true,
      quiz: { select: { title: true, _count: { select: { questions: true } } } },
    },
  });

  if (!session || session.hostId !== user.id) notFound();
  if (session.status === "ended" || session.status === "abandoned") {
    redirect("/dashboard");
  }

  return (
    <HostGameOrchestrator
      pin={session.pin}
      quizTitle={session.quiz.title}
      questionCount={session.quiz._count.questions}
    />
  );
}
