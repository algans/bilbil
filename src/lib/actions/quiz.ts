"use server";

// Quiz CRUD — server actions. Tüm endpoint'lerde requireUser() çağrılır,
// owner check'i yapılır (bir host başka host'un quizlerine dokunamaz).

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { quizFormSchema, type QuizFormInput } from "@/lib/validation/quiz";
import type { Prisma } from "@prisma/client";

export type QuizActionState =
  | undefined
  | { ok: true; id?: string; message?: string }
  | { ok: false; message?: string; errors?: Record<string, string[]> };

// ---------- CREATE ----------
export async function createQuizAction(
  input: QuizFormInput
): Promise<
  { ok: true; id: string } | { ok: false; message: string; errors?: Record<string, string[]> }
> {
  const user = await requireUser();
  const parsed = quizFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Form geçersiz",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const data = parsed.data;
  const quiz = await db.quiz.create({
    data: {
      hostId: user.id,
      title: data.title,
      description: data.description,
      isPublished: true,
      questions: {
        create: data.questions.map((q, qIdx) => ({
          prompt: q.prompt,
          order: qIdx,
          timeLimitSec: q.timeLimitSec,
          options: {
            create: q.options.map((o) => ({
              text: o.text,
              isCorrect: o.isCorrect,
              position: o.position,
            })),
          },
        })),
      },
    },
    select: { id: true },
  });

  revalidatePath("/dashboard");
  return { ok: true, id: quiz.id };
}

// ---------- UPDATE ----------
export async function updateQuizAction(
  id: string,
  input: QuizFormInput
): Promise<{ ok: true } | { ok: false; message: string; errors?: Record<string, string[]> }> {
  const user = await requireUser();
  const parsed = quizFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Form geçersiz",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const existing = await db.quiz.findUnique({ where: { id }, select: { hostId: true } });
  if (!existing || existing.hostId !== user.id) {
    return { ok: false, message: "Bu quiz'e erişimin yok" };
  }

  const data = parsed.data;
  // En basit yol: önce eski soruları sil (cascade options da gider), sonra yenilerini ekle.
  // MVP için kabul edilebilir; analytics zaten oyun bittiğinde kayıt ediyor.
  await db.$transaction([
    db.question.deleteMany({ where: { quizId: id } }),
    db.quiz.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        questions: {
          create: data.questions.map((q, qIdx) => ({
            prompt: q.prompt,
            order: qIdx,
            timeLimitSec: q.timeLimitSec,
            options: {
              create: q.options.map((o) => ({
                text: o.text,
                isCorrect: o.isCorrect,
                position: o.position,
              })),
            },
          })),
        },
      },
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath(`/quizzes/${id}`);
  revalidatePath(`/quizzes/${id}/edit`);
  return { ok: true };
}

// ---------- DELETE ----------
export async function deleteQuizAction(id: string): Promise<void> {
  const user = await requireUser();
  const existing = await db.quiz.findUnique({ where: { id }, select: { hostId: true } });
  if (!existing || existing.hostId !== user.id) {
    redirect("/dashboard");
  }

  await db.quiz.delete({ where: { id } });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// ---------- READ HELPERS (server-side only) ----------
export async function listQuizzesForCurrentUser() {
  const user = await requireUser();
  return db.quiz.findMany({
    where: { hostId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      isPublished: true,
      updatedAt: true,
      _count: { select: { questions: true, sessions: true } },
    },
  });
}

export type QuizDetail = Prisma.QuizGetPayload<{
  include: {
    questions: {
      include: { options: true };
      orderBy: { order: "asc" };
    };
  };
}>;

export async function getQuizForCurrentUser(id: string): Promise<QuizDetail | null> {
  const user = await requireUser();
  const quiz = await db.quiz.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { position: "asc" } } },
      },
    },
  });
  if (!quiz || quiz.hostId !== user.id) return null;
  return quiz;
}
