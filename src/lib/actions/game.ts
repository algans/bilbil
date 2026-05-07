"use server";

// Live game session yönetimi — server actions.
// Kararlar:
// - Auth: requireUser (host quiz'in sahibi olmalı)
// - PIN: in-memory + DB unique check (DB'de pin field unique constraint var)
// - Quiz validity: en az 1 soru olmalı (Faz 1 zaten validation ile garantiler ama yine kontrol)

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { generateUniquePin } from "@/lib/game/pin-generator";
import { gameManager } from "@/lib/game/state-machine";

export async function createGameSessionAction(quizId: string): Promise<void> {
  const user = await requireUser();

  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    select: { id: true, hostId: true, title: true, _count: { select: { questions: true } } },
  });
  if (!quiz || quiz.hostId !== user.id) redirect("/dashboard");
  if (quiz._count.questions === 0) {
    // Quiz'de soru yoksa oyun başlatılmaz — preview sayfasına geri dön.
    redirect(`/quizzes/${quizId}`);
  }

  // PIN üretimi: hem in-memory hem DB unique constraint'ini gözet.
  // Faz 2'de DB'de pin unique olduğundan, eski PIN'lerle çakışma olmayacak.
  const pin = await generateUniquePin(async (candidate) => {
    if (gameManager.hasActivePin(candidate)) return true;
    const existing = await db.gameSession.findUnique({
      where: { pin: candidate },
      select: { id: true },
    });
    return !!existing;
  });

  // DB'ye GameSession kaydı (status=lobby, startedAt=null).
  // Socket bağlanınca in-memory state'e attach edilir.
  // hostSocketId Faz 3 + reconnect senaryolarında her bağlantıda güncellenir.
  const session = await db.gameSession.create({
    data: {
      pin,
      quizId: quiz.id,
      hostId: user.id,
      status: "lobby",
    },
    select: { id: true, pin: true },
  });

  // Hemen in-memory'ye eklemiyoruz — host /host/[pin]'e geldiğinde socket
  // üzerinden join_session emit'leyecek, orada attach olunacak.
  // Bu sayede page yüklenmeden manager'da "boş" session olmaz.

  // Quiz title'ı in-memory state'e flag etmek için sessionId ile beraber redirect
  // URL'inde aktarmıyoruz; host page'i DB'den çeker.
  redirect(`/host/${session.pin}`);
}

// Host "İptal Et" derse veya tarayıcı kapatırsa session abandoned'e çekilir.
// Şu an sadece manuel cancel için.
export async function cancelGameSessionAction(pin: string): Promise<void> {
  const user = await requireUser();
  const session = await db.gameSession.findUnique({
    where: { pin },
    select: { id: true, hostId: true, status: true },
  });
  if (!session || session.hostId !== user.id) redirect("/dashboard");
  if (session.status === "ended" || session.status === "abandoned") redirect("/dashboard");

  await db.gameSession.update({
    where: { pin },
    data: { status: "abandoned", endedAt: new Date() },
  });
  gameManager.removeSession(pin);
  redirect("/dashboard");
}
