// Mockup #21 (nickname) → #22 (lobby waiting). Tek route, JS ile state geçişi.
// Server: PIN var mı + status=lobby mi kontrolü, sonra <PlayerJoinFlow> render.

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PlayerGameOrchestrator } from "@/components/game/PlayerGameOrchestrator";

export const metadata = { title: "Bilbil — Katıl" };

export default async function PlayerJoinPage({ params }: { params: Promise<{ pin: string }> }) {
  const { pin } = await params;

  if (!/^[0-9]{6}$/.test(pin)) redirect("/play?error=invalid");

  // PIN'in DB'de aktif (lobby) bir session olup olmadığını kontrol et.
  // Live game state in-memory'de olabilir, ama biz yine DB'yi authority kabul ediyoruz.
  const session = await db.gameSession.findUnique({
    where: { pin },
    select: { status: true, quiz: { select: { title: true } } },
  });

  if (!session) redirect("/play?error=invalid");
  if (session.status !== "lobby") redirect("/play?error=invalid");

  return <PlayerGameOrchestrator pin={pin} quizTitle={session.quiz.title} />;
}

// Bu route public — middleware'in /play'i protect etmemesi için
// matcher'a göre /play/[pin] de protected listede değil.
// Auth.js middleware şu an /dashboard, /quizzes, /history, /host'u protect ediyor.

export const dynamic = "force-dynamic"; // Her request'te DB lookup
