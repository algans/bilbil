"use client";

// Confirm dialog ile delete. Native confirm() — MVP'de yeterli.
// Faz 4 polish'inde shadcn AlertDialog ile değiştirilebilir.

import { useTransition } from "react";
import { deleteQuizAction } from "@/lib/actions/quiz";

interface Props {
  quizId: string;
  title: string;
}

export function DeleteQuizButton({ quizId, title }: Props) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (typeof window !== "undefined") {
      const ok = window.confirm(`"${title}" quiz'i kalıcı olarak silinecek. Devam edilsin mi?`);
      if (!ok) return;
    }
    startTransition(async () => {
      await deleteQuizAction(quizId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
    >
      {pending ? "Siliniyor…" : "Quiz'i Sil"}
    </button>
  );
}
