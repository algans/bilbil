# Bilbil — Kahoot Tarzı Live Multiplayer Quiz Uygulaması (MVP)

## Context

Sıfırdan üretilen bir gerçek-zamanlı quiz platformu. Kahoot'un çekirdek deneyimini kopyalar:
host bir quiz hazırlar, oyun başlatır → 6 haneli PIN üretilir → oyuncular nickname ile
anonim katılır → soru-cevap döngüsü hız ve doğrulukla skorlanır → ara leaderboard ve
final podium ile biter.

**Hedef:** Üretime taşınacak gerçek bir ürün. Quality-first geliştirilecek (~5-6 hafta).
Tek geliştirici (kullanıcı) tarafından sürdürülecek; tech bilgisi başlangıç-orta seviye,
bu yüzden mainstream + iyi dokümantasyonlu + AI desteği yoğun bir stack tercih edildi.

**Kapsam:** "Minimum Kahoot Loop" — sadece 4-şıklı çoktan seçmeli sorular, ≤50 eşzamanlı
oyuncu, mobile-first responsive web, host email+password auth, Türkçe UI, host-only quiz
visibility (paylaşım yok), live mode (async/homework yok).

---

## Onaylanan Kararlar (Brainstorming Özeti)

| Konu | Karar |
|---|---|
| Birincil amaç | Gerçek kullanıcılara açılacak ürün |
| Özellik kapsamı | Minimum Kahoot Loop |
| Eşzamanlı oyuncu hedefi | ≤ 50 / oturum |
| Birincil cihaz | Mobile-first responsive web |
| Host auth | Email + password (klasik) |
| Dil | Yalnızca Türkçe (i18n yok) |
| Quiz görünürlük | Host'a özel (paylaşım yok) |
| Tech stack | Yaklaşım 1: Modern TypeScript Monolith |
| Timeline | Acelesi yok, kalite önce (~5-6 hafta) |
| İş tarzı | Faz faz birlikte (review-driven, faz başına commit) |
| Proje adı | **Bilbil** |

---

## Teknoloji Stack

| Katman | Tercih |
|---|---|
| Frontend framework | Next.js 16 (App Router, src/, Turbopack) + React 19 |
| Dil | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Animasyon | Framer Motion |
| Form | React Hook Form + Zod |
| Real-time | Socket.IO 4.x (rooms, fallbacks, reconnection) |
| Backend | Custom Node.js server (server.ts) — Next.js + Socket.IO entegre |
| Auth | Auth.js v5 (NextAuth) — Credentials provider + bcrypt |
| Database | PostgreSQL (lokal docker, prod Neon) |
| ORM | Prisma 6 |
| Email | Resend (verification + password reset) |
| Validation | Zod (her sınırda) |
| State (client) | Zustand + TanStack Query |
| State (live game) | In-memory Map (process-local; ölçek için Redis path açık) |
| Test (unit) | Vitest + @testing-library |
| Test (e2e) | Playwright (multi-client senaryolar) |
| Errors | Sentry |
| CI/CD | GitHub Actions |
| Deploy | Fly.io (app) + Neon (db) |
| MVP maliyeti | $0/ay (tüm bileşenler free tier) |

---

## Yüksek-Seviye Mimari

```
[Host Browser]            [Player Browser]
      │ Socket.IO + HTTP        │
      └────────┬────────────────┘
               ▼
   ┌──────────────────────────────────────────┐
   │ Single Node.js Process (Fly.io)          │
   │  • server.ts (Next.js + Socket.IO)       │
   │  • API routes / Server Actions           │
   │  • Auth.js middleware                    │
   │  • Socket.IO rooms (1 per game PIN)      │
   │  • In-memory GameSession Manager (Map)   │
   └────────────────────┬─────────────────────┘
                        │ Prisma
                        ▼
   ┌──────────────────────────────────────────┐
   │ PostgreSQL (Neon)                        │
   │  Users, Quizzes, Questions, Options,     │
   │  GameSessions, PlayerResults,            │
   │  PlayerAnswers (analytics)               │
   └──────────────────────────────────────────┘
```

