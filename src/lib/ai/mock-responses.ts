// Mock cevap üreticisi — AI_MOCK=1 set edildiğinde OpenAI'a gitmek yerine bu kullanılır.
// Amaç: test/e2e/CI deterministik çalışsın, OPENAI_API_KEY zorunlu olmasın.
//
// Routing (öncelik sırasıyla):
//   1. Off-topic (şiir/kod/terapi) → refuse
//   2. Edit intent + önceki proposal → propose (güncellenmiş)
//   3. Quiz keyword (matematik/tarih/...) → propose
//   4. Rapor keyword (kazandı/kim/kaç/en çok/en zor) → report_answer (fixture)
//   5. default → ask

import type { AIChatMessage } from "@/lib/ai/types";
import type { AIResponseParsed } from "@/lib/ai/quiz-schema";

const OFF_TOPIC_RE = /şiir|hikaye|kod yaz|debug|terapi|hava durumu|sevgili/i;
const EDIT_INTENT_RE = /değiştir|kolaylaştır|zorlaştır|güncelle|yeniden|fix/i;
const TOPIC_RE = /matematik|tarih|coğrafya|bilim|spor|sinema|edebiyat|fizik|kimya/i;
const REPORT_RE = /kazandı|kim |kaç oyun|kaç soru|en çok|en zor|ortalama|hangi quiz|kazanan/i;

function mockMathQuiz() {
  return {
    title: "Temel Matematik",
    description: "Hızlı 4 işlem testi",
    questions: [
      {
        prompt: "2 + 3 kaçtır?",
        timeLimitSec: 15,
        options: [
          { text: "4", position: 0, isCorrect: false },
          { text: "5", position: 1, isCorrect: true },
          { text: "6", position: 2, isCorrect: false },
          { text: "7", position: 3, isCorrect: false },
        ],
      },
      {
        prompt: "9 × 8 kaçtır?",
        timeLimitSec: 20,
        options: [
          { text: "63", position: 0, isCorrect: false },
          { text: "71", position: 1, isCorrect: false },
          { text: "72", position: 2, isCorrect: true },
          { text: "81", position: 3, isCorrect: false },
        ],
      },
      {
        prompt: "100'ün %25'i kaçtır?",
        timeLimitSec: 20,
        options: [
          { text: "10", position: 0, isCorrect: false },
          { text: "20", position: 1, isCorrect: false },
          { text: "25", position: 2, isCorrect: true },
          { text: "50", position: 3, isCorrect: false },
        ],
      },
    ],
  };
}

function mockHistoryQuiz() {
  return {
    title: "Türk Tarihi — Temel Bilgiler",
    description: "Cumhuriyet dönemi giriş",
    questions: [
      {
        prompt: "Türkiye Cumhuriyeti hangi yıl ilan edildi?",
        timeLimitSec: 20,
        options: [
          { text: "1920", position: 0, isCorrect: false },
          { text: "1921", position: 1, isCorrect: false },
          { text: "1923", position: 2, isCorrect: true },
          { text: "1925", position: 3, isCorrect: false },
        ],
      },
      {
        prompt: "Atatürk'ün doğum yeri neresidir?",
        timeLimitSec: 20,
        options: [
          { text: "İstanbul", position: 0, isCorrect: false },
          { text: "Selanik", position: 1, isCorrect: true },
          { text: "İzmir", position: 2, isCorrect: false },
          { text: "Ankara", position: 3, isCorrect: false },
        ],
      },
    ],
  };
}

function pickQuiz(topic: string) {
  if (/tarih/i.test(topic)) return mockHistoryQuiz();
  return mockMathQuiz();
}

function pickReportAnswer(question: string): string {
  if (/kim kazandı|son oyunu/i.test(question)) {
    return "Son oyununu Mehmet 4200 puanla kazandı, ikinci sırada 3850 puanla Ayşe vardı. (mock veri)";
  }
  if (/en çok kazanan/i.test(question)) {
    return "En çok kazanan oyuncun 5 galibiyetle Mehmet. Ayşe 3 galibiyetle ikinci sırada. (mock veri)";
  }
  if (/kaç oyun/i.test(question)) {
    return "Bu ay toplam 12 oyun oynandı. (mock veri)";
  }
  if (/en zor/i.test(question)) {
    return "En zor sorun '2. Dünya Savaşı hangi yılda başladı?' — sadece %35 doğru cevap aldı. (mock veri)";
  }
  return "Sonuçlar hazır. (mock veri)";
}

export function getMockResponse(messages: AIChatMessage[]): AIResponseParsed {
  const userMessages = messages.filter((m) => m.role === "user");
  const lastUser = userMessages[userMessages.length - 1]?.content ?? "";

  if (OFF_TOPIC_RE.test(lastUser)) {
    return {
      kind: "refuse",
      reason: "Sadece quiz oluşturmana yardım edebilirim. Hangi konuda quiz yapalım?",
    };
  }

  const previousProposal = messages.some(
    (m) => m.role === "assistant" && m.content.includes("[PROPOSAL]")
  );

  if (previousProposal && EDIT_INTENT_RE.test(lastUser)) {
    const quiz = mockMathQuiz();
    quiz.questions[0]!.prompt = "1 + 1 kaçtır? (güncellenmiş)";
    return {
      kind: "propose",
      summary: "[PROPOSAL] Quiz güncellendi, soru 1 kolaylaştırıldı.",
      quiz,
    };
  }

  if (TOPIC_RE.test(lastUser)) {
    return {
      kind: "propose",
      summary: "[PROPOSAL] İstediğin konuda quiz hazır. Kontrol et:",
      quiz: pickQuiz(lastUser),
    };
  }

  if (REPORT_RE.test(lastUser)) {
    return {
      kind: "report_answer",
      answer: pickReportAnswer(lastUser),
    };
  }

  return {
    kind: "ask",
    text: "Hangi konuda quiz olsun? Yoksa geçmiş oyunların hakkında bir şey mi sormak istersin?",
  };
}
