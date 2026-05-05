// Mockup #11 — Quiz Düzenle. Creation formuyla aynı + alt kısımda silme aksiyonu.

import { notFound } from "next/navigation";
import { QuizForm } from "@/components/quiz/QuizForm";
import { DeleteQuizButton } from "@/components/quiz/DeleteQuizButton";
import { getQuizForCurrentUser } from "@/lib/actions/quiz";

export const metadata = { title: "Bilbil — Quiz Düzenle" };

export default async function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quiz = await getQuizForCurrentUser(id);
  if (!quiz) notFound();

  return (
    <>
      <QuizForm
        mode="edit"
        initial={{
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          questions: quiz.questions.map((q) => ({
            id: q.id,
            prompt: q.prompt,
            timeLimitSec: q.timeLimitSec,
            options: q.options.map((o) => ({
              id: o.id,
              text: o.text,
              isCorrect: o.isCorrect,
              position: o.position,
            })),
          })),
        }}
        onCancelHref={`/quizzes/${quiz.id}`}
      />
      <div className="mx-auto max-w-3xl px-5 pb-12">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="font-semibold text-rose-900">Tehlikeli alan</p>
          <p className="mt-1 text-sm text-rose-700">
            Quiz silinince tüm soruları ve şıkları beraber silinir. Geçmiş oynanmış oyunlar
            silinmez.
          </p>
          <div className="mt-3">
            <DeleteQuizButton quizId={quiz.id} title={quiz.title} />
          </div>
        </div>
      </div>
    </>
  );
}
