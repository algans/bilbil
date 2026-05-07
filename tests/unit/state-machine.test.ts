import { describe, it, expect, beforeEach, vi } from "vitest";
import { GameSessionManager } from "@/lib/game/state-machine";

function setup(): GameSessionManager {
  return new GameSessionManager();
}

const baseInput = {
  sessionId: "sess_1",
  pin: "123456",
  hostId: "host_1",
  hostSocketId: "sock_h",
  quizId: "quiz_1",
  quizTitle: "Test Quiz",
};

describe("GameSessionManager — session lifecycle", () => {
  let mgr: GameSessionManager;
  beforeEach(() => {
    mgr = setup();
  });

  it("createSession ekler ve getByPin döner", () => {
    const session = mgr.createSession(baseInput);
    expect(session.pin).toBe("123456");
    expect(mgr.getByPin("123456")).toBe(session);
  });

  it("aynı PIN'e ikinci kez createSession çağırılamaz", () => {
    mgr.createSession(baseInput);
    expect(() => mgr.createSession(baseInput)).toThrow();
  });

  it("getByPin geçersiz pin'de null döner", () => {
    expect(mgr.getByPin("999999")).toBeNull();
  });

  it("hasActivePin DB collision check için kullanılır", () => {
    expect(mgr.hasActivePin("123456")).toBe(false);
    mgr.createSession(baseInput);
    expect(mgr.hasActivePin("123456")).toBe(true);
  });

  it("removeSession siler", () => {
    mgr.createSession(baseInput);
    mgr.removeSession("123456");
    expect(mgr.getByPin("123456")).toBeNull();
  });
});

describe("GameSessionManager — players", () => {
  let mgr: GameSessionManager;
  beforeEach(() => {
    mgr = setup();
    mgr.createSession(baseInput);
  });

  it("addPlayer ekler ve playerToken döner", () => {
    const r = mgr.addPlayer("123456", "Ayşe", "sock_p1");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.player.nickname).toBe("Ayşe");
      expect(r.player.playerToken).toBeTruthy();
      expect(r.player.socketId).toBe("sock_p1");
    }
  });

  it("aynı nickname'de _2 önerir", () => {
    mgr.addPlayer("123456", "Ayşe", "s1");
    const r = mgr.addPlayer("123456", "Ayşe", "s2");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.player.nickname).toBe("Ayşe_2");
  });

  it("geçersiz nickname reddedilir", () => {
    const r = mgr.addPlayer("123456", "🎉", "s1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("invalid_chars");
  });

  it("küfür içeren nickname reddedilir", () => {
    const r = mgr.addPlayer("123456", "eşek", "s1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("profanity");
  });

  it("PIN aktif değilse reddeder", () => {
    const r = mgr.addPlayer("999999", "Ayşe", "s1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("session_not_found");
  });

  it("max player limitine ulaşınca yeni player reddedilir", () => {
    mgr.createSession({ ...baseInput, pin: "111111", sessionId: "x" });
    for (let i = 0; i < 50; i++) {
      const r = mgr.addPlayer("111111", `User${i}`, `sock${i}`);
      expect(r.ok).toBe(true);
    }
    const r = mgr.addPlayer("111111", "User51", "sock51");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("session_full");
  });

  it("session ended ise yeni player reddedilir", () => {
    mgr.endSession("123456", "ended");
    const r = mgr.addPlayer("123456", "Ayşe", "s1");
    expect(r.ok).toBe(false);
  });

  it("getPlayerByToken oyuncuyu döner", () => {
    const add = mgr.addPlayer("123456", "Ayşe", "s1");
    if (!add.ok) throw new Error("setup fail");
    const r = mgr.getPlayerByToken(add.player.playerToken);
    expect(r?.player.nickname).toBe("Ayşe");
    expect(r?.session.pin).toBe("123456");
  });

  it("removePlayer çıkartır", () => {
    const add = mgr.addPlayer("123456", "Ayşe", "s1");
    if (!add.ok) throw new Error("setup fail");
    mgr.removePlayer(add.player.playerToken);
    expect(mgr.getPlayerByToken(add.player.playerToken)).toBeNull();
  });
});

describe("GameSessionManager — reconnect", () => {
  let mgr: GameSessionManager;
  beforeEach(() => {
    mgr = setup();
    mgr.createSession(baseInput);
  });

  it("reconnectPlayer aynı oyuncuyu yeni socket'le bağlar", () => {
    const add = mgr.addPlayer("123456", "Ayşe", "old_sock");
    if (!add.ok) throw new Error("setup fail");
    const r = mgr.reconnectPlayer(add.player.playerToken, "new_sock");
    expect(r?.player.socketId).toBe("new_sock");
    expect(r?.player.nickname).toBe("Ayşe");
  });

  it("disconnectHost timestamp set eder, reconnectHost temizler", () => {
    const before = Date.now();
    mgr.disconnectHost("123456");
    const session = mgr.getByPin("123456");
    expect(session?.hostDisconnectedAt).toBeGreaterThanOrEqual(before);

    mgr.reconnectHost("123456", "new_host_sock");
    expect(mgr.getByPin("123456")?.hostDisconnectedAt).toBeNull();
    expect(mgr.getByPin("123456")?.hostSocketId).toBe("new_host_sock");
  });
});

describe("GameSessionManager — disconnect / cleanup", () => {
  let mgr: GameSessionManager;
  beforeEach(() => {
    vi.useFakeTimers();
    mgr = setup();
  });

  it("host 2 dakikadan uzun bağlantısızsa cleanup abandon eder", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const session = mgr.createSession(baseInput);
    mgr.disconnectHost(session.pin);

    vi.setSystemTime(now + 2 * 60 * 1000 + 1000);
    const cleaned = mgr.cleanup();
    expect(cleaned.abandoned).toContain(session.pin);
    expect(mgr.getByPin(session.pin)).toBeNull();
  });

  it("lobby 30 dakikadan uzun idle kalırsa abandon eder", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const session = mgr.createSession(baseInput);
    expect(session.status).toBe("lobby");

    vi.setSystemTime(now + 30 * 60 * 1000 + 1000);
    const cleaned = mgr.cleanup();
    expect(cleaned.abandoned).toContain(session.pin);
  });

  it("aktif session cleanup'ta dokunulmaz", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    mgr.createSession(baseInput);
    vi.setSystemTime(now + 10 * 60 * 1000);
    const cleaned = mgr.cleanup();
    expect(cleaned.abandoned).toEqual([]);
  });
});