**Kritik karar:** Live game state in-memory tutuluyor; oyun bitiminde DB'ye yazıyor.
Process restart'ta devam eden oyunlar kaybolur (kabul edilebilir trade-off, MVP scope).

---

## Veri Modeli (Prisma Schema)

`prisma/schema.prisma` — özet:

- **User** — host hesabı (email, passwordHash, emailVerifiedAt, displayName)
- **Quiz** — title, description, isPublished, hostId
- **Question** — quizId, prompt, order, timeLimitSec (default 20)
- **QuestionOption** — questionId, text, isCorrect (exactly 1 per question), position 0-3
- **GameSession** — pin (6 hane unique), quizId, hostId, status, startedAt, endedAt
- **PlayerResult** — sessionId, nickname, finalScore, finalRank
- **PlayerAnswer** — sessionId, questionId, nickname, optionId, answeredAtMs, pointsAwarded, isCorrect

İndeksler: `Quiz.hostId`, `Question.quizId`, `GameSession.pin`, `PlayerAnswer.(sessionId, nickname)`,
`PlayerAnswer.(sessionId, questionId)`.

---

## Game State Machine

```
CREATED → LOBBY → QUESTION_OPEN → QUESTION_REVEAL → LEADERBOARD
                       ↑                                  │
                       └────── (more questions) ──────────┘
                                                          │
                                                          ▼
                                                    GAME_ENDED
```

