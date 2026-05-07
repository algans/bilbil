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