describe("GameSessionManager — disconnectSocket", () => {
  let mgr: GameSessionManager;
  beforeEach(() => {
    mgr = setup();
    mgr.createSession(baseInput);
  });

  it("player socket disconnect olursa player kaydı kalır ama socketId null'a çekilir", () => {
    const add = mgr.addPlayer("123456", "Ayşe", "sock_p1");
    if (!add.ok) throw new Error("setup fail");
    const r = mgr.handleSocketDisconnect("sock_p1");
    expect(r.kind).toBe("player");
    if (r.kind === "player") expect(r.session.pin).toBe("123456");
    // Player kaydı duruyor ama soketi null
    const found = mgr.getPlayerByToken(add.player.playerToken);
    expect(found?.player.socketId).toBeNull();
  });

  it("host socket disconnect olursa hostDisconnectedAt set edilir", () => {
    const r = mgr.handleSocketDisconnect("sock_h");
    expect(r.kind).toBe("host");
    expect(mgr.getByPin("123456")?.hostDisconnectedAt).toBeTruthy();
  });

  it("bilinmeyen socket için 'unknown' döner", () => {
    expect(mgr.handleSocketDisconnect("nope").kind).toBe("unknown");
  });
});

// ──────────────── Faz 3 — Question Lifecycle ────────────────

const sampleQuestions = [
  {
    id: "q1",
    prompt: "1+1=?",
    order: 1,
    timeLimitSec: 20,
    options: [
      { id: "q1o1", text: "1", position: 0, isCorrect: false },
      { id: "q1o2", text: "2", position: 1, isCorrect: true },
      { id: "q1o3", text: "3", position: 2, isCorrect: false },
      { id: "q1o4", text: "4", position: 3, isCorrect: false },
    ],
  },
  {
    id: "q2",
    prompt: "2+2=?",
    order: 2,
    timeLimitSec: 20,
    options: [
      { id: "q2o1", text: "1", position: 0, isCorrect: false },
      { id: "q2o2", text: "2", position: 1, isCorrect: false },
      { id: "q2o3", text: "3", position: 2, isCorrect: false },
      { id: "q2o4", text: "4", position: 3, isCorrect: true },
    ],
  },
];