**Kurallar (varsayılan):**
- PIN: 6 hane numerik, çakışma kontrolü (in-memory + DB)
- Default soru süresi: 20 sn (her soruda override edilebilir)
- Reveal süresi: 5 sn (host manuel ileri alabilir)
- Geç katılım: sadece LOBBY'de
- Aynı nickname: engellenir, "Ali_2" önerilir
- Player reconnect: izinli (sessionStorage'da playerToken)
- Host disconnect: 2 dk timeout → ABANDONED, kısmi sonuçlar yazılır
- Min oyuncu: 1, min soru: 1

---

## Socket.IO Event Sözleşmesi

**Server → Client:**
- `lobby:state`, `lobby:player_joined`, `lobby:player_left`
- `game:question_opened` (correctOptionId GÖNDERİLMEZ)
- `game:answer_progress` (host'a)
- `game:question_closed` (correctOptionId, perOptionCount, myAnswer)
- `game:leaderboard`
- `game:final_results`
- `error`

**Client → Server:**
- Player: `player:join`, `player:submit_answer`, `player:reconnect`
- Host: `host:create_session`, `host:start_game`, `host:next_question`, `host:end_game`, `host:reconnect`

**Kritik detaylar:**
- `startedAtMs` server-side timestamp (client clock skew için)
- Soru açıkken `correctOptionId` asla yayınlanmaz (DevTools cheat'i önlenir)
- Reconnect flow `playerToken` üzerinden (sessionStorage'da saklanır)

---

## UI Sayfa Yapısı (Next.js App Router)

```
app/
├── (public)/
│   ├── page.tsx                       /  (landing)
│   └── play/
│       ├── page.tsx                   /play  (PIN giriş)
│       └── [pin]/page.tsx             /play/[pin]  (oyuncu — single-page, state-driven)
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   ├── reset-password/[token]/page.tsx
│   └── verify-email/[token]/page.tsx
├── (host)/                            (auth guard, navbar layout)
│   ├── dashboard/page.tsx             /dashboard  (quiz grid)
│   ├── quizzes/
│   │   ├── new/page.tsx               /quizzes/new
│   │   └── [id]/
│   │       ├── page.tsx               /quizzes/[id]  (preview + start session)
│   │       └── edit/page.tsx          /quizzes/[id]/edit
│   ├── host/[sessionId]/page.tsx      /host/[sessionId]  (host büyük ekran)
│   └── history/
│       ├── page.tsx                   /history
│       └── [sessionId]/page.tsx       /history/[sessionId]  (oyun analytics)
├── api/
│   ├── auth/[...nextauth]/route.ts
│   └── quizzes/[id?]/route.ts
└── layout.tsx
```

---

## Klasör Yapısı

```
bilbil/
├── prisma/schema.prisma + migrations/
├── server.ts                          ← custom Next.js + Socket.IO server
├── src/
│   ├── app/                           ← yukarıdaki sayfa yapısı
│   ├── components/
│   │   ├── ui/                        ← shadcn primitives
│   │   ├── quiz/                      ← QuizForm, QuestionEditor, OptionInput
│   │   ├── game/                      ← QuestionDisplay, AnswerButton, Leaderboard, Podium
│   │   └── layout/                    ← Navbar, AuthGuard
│   ├── lib/
│   │   ├── auth.ts                    ← Auth.js config
│   │   ├── db.ts                      ← Prisma singleton
│   │   ├── socket-server.ts           ← server-side handlers
│   │   ├── socket-client.ts           ← client wrapper
│   │   └── game/
│   │       ├── scoring.ts             ← 🎯 USER WRITES
│   │       ├── state-machine.ts       ← in-memory GameSession Manager
│   │       ├── pin-generator.ts       ← 🎯 USER WRITES
│   │       ├── validators.ts          ← 🎯 USER WRITES (nickname, quiz)
│   │       └── leaderboard.ts         ← 🎯 USER WRITES (tie-break)
│   ├── hooks/                         ← useGameSocket, useGameState
│   ├── types/                         ← paylaşılan TS tipleri
│   └── middleware.ts                  ← auth gate
├── tests/
│   ├── unit/                          ← Vitest
│   └── e2e/                           ← Playwright (live-game.spec.ts kritik)
├── docker-compose.yml                 ← lokal Postgres
├── .env.example
├── .github/workflows/ci.yml
├── fly.toml
└── package.json
```

---

## Implementation Phases

Her faz **bağımsız çalışan** bir milestone. Faz sonunda commit + review.

### Faz 0: Setup (1-2 gün) — ✅ **TAMAMLANDI** (commit `e6e533d`)
- ✅ `npx create-next-app@latest` + TypeScript + Tailwind + ESLint + App Router + src/
- ✅ shadcn/ui init + Button komponenti (diğerleri ihtiyaç oldukça)
- ✅ Prisma 6 + lokal Postgres docker-compose (port 5435 — 5433 başka container'da)
- ✅ Initial migration uygulandı (7 model)
- ✅ Auth.js v5 skeleton (Credentials provider — Faz 1'de doldurulacak)
- ✅ `server.ts` custom Next.js + Socket.IO ping/pong (test edildi)
- ✅ Vitest config + smoke test (2/2 pass)
- ✅ Playwright config + e2e smoke test
- ✅ ESLint + Prettier + Husky pre-commit + lint-staged
- ✅ GitHub Actions: lint + format:check + typecheck + test + build
- ✅ Tailwind v4 @theme tokens (brand mor + amber + 4 cevap rengi)
- ✅ README + .env.example
- ✅ **Bonus:** `scripts/dev.sh` lokal lifecycle yöneticisi (start/stop/status/logs/clean)

**Smoke test sonucu:**
- `./scripts/dev.sh start` → ~22s'de http://localhost:3000 hazır
- HTTP 200 (47ms) + Socket.IO listening
- `npm run typecheck` → 0 errors
- `npm test` → 2/2 pass
- `npm run lint` → 0 errors, 1 minor warning (auth.ts unused param — Faz 1'de doldurulacak)

### Faz 1: Auth + Quiz CRUD (1 hafta) — ✅ **TAMAMLANDI** (2026-05-05)

**Onaylanan kararlar:**
- Auth: Auth.js v5 + Credentials + JWT (PrismaAdapter kullanılmadı; database session yerine JWT token).
- Email: Faz 1'de mock (`tmp/emails/` altına JSON yazar + console'a basar). Resend entegrasyonu Faz 5'te.
- Form: React Hook Form değil, native `<form>` + Server Actions + `useActionState` tercih edildi (Next.js 16 idiomatic, daha hafif).
- Drag-drop: `@dnd-kit/core` + `@dnd-kit/sortable` (klavye + dokunmatik destekli, kendi kendine yetiyor).
- Quiz Creation: Mockup'taki Varyant A (long form) implemente edildi.
- Şifre kuralları: 8+ karakter, 1+ harf, 1+ rakam. Strength meter (4 segmentli bar, mockup #4 birebir) — uzunluk + karakter çeşitliliğine bakar.
- Validation: Min 1 soru, tam 4 şık per soru, tam 1 doğru cevap; tüm quiz alanları Zod ile sınırda doğrulanıyor.

**Eklenen modeller (Prisma migration `20260505172653_add_verification_and_reset_tokens`):**
- `EmailVerificationToken` — 24 saat TTL, kullanıcı kayıt olunca üretilir, doğrulama sonrası tüm kullanıcı token'ları silinir.
- `PasswordResetToken` — 1 saat TTL, `consumedAt` ile tek kullanım.
- `QuestionOption` üzerine `@@unique([questionId, position])` constraint eklendi.

**Yapılan ekranlar (mockup birebir):**
- Landing `/` (mockup #1B Demo Centric — sol metin + sağ telefon mockup'ı + 4 cevap rengi).
- `/login`, `/register`, `/forgot-password`, `/reset-password/[token]`, `/verify-email/[token]`, `/verify-email/sent` (mockup #6 birebir, 7a/7b dahil).
- Host navbar (mockup #14), `/dashboard` empty + filled state (mockup #8a/#8b), QuizCard.
- `/quizzes/new` (mockup #9 Varyant A — drag-drop, 4 sabit cevap rengi), `/quizzes/[id]` preview (mockup #10), `/quizzes/[id]/edit` (mockup #11 + danger zone delete).

**Test sonucu:**
- Vitest unit: 4 dosya, 34/34 pass (validation + tokens).
- Playwright e2e: 3 dosya, 9/9 pass (auth flow + quiz CRUD + landing smoke).
- `npm run typecheck` 0 errors, `npm run lint` 0 errors, `npm run build` başarılı.

**Açık not:** Next.js 16 deprecation warning: `middleware.ts` → `proxy.ts` rename önerisi. Auth.js v5'in `proxy.ts` desteği henüz net değil; Faz 5 polish'inde adreslenecek.

**"Oyun Başlat" butonu disabled** (mockup'ta belirgin "Faz 2'de açılacak" tooltip'i var) — Faz 2'de aktif olacak.

### Faz 2: Live Game Skeleton (1 hafta) — ✅ **TAMAMLANDI** (2026-05-07, otonom mod)

**Onaylanan kararlar (Faz 2 girişinde):**
- Kapsam: Sadece lobby (mockup #15) Faz 2'de; soru ekranları (#16-20) Faz 3'te.
- PIN: 6-hane numerik. Çakışma kabul edilmez — retry on collision (10 deneme limit).
- Reconnect: Faz 2'de tam (sessionStorage'da `playerToken`).
- Player limit: hard cap 50, fazlası reddedilir.
- Lobby idle timeout: 30 dk → abandoned.
- Host disconnect grace: 2 dk → abandoned.
- USER WRITES: agent yazdı (otonom mod), kullanıcı sonradan inceleyebilir.

**Yapılan ekranlar (mockup birebir):**
- `/host/[pin]` — Host Lobby büyük ekran (mockup #15: mor gradient, devasa PIN, oyuncu pill listesi, bağlantı durumu)
- `/play` — Mobile-first PIN entry (mockup #2)
- `/play/[pin]` — Nickname (mockup #21) + Lobby Waiting state (mockup #22, pulsing dot + diğer oyuncular)
- Quiz preview "Oyun Başlat" butonu artık aktif → server action → PIN üretimi → `/host/[pin]`

**Game logic dosyaları (USER WRITES'ları otonom yazıldı):**
- `src/lib/game/pin-generator.ts` — `generateUniquePin(isPinTaken, maxAttempts)` callback ile DB+in-memory uniqueness garantisi
- `src/lib/game/validators.ts` — `validateNickname` (2-20 char, Türkçe, küfür filtresi: "eşek", "yaramaz") + `suggestUniqueNickname` (`Ayşe → Ayşe_2`)
- `src/lib/game/state-machine.ts` — `GameSessionManager` class (sessions/players/socket index'leri, host disconnect grace + lobby idle cleanup)

**Socket.IO altyapısı:**
- `socket-events.ts` — Server↔Client tip sözleşmesi (typed Socket<T>)
- `socket-server.ts` — `host:join_session`, `player:join`, `player:reconnect` handler'ları + `lobby:state`/`lobby:player_joined`/`session:abandoned`/`host:gone` broadcast'ları
- `socket-client.ts` — Singleton wrapper, autoConnect + reconnection
- `server.ts` — Faz 0 ping/pong yerine `attachSocketHandlers(io)` çağrısı

**Test sonucu:**
- Vitest unit: 7 dosya, 76/76 pass (auth-validation + quiz-validation + tokens + pin-generator + validators + state-machine + smoke).
- Playwright e2e: 4 dosya, 13/13 pass (auth-flow + quiz-crud + lobby-flow + landing smoke).
- Lobby e2e senaryoları: host quiz başlatır + 2 player katılır + nickname duplication ("Zeynep" → "Zeynep_2") + küfür filter + geçersiz PIN.
- typecheck/lint 0 errors, build başarılı.

**Açık not (Faz 3'e taşınan):** "Oyunu Başlat →" butonu lobby'de hâlâ disabled (Faz 3 question lifecycle açar). Cancel/abandon flow'u şu an tarayıcı kapatmaya bağlı; explicit "İptal" butonu da `/dashboard`'a link olarak var ama backend'de session abandoned'a çekilmiyor — Faz 3 polish'inde adreslenir.

**Yeni dependency:** `socket.io-client` (zaten Faz 0'da `socket.io` server tarafı vardı).

### Faz 3: Question Lifecycle (1 hafta) — ✅ **TAMAMLANDI** (2026-05-07, otonom mod)

**Onaylanan kararlar (Faz 3 girişinde):**
- Mod: Otonom — kullanıcı USER WRITES'ları da agent yazsın diye karar verdi.
- Scoring: **Formül B** — `correct ? 500 + 500*(kalan/toplam) : 0`. Yanlış/timeout/geç = 0. Max 1000/soru.
- Tie-break: **Ortalama yanıt süresi** (düşük=üstte). Cevapsız soruda yanıt süresi = soru toplam süresi.
- Question pacing: Host "Sonraki Soru" → 4sn countdown (3-2-1) → soru açılır.
- Reveal flow: kapanış → otomatik reveal → host "Leaderboard'a Geç →" → leaderboard → host "Sonraki Soru →".
- Cevap lock-in: player şıka basınca kilitlenir, değiştirilemez.
- Erken kapanış: tüm oyuncular cevap verirse timer beklemeden kapanır.
- DB persist: ended olunca tek transaction (`GameSession`+`PlayerResult[]`+`PlayerAnswer[]`).
- Ended session in-memory TTL: 10dk (host/player podium ekranını görsün).
- Game history: Faz 3'te liste + leaderboard reveal; soru-soru analytics Faz 4.

**Game logic dosyaları (otonom yazıldı):**
- `src/lib/game/scoring.ts` — `calculateScore({isCorrect, answeredAtMs, totalTimeMs})`. 7/7 unit test.
- `src/lib/game/leaderboard.ts` — `rankPlayers(entries)` + `topN(entries, n=10)`. 7/7 unit test.
- `src/lib/game/answer-style.ts` — pos→renk+şekil eşlemesi (kırmızı üçgen / mavi elmas / sarı daire / yeşil kare).
- `src/lib/game/state-machine.ts` — `GameSessionManager`'a question/answer/score state + `startGame`, `openCurrentQuestion`, `recordAnswer`, `closeCurrentQuestion`, `advanceFromReveal`, `advanceToNextQuestion`, `collectFinalRecords` + DTO methodları.

**Socket.IO event'leri (yeni):**
- Server→Client: `game:countdown`, `game:question_opened`, `game:answer_progress`, `game:reveal`, `game:leaderboard`, `game:final_results`.
- Client→Server: `host:start_game`, `host:show_leaderboard`, `host:next_question`, `player:submit_answer` (ack ile).
- `correctOptionId` soru açıkken **asla gönderilmez** (DevTools cheat'i önle).
- Reveal/podium emit per-socket (her player kendi `myAnswer`/`myRank`'ıyla, host'a `null`).

**Server-side timer'lar (`socket-server.ts`):**
- `pendingTimers: Map<pin, NodeJS.Timeout>` — countdown ve question için clearable.
- Erken kapanış: `allPlayersAnswered` → clearTimeout + `autoCloseQuestion`.
- Reconnect snapshot: `emitSnapshotToSocket` → host/player phase'ine göre uygun event.

**UI bileşenleri (mockup birebir):**
- `CountdownView` — 3-2-1 host (mor/dramatic) + player (light) varyantları.
- `HostQuestionView` (mockup #16) — büyük ekran mor gradient, timer ring sağda, soru ortada, 4 şık alt grid.
- `PlayerQuestionView` (mockup #19 Varyant B) — mobile-first light, timer ring + skor üstte, 4 buton renk+şekil, lock-in.
- `RevealView` — host (mockup #17, bar grafiği + correct ring) + player (mockup #20, doğru/yanlış banner).
- `LeaderboardView` — host (mockup #18, top 10, podium gradient) + player (kompakt liste, kendi sırası vurgulu).
- `PodiumView` — host (mockup #19, 1-2-3 yer + konfeti) + player (kendi rank dramatic).
- `TimerRing` — paylaşılan SVG ring component'i.
- `HostGameOrchestrator` + `PlayerGameOrchestrator` — phase router'lar (lobby/countdown/question/reveal/leaderboard/podium).

**Yeni route'lar:**
- `/history` — host'un kendi geçmiş oyunları (mockup #12), DB'den ended/abandoned listele.
- `/history/[sessionId]` — final leaderboard reveal (Faz 4'te soru analytics genişler).

**Test sonucu:**
- Vitest unit: 9 dosya, **106/106** pass (yeni: scoring 7 + leaderboard 7 + state-machine extend 16).
- Playwright e2e: 5 dosya, **14/14** pass (yeni: `live-game.spec.ts` — 1 host + 2 player full game flow + history persist).
- typecheck/lint 0 errors, build başarılı.

**Açık not (Faz 4'e taşınan):** Soru-soru analytics UI (cevap dağılımı, en zorlu soru), Framer Motion animasyonları, host disconnect/reconnect mid-game UX, error states (network down, full session, vb), Lighthouse mobile > 85.

### Faz 4: Polish + Edge Cases (1 hafta)
- Framer Motion animasyonları (soru geçişi slide, podium reveal, leaderboard pop)
- Host büyük ekran modu (TV/projeksiyon için font scale, contrast)
- Error states: network down banner, host gone, session expired, full session (50 cap)
- Rate limiting (auth endpoints, create-session)
- Lighthouse mobile > 85
- Accessibility pass (keyboard nav, aria labels)
- Sentry entegrasyonu
- Tüm e2e testlerin yeşil olması

**Çıktı:** Production-ready görünümde, kararlı uygulama.

### Faz 5: Deploy (2-3 gün)
- Fly.io app config (`fly.toml`, secrets, region: fra/sin)
- Neon Postgres production database + connection string
- Resend production API key + domain DNS
- Sentry production project
- GitHub Actions deploy workflow (push to main → Fly.io)
- Health check endpoint (`/api/health`)
- Custom domain (opsiyonel: bilbil.app, bilbil.com.tr — kontrol)

**Çıktı:** `https://bilbil.app` (veya seçilen domain) live, gerçek kullanıcı testi yapılabilir.

---

## Sizin Yazacağınız Anlamlı Kod Noktaları (Learning Mode)

Her biri için: stub fonksiyon önceden hazır + test dosyası yazılı + 2-3 yaklaşım yorumla.

| Dosya | Faz | Yaklaşık satır | Karar tipi |
|---|---|---|---|
| `src/lib/game/scoring.ts` | 3 | ~10 | Doğruluk + hız puanlama formülü (A/B/C) |
| `src/lib/game/pin-generator.ts` | 2 | ~15 | Çakışma önleme (DB lookup vs in-memory cache) |
| `src/lib/game/validators.ts` | 2 | ~20 | Nickname kuralları + quiz validity |
| `src/lib/game/leaderboard.ts` | 3 | ~10 | Eşit skorda tie-break |

---

## Test Stratejisi

| Test türü | Tool | Hedef coverage | Ne test edilir |
|---|---|---|---|
| Type check | tsc --noEmit | %100 | Tip hataları |
| Lint | ESLint | %100 | Format + bug-prone pattern |
| Unit | Vitest | %70+ (core logic) | scoring, validators, pin-gen, state-machine |
| Component | Vitest + RTL | %50+ | Form ve UI komponenetleri |
| E2E | Playwright | Kritik akışlar | auth, quiz CRUD, **multi-client live game** |

**En kritik test:** `tests/e2e/live-game.spec.ts` — 1 host + 3 player tarayıcı context'i
parallel açılır, gerçek bir oyun simüle edilir, skor/leaderboard/podium doğrulanır.

---

## Verification (MVP'nin Çalıştığını Doğrulama)

Her faz sonunda yapılacak adımlar:

1. **Lokal smoke test (manuel):**
   - `npm run dev` → 3000'de host browser, başka pencerede 2-3 player browser aç
   - Senaryo: Quiz oluştur → oyun başlat → PIN'i 2 player'a gir, nickname → lobby'de hepsini gör → soruları ilerlet → her soruda farklı oyuncu cevap versin → leaderboard değişimini takip et → final podium → DB'de PlayerResult kayıtlarını kontrol et

2. **Otomatik testler:**
   - `npm run typecheck` ✓
   - `npm run lint` ✓
   - `npm test` (Vitest unit) ✓
   - `npm run test:e2e` (Playwright multi-client) ✓

3. **Faz 5 sonrası prod doğrulama:**
   - Production URL'de aynı manuel senaryoyu mobil + desktop tarayıcılardan paralel oyna
   - Sentry'de error rate < %1
   - Lighthouse mobile > 85
   - Resend dashboard'unda email delivery > %95

---

## İş Tarzı (Faz Giriş / Çıkış Akışı)

Bu akış AGENTS.md'de detaylı tarif edildi. Özet:

### Faz Girişi
1. **Brief** — agent mevcut durumu özetler, fazın kapsamını ve alt parçalara bölünmesini sunar.
2. **Onay** — kullanıcı kapsamı onaylar veya değiştirir. Otonom mod açıksa agent makul varsayımlarla devam eder.
3. **USER WRITES blokları** — fazın o noktasında stub + test bırakıp kullanıcının yazmasını bekler.

### Faz Çalışması
- Mockup birebir uyum (mockups/ klasörü kaynaktır).
- TDD: validation/util/business logic için. UI komponentleri için sadece e2e test yeterli.
- Tek dosya yarattıktan sonra `typecheck` → erken hata yakalama.

### Faz Çıkışı (zorunlu)
1. **Lokal smoke test** sırası:
   - `npm run db:up` + `npm run db:migrate`
   - `npm run typecheck` (0 errors)
   - `npm run lint` (0 errors)
   - `npm test` (tüm unit pass)
   - `npm run build` (başarılı)
   - `npm run test:e2e` (tüm Playwright pass)
   - `./scripts/dev.sh start` + manuel rota smoke + `./scripts/dev.sh stop`
2. **Dökümanlar senkronize**: PLAN.md, AGENTS.md, CLAUDE.md, README.md gerçek state'e güncellenir; faz `✅ TAMAMLANDI`'ya çevrilir, sonraki faz `🟡 Sıradaki`'ye geçer.
3. **Descriptive commit** — `feat(faz-N): kısa başlık` formatında, ne yapıldı + test sonuçları + sonraki faz için açık not.
4. **Retro** — kullanıcı isterse "ne öğrendik / sonraki fazda ne dikkat".

---

## Açık Bırakılan / Sonradan Cevaplanacak

- Domain seçimi (geliştirme sırasında karar verilebilir)
- Logo ve görsel kimlik (placeholder ile başlanır, faz 4'te tasarlanır)
- Custom email template tasarımı (faz 1'de basic, faz 4'te polish)
- Quiz şablonları / örnek quizler (geliştirme sırasında veri olarak eklenir)
- Faz 5+ roadmap (post-MVP genişletme — analytics, soru çeşitleri, paylaşım)
