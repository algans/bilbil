"use client";

// AI chat body — mesaj akışı, input, fetch, proposal handling.
// Vercel AI SDK useChat kullanmıyoruz: structured output + mesaj-başı tam JSON dönüş,
// streaming UX'i gereksiz. Custom state daha az dependency, daha temiz.

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import type { AIChatMessage, AIChatApiResponse, AIChatApiError } from "@/lib/ai/types";
import type { QuizFormInput } from "@/lib/validation/quiz";
import { AIQuizProposalCard } from "@/components/quiz/AIQuizProposalCard";

interface AIChatBodyProps {
  onClose: () => void;
}

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  variant?: "ask" | "propose" | "refuse";
}

const INITIAL_MESSAGE: DisplayMessage = {
  id: "intro",
  role: "assistant",
  content:
    "Selam! Hangi konuda quiz yapalım? Konuyu, soru sayısını (5-50) ve zorluk seviyesini söyleyebilirsin.",
  variant: "ask",
};

export function AIChatBody({ onClose }: AIChatBodyProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([INITIAL_MESSAGE]);
  const [proposal, setProposal] = useState<QuizFormInput | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forceClosed, setForceClosed] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages.length, isLoading, proposal]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isLoading || forceClosed) return;

      const userMsg: DisplayMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
      };

      const next = [...messages, userMsg];
      setMessages(next);
      setInput("");
      setIsLoading(true);
      setError(null);

      try {
        // Intro mesajını sunucuya gönderme (yapay; chat hafızası user-driven)
        const payload: AIChatMessage[] = next
          .filter((m) => m.id !== "intro")
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch("/api/quiz/ai-chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: payload }),
        });

        if (!res.ok) {
          const errBody = (await res.json().catch(() => null)) as AIChatApiError | null;
          if (res.status === 410) setForceClosed(true);
          setError(errBody?.message ?? "Bir hata oluştu");
          return;
        }

        const data = (await res.json()) as AIChatApiResponse;
        setRemaining(data.remaining);
        const { output } = data;

        const assistantMsg: DisplayMessage = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content:
            output.kind === "ask"
              ? output.text
              : output.kind === "propose"
                ? output.summary
                : output.reason,
          variant: output.kind,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        if (output.kind === "propose") {
          setProposal(output.quiz);
        }
      } catch {
        setError("Bağlantı hatası. Tekrar dene.");
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, forceClosed, messages]
  );

  const placeholder = forceClosed
    ? "Mesaj limiti doldu"
    : proposal
      ? "Düzenleme iste (örn: '3. soruyu kolaylaştır')"
      : "Yaz: konu, soru sayısı, zorluk...";

  return (
    <div className="flex flex-1 flex-col">
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-5 py-4"
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {isLoading && <TypingIndicator />}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
          >
            {error}
          </div>
        )}

        {forceClosed && (
          <div
            role="alert"
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          >
            Mesaj limiti doldu. Modal&apos;ı kapatıp tekrar başlayabilirsin.
          </div>
        )}
      </div>

      {proposal && (
        <AIQuizProposalCard quiz={proposal} onClose={onClose} onError={(msg) => setError(msg)} />
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-slate-200 bg-white p-3">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading || forceClosed}
          placeholder={placeholder}
          aria-label="Mesajınız"
          maxLength={500}
          className="focus:border-brand focus:ring-brand/20 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:outline-none disabled:bg-slate-100"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading || forceClosed}
          className="bg-brand hover:bg-brand-dark rounded-md px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
        >
          Gönder
        </button>
      </form>

      {remaining !== null && !forceClosed && (
        <p className="pb-2 text-center text-xs text-slate-400">
          {remaining > 0
            ? `${remaining} mesaj hakkın kaldı`
            : "Bu son mesajın oldu — sonraki cevaptan sonra kapanacak"}
        </p>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: DisplayMessage }) {
  const isUser = message.role === "user";

  if (message.variant === "refuse") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-900"
      >
        <span aria-hidden="true" className="mr-1">
          ⚠
        </span>
        {message.content}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser ? "bg-brand rounded-tr-sm text-white" : "rounded-tl-sm bg-slate-100 text-slate-900"
        }`}
      >
        {message.content}
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start" aria-label="Asistan yazıyor">
      <div className="rounded-2xl rounded-tl-sm bg-slate-100 px-3.5 py-3">
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0.3s]" />
        </div>
      </div>
    </div>
  );
}