describe("GameSessionManager — Faz 3: question lifecycle", () => {
  let mgr: GameSessionManager;
  beforeEach(() => {
    mgr = new GameSessionManager();
    mgr.createSession(baseInput);
    mgr.loadQuestions("123456", sampleQuestions);
    mgr.addPlayer("123456", "Ayşe", "sock_p1");
    mgr.addPlayer("123456", "Mehmet", "sock_p2");
  });

  it("startGame: lobby → countdown, status in_progress", () => {
    const ok = mgr.startGame("123456");
    expect(ok).toBe(true);
    const s = mgr.getByPin("123456")!;
    expect(s.phase).toBe("countdown");
    expect(s.status).toBe("in_progress");
    expect(s.currentQuestionIndex).toBe(0);
  });

  it("startGame: oyuncu yoksa false", () => {
    const empty = new GameSessionManager();
    empty.createSession({ ...baseInput, pin: "999999" });
    empty.loadQuestions("999999", sampleQuestions);
    expect(empty.startGame("999999")).toBe(false);
  });

  it("startGame: soru yoksa false", () => {
    const empty = new GameSessionManager();
    empty.createSession({ ...baseInput, pin: "999999" });
    empty.addPlayer("999999", "Test", "sock_t");
    expect(empty.startGame("999999")).toBe(false);
  });

  it("openCurrentQuestion: countdown → question, startedAtMs set", () => {
    mgr.startGame("123456");
    const q = mgr.openCurrentQuestion("123456", 1000);
    expect(q?.id).toBe("q1");
    const s = mgr.getByPin("123456")!;
    expect(s.phase).toBe("question");
    expect(s.questionStartedAtMs).toBe(1000);
  });

  it("recordAnswer: doğru cevap → score>0", () => {
    mgr.startGame("123456");
    mgr.openCurrentQuestion("123456", 1000);
    const s = mgr.getByPin("123456")!;
    const player = Array.from(s.players.values())[0];
    const r = mgr.recordAnswer(player.playerToken, "q1o2", 5000); // 4sn sonra doğru
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.record.isCorrect).toBe(true);
      expect(r.record.pointsAwarded).toBeGreaterThan(0);
      expect(r.record.answeredAtMs).toBe(4000);
    }
  });

  it("recordAnswer: yanlış cevap → score 0", () => {
    mgr.startGame("123456");
    mgr.openCurrentQuestion("123456", 1000);
    const player = Array.from(mgr.getByPin("123456")!.players.values())[0];
    const r = mgr.recordAnswer(player.playerToken, "q1o1", 2000);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.record.isCorrect).toBe(false);
      expect(r.record.pointsAwarded).toBe(0);
    }
  });

  it("recordAnswer: aynı player iki kez cevap veremez", () => {
    mgr.startGame("123456");
    mgr.openCurrentQuestion("123456", 1000);
    const player = Array.from(mgr.getByPin("123456")!.players.values())[0];
    mgr.recordAnswer(player.playerToken, "q1o2", 2000);
    const r2 = mgr.recordAnswer(player.playerToken, "q1o2", 3000);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.reason).toBe("already_answered");
  });

  it("recordAnswer: question phase'inde değilken reddedilir", () => {
    const player = Array.from(mgr.getByPin("123456")!.players.values())[0];
    const r = mgr.recordAnswer(player.playerToken, "q1o2", 1000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("wrong_phase");
  });

  it("allPlayersAnswered: hepsi cevaplayınca true", () => {
    mgr.startGame("123456");
    mgr.openCurrentQuestion("123456", 1000);
    expect(mgr.allPlayersAnswered("123456")).toBe(false);
    const players = Array.from(mgr.getByPin("123456")!.players.values());
    mgr.recordAnswer(players[0].playerToken, "q1o2", 2000);
    expect(mgr.allPlayersAnswered("123456")).toBe(false);
    mgr.recordAnswer(players[1].playerToken, "q1o1", 3000);
    expect(mgr.allPlayersAnswered("123456")).toBe(true);
  });

  it("closeCurrentQuestion: cevapsız oyunculara timeout penalty atanır", () => {
    mgr.startGame("123456");
    mgr.openCurrentQuestion("123456", 1000);
    const players = Array.from(mgr.getByPin("123456")!.players.values());
    mgr.recordAnswer(players[0].playerToken, "q1o2", 2000);
    // İkinci oyuncu cevaplamadı
    const closed = mgr.closeCurrentQuestion("123456");
    expect(closed?.id).toBe("q1");
    const s = mgr.getByPin("123456")!;
    expect(s.phase).toBe("reveal");
    const answersForQ = s.answers.get("q1")!;
    const skipped = answersForQ.get(players[1].playerToken);
    expect(skipped?.optionId).toBeNull();
    expect(skipped?.isCorrect).toBe(false);
    expect(skipped?.pointsAwarded).toBe(0);
    expect(skipped?.answeredAtMs).toBe(20_000); // totalTime
  });

  it("advanceFromReveal: ara soruda → leaderboard, son soruda → podium", () => {
    mgr.startGame("123456");
    mgr.openCurrentQuestion("123456", 1000);
    mgr.closeCurrentQuestion("123456");
    expect(mgr.advanceFromReveal("123456")).toEqual({ phase: "leaderboard" });

    mgr.advanceToNextQuestion("123456");
    mgr.openCurrentQuestion("123456", 30_000);
    mgr.closeCurrentQuestion("123456");
    const r = mgr.advanceFromReveal("123456");
    expect(r).toEqual({ phase: "podium" });
    const s = mgr.getByPin("123456")!;
    expect(s.status).toBe("ended");
    expect(s.endedAt).toBeTruthy();
  });

  it("toQuestionStateDTO: correctOptionId asla yok", () => {
    mgr.startGame("123456");
    mgr.openCurrentQuestion("123456", 1000);
    const dto = mgr.toQuestionStateDTO("123456");
    expect(dto?.questionIndex).toBe(0);
    expect(dto?.totalQuestions).toBe(2);
    // dto.options'ta isCorrect veya correctOptionId field'ı bulunmamalı
    expect(JSON.stringify(dto)).not.toContain("isCorrect");
    expect(JSON.stringify(dto)).not.toContain("correctOptionId");
    expect(dto?.deadlineAtMs).toBe(1000 + 20 * 1000);
  });

  it("toRevealStateDTO: correctOptionId + perOptionCounts + myAnswer", () => {
    mgr.startGame("123456");
    mgr.openCurrentQuestion("123456", 1000);
    const players = Array.from(mgr.getByPin("123456")!.players.values());
    mgr.recordAnswer(players[0].playerToken, "q1o2", 2000); // doğru
    mgr.recordAnswer(players[1].playerToken, "q1o1", 3000); // yanlış
    mgr.closeCurrentQuestion("123456");
    const dto = mgr.toRevealStateDTO("123456", players[0].playerToken);
    expect(dto?.correctOptionId).toBe("q1o2");
    expect(dto?.perOptionCounts["q1o2"]).toBe(1);
    expect(dto?.perOptionCounts["q1o1"]).toBe(1);
    expect(dto?.myAnswer?.isCorrect).toBe(true);
    expect(dto?.isLast).toBe(false);
  });

  it("toLeaderboardDTO: skor + ortalama yanıt süresine göre sıralanır", () => {
    mgr.startGame("123456");
    mgr.openCurrentQuestion("123456", 1000);
    const players = Array.from(mgr.getByPin("123456")!.players.values());
    // Ayşe doğru + hızlı, Mehmet doğru + yavaş
    mgr.recordAnswer(players[0].playerToken, "q1o2", 2000); // 1sn → yüksek puan
    mgr.recordAnswer(players[1].playerToken, "q1o2", 15_000); // 14sn → düşük puan
    mgr.closeCurrentQuestion("123456");
    const dto = mgr.toLeaderboardDTO("123456");
    expect(dto?.entries[0].nickname).toBe(players[0].nickname);
    expect(dto?.entries[0].rank).toBe(1);
    expect(dto?.entries[1].rank).toBe(2);
    expect(dto?.entries[0].totalScore).toBeGreaterThan(dto!.entries[1].totalScore);
  });

  it("collectFinalRecords: PlayerResult + PlayerAnswer rows hazır", () => {
    mgr.startGame("123456");
    mgr.openCurrentQuestion("123456", 1000);
    const players = Array.from(mgr.getByPin("123456")!.players.values());
    mgr.recordAnswer(players[0].playerToken, "q1o2", 2000);
    mgr.recordAnswer(players[1].playerToken, "q1o1", 3000);
    mgr.closeCurrentQuestion("123456");
    mgr.advanceFromReveal("123456");
    mgr.advanceToNextQuestion("123456");
    mgr.openCurrentQuestion("123456", 30_000);
    mgr.recordAnswer(players[0].playerToken, "q2o4", 31_000);
    mgr.closeCurrentQuestion("123456");
    mgr.advanceFromReveal("123456"); // → podium

    const records = mgr.collectFinalRecords("123456");
    expect(records?.results).toHaveLength(2);
    expect(records?.results[0].finalRank).toBe(1);
    // 2 soru × 2 oyuncu = 4 PlayerAnswer (timeout dahil)
    expect(records?.answers.length).toBe(4);
    const answeredOption = records?.answers.find((a) => a.optionId === "q1o2");
    expect(answeredOption?.isCorrect).toBe(true);
    const timeout = records?.answers.find((a) => a.optionId === null);
    expect(timeout?.isCorrect).toBe(false);
  });
});

describe("GameSessionManager — ended session TTL cleanup", () => {
  it("ended session 10dk sonra silinir", () => {
    const mgr = new GameSessionManager();
    mgr.createSession(baseInput);
    mgr.endSession("123456", "ended");
    const initial = mgr.cleanup();
    expect(initial.expired).toEqual([]);

    // 11 dakika sonrayı simüle et
    const future = Date.now() + 11 * 60 * 1000;
    const second = mgr.cleanup(future);
    expect(second.expired).toContain("123456");
    expect(mgr.getByPin("123456")).toBeNull();
  });
});
