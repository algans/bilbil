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

### Faz 1: Auth + Quiz CRUD (1 hafta) — 🟡 **SIRADAKİ**
- Email + password registration (bcrypt hash, email verification token)
- Login + session
- Email verification flow (Resend ile)
- Password reset flow
- Auth middleware (protected routes)
- Quiz oluşturma formu (drag-handle ile soru sıralama, dynamic question rows)
- Quiz list dashboard (kart grid)
- Quiz edit, delete, preview
- Validation: min 1 soru, exactly 1 doğru cevap per soru

**Kritik dosyalar:** `src/lib/auth.ts`, `src/app/(auth)/`, `src/app/(host)/quizzes/`,
`src/components/quiz/QuizForm.tsx`

**Test:** `tests/e2e/auth-flow.spec.ts`, `tests/e2e/quiz-crud.spec.ts`

**Çıktı:** Host kendi quiz'lerini oluşturabiliyor, listeleyebiliyor, düzenleyebiliyor.

### Faz 2: Live Game Skeleton (1 hafta)
- "Yeni oyun başlat" butonu → `host:create_session` event → PIN üretimi
- 🎯 **USER WRITES:** `src/lib/game/pin-generator.ts` (collision avoidance)
- 🎯 **USER WRITES:** `src/lib/game/validators.ts` (nickname rules)
- In-memory GameSession Manager (`src/lib/game/state-machine.ts`)
- Socket.IO room kurulumu (1 room per PIN)
- Host büyük ekran lobby UI: PIN gösterimi + oyuncu listesi
- Player join: `/play` PIN giriş → `/play/[pin]` nickname → lobby
- `playerToken` ile reconnect mekanizması
- Host disconnect detection (2 dk timeout)

**Kritik dosyalar:** `server.ts`, `src/lib/socket-server.ts`,
`src/app/(public)/play/`, `src/app/(host)/host/[sessionId]/page.tsx`,
`src/hooks/useGameSocket.ts`

**Test:** Multi-client lobby join (Playwright 2 context: host + player)

**Çıktı:** Host oyun başlatıyor, oyuncular PIN ile katılıyor, lobby güncel.

### Faz 3: Question Lifecycle (1 hafta)
- Question open with server-side timer
- Player answer submission + ack
- 🎯 **USER WRITES:** `src/lib/game/scoring.ts` (formül seçimi: A/B/C)
- 🎯 **USER WRITES:** `src/lib/game/leaderboard.ts` (tie-break)
- Question reveal: correct option highlight + per-option count bar grafiği
- Leaderboard between questions (top 10, score delta)
- Game end + persist to DB:
  - `GameSession.status = "ended"`, `endedAt` set
  - `PlayerResult` rows for all players
  - `PlayerAnswer` rows for all answers
- Final podium UI (top 3 animation)
- Game history page (host'un geçmiş oyunları)

**Kritik dosyalar:** `src/lib/game/scoring.ts`, `src/lib/game/state-machine.ts`,
`src/components/game/QuestionDisplay.tsx`, `src/components/game/Leaderboard.tsx`,
`src/components/game/Podium.tsx`

**Test:** Full live game e2e (1 host + 3 player), scoring unit tests

**Çıktı:** Tam çalışan minimum Kahoot loop, end-to-end.

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

## İş Tarzı

Her faz şu döngüyle ilerler:

1. **Brief:** Ben (Claude) faz başında neyi yapacağımızı özetlerim
2. **Implementation:** Önce iskelet kod, sonra detay; siz review edersiniz
3. **User contribution:** İşaretli yerlerde (scoring, validators vs) siz 5-10 satır yazarsınız
4. **Test:** Birlikte test çalıştırırız, hatalar varsa düzeltiriz
5. **Commit:** Faz tamamlandığında descriptive commit message ile commit
6. **Review:** Faz sonu kısa retrospective: ne öğrendik, sonraki fazda ne dikkat?

---

## Açık Bırakılan / Sonradan Cevaplanacak

- Domain seçimi (geliştirme sırasında karar verilebilir)
- Logo ve görsel kimlik (placeholder ile başlanır, faz 4'te tasarlanır)
- Custom email template tasarımı (faz 1'de basic, faz 4'te polish)
- Quiz şablonları / örnek quizler (geliştirme sırasında veri olarak eklenir)
- Faz 5+ roadmap (post-MVP genişletme — analytics, soru çeşitleri, paylaşım)
