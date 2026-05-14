# Bilbil — AI Agent Bağlam Dokümanı

> Bu dosyayı tüm AI agent'leri (Claude, Cursor, Cline, Copilot, Continue, Codex, Aider) okur.
> Spesifik Claude Code kuralları için: [CLAUDE.md](CLAUDE.md).
> Detaylı plan: [docs/PLAN.md](docs/PLAN.md). Tasarım sistemi: [docs/DESIGN_PROMPT.md](docs/DESIGN_PROMPT.md).

---

## Proje Özeti

**Bilbil** — Türkçe canlı multiplayer quiz uygulaması (Kahoot benzeri MVP).

Host email+password ile giriş yapar, 4-şıklı çoktan seçmeli quiz oluşturur, oyun başlatır → 6 haneli PIN üretilir → oyuncular nickname ile **anonim** katılır → soru-cevap döngüsü hız + doğrulukla skorlanır → ara leaderboard ve final podium ile biter.

**Kapsam:** "Minimum Kahoot Loop" — sadece 4-şıklı sorular, ≤50 eşzamanlı oyuncu/oturum, mobile-first responsive web, Türkçe UI, host-only quiz visibility (paylaşım yok), sadece live mode (async/homework yok).

**Hedef:** Üretime taşınacak gerçek bir ürün. Quality-first geliştirilecek (~5-6 hafta toplam). Solo geliştirici tarafından sürdürülecek.

---

## Mevcut Faz Durumu

| Faz | Durum | İçerik |
|---|---|---|
| Brainstorming + Plan | ✅ Tamam | docs/PLAN.md |
| Tasarım (28 ekran HTML mockup) | ✅ Tamam | mockups/ |
| **Faz 0: Setup** | ✅ TAMAMLANDI (commit `e6e533d`) | Tüm tooling kuruldu |
| **Faz 1: Auth + Quiz CRUD** | ✅ TAMAMLANDI (2026-05-05) | Auth.js v5 + 5 auth ekranı + dashboard + quiz CRUD + drag-drop form |
| **Faz 2: Live Game Skeleton** | ✅ TAMAMLANDI (2026-05-07) | PIN üretimi + Socket.IO lobby + host büyük ekran + player join akışı + reconnect |
| **Faz 3: Question Lifecycle** | ✅ TAMAMLANDI (2026-05-07) | Server-side timer + countdown + question/reveal/leaderboard/podium + scoring + DB persist + history |
| **Faz 4: Polish + Edge Cases** | ✅ **TAMAMLANDI** (2026-05-07, otonom mod) | P0 fix + Framer Motion + error states + rate limit + Sentry skeleton + /api/health + a11y |
| **Faz 4.5 (Bonus): AI ile Quiz Oluştur** | ✅ **TAMAMLANDI** (2026-05-12) | OpenAI gpt-4o-mini + chat modal + structured output + inline edit + 2-step approval + mock mode |
| **Faz 4.6 (Bonus): AI Asistan + Raporlama** | ✅ **TAMAMLANDI** (2026-05-14) | Implicit intent (quiz/rapor) + DB şeması embedded router prompt + 2 AI çağrısı orchestration (router → SQL → summarizer) + report_answer balonu + mock keyword routing |
| Faz 5: Deploy (Fly.io + Neon) | 🟡 Sıradaki | ~2-3 gün. **Faz 5'ten önce AI raporlama güvenlik katmanları zorunlu** (read-only role, SQL parser, allowlist) — bkz. [docs/superpowers/specs/2026-05-14-ai-asistan-rapor-design.md §7](docs/superpowers/specs/2026-05-14-ai-asistan-rapor-design.md). |

---

## Stack ve Kritik Versiyon Notları

| Katman | Tercih | ⚠ Dikkat |
|---|---|---|
| Framework | **Next.js 16** (App Router, src/, Turbopack) | Eğitim verisinde olmayabilir; breaking changes var. Şüpheli durumda `node_modules/next/dist/docs/` veya web docs kontrol edin. |
| Dil | TypeScript (strict) | — |
| Styling | **Tailwind CSS v4** + shadcn/ui | v3 değil — `tailwind.config.ts` YOK; CSS'te `@theme {}` directive ile token tanımı (`src/app/globals.css`) |
| Real-time | Socket.IO 4.x | rooms + reconnection + fallbacks |
| Backend | **Custom `server.ts`** (Next.js + Socket.IO entegre, tsx ile çalışır) | Vercel'e deploy EDİLEMEZ — persistent WebSocket istiyor. Hedef: Fly.io |
| Auth | Auth.js v5 (NextAuth) | Credentials + bcrypt + JWT (PrismaAdapter YOK — JWT ile gereksiz). E-posta doğrulanmamışsa login engellenir. |
| Database | PostgreSQL 16 (lokal docker, prod Neon) | Lokal port: **5435** (5432/5433 sıkça çakışıyor) |
| ORM | **Prisma 6** | v7 değil — v7'de `url = env(...)` schema'dan kaldırıldı, `prisma.config.ts`'a taşındı; biz v6 kullanıyoruz |
| Email | **Mock** (Faz 1) → Resend (Faz 5) | Faz 1'de `tmp/emails/` altına JSON yazan mock kullanılıyor; gerçek SMTP entegrasyonu Faz 5'te |
| Validation | Zod | Her sınırda |
| State (client) | Zustand + TanStack Query | Faz 1+'da kurulacak |
| State (live game) | **`GameSessionManager` class** (in-memory, process-local, `globalThis` singleton) | Game state DB'de değil; oyun bittiğinde DB'ye yazılır. Process restart = canlı oyun kayıp (kabul edilen MVP trade-off). Faz 5+'da Redis adapter'a taşınabilir. |
| Test (unit) | Vitest + happy-dom + Testing Library | `tests/unit/` |
| Test (e2e) | Playwright | `tests/e2e/` — multi-client live game senaryosu Faz 3'te kritik |
| CI/CD | GitHub Actions | `.github/workflows/ci.yml` (lint + format + typecheck + test + build) |
| AI (Faz 4.5/4.6) | **Vercel AI SDK** (`ai`) + `@ai-sdk/openai` + model `gpt-4o-mini` | `OPENAI_API_KEY` zorunlu; yoksa AI özelliği 503 döner. `AI_MOCK=1` ile fixture (e2e/CI). Faz 4.6: SQL raporlama `Prisma.$queryRawUnsafe` ile — **MVP: aynen çalıştırılıyor**, deploy öncesi read-only role + parser + tablo allowlist eklenecek (spec §7). |
| Deploy hedefi | Fly.io (app) + Neon (db) + Resend (email) + Sentry (errors) | Tümü free tier başlangıçta |

---

## Lokal Geliştirme

**Tek komut ile başlat (önerilen):**

```bash
./scripts/dev.sh start    # Docker + DB + migrate + dev server (~22s)
./scripts/dev.sh stop     # Tüm servisleri durdur (process'ler + docker)
./scripts/dev.sh status   # Hangi servis çalışıyor?
./scripts/dev.sh logs     # tail -f dev server log
./scripts/dev.sh restart  # Stop + start
./scripts/dev.sh clean    # Stop + DB volume sil (DİKKAT: destructive)
./scripts/dev.sh help     # Yardım
```

**Script ne yapar:** Docker daemon kontrolü → `.env` kontrolü (yoksa `.env.example`'dan kopyalar) → `node_modules` kontrolü (yoksa `npm install`) → Postgres container up → `pg_isready` bekle → `prisma generate` + `prisma migrate deploy` → port 3000 boş mu? → `npm run dev` background → HTTP 200 wait.

**Manuel akış (script kullanmadan):**

```bash
npm install
cp .env.example .env       # AUTH_SECRET üret: openssl rand -base64 32
npm run db:up              # Docker Postgres (port 5435)
npm run db:migrate         # Prisma migration
npm run dev                # Custom server (Next.js + Socket.IO) → http://localhost:3000
```

---

## NPM Komutları

| Komut | Ne yapar |
|---|---|
| `npm run dev` | `tsx server.ts` — Next.js + Socket.IO entegre |
| `npm run build` | Production build |
| `npm run start` | Production server (`NODE_ENV=production tsx server.ts`) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier auto-format |
| `npm run format:check` | Prettier check (CI) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit testler |
| `npm run test:watch` | Vitest watch |
| `npm run test:e2e` | Playwright e2e |
| `npm run db:up` | Docker Postgres başlat (port 5435) |
| `npm run db:down` | Docker Postgres durdur |
| `npm run db:migrate` | Prisma migration (dev — yeni migration oluşturabilir) |
| `npm run db:generate` | Prisma client generate |
| `npm run db:studio` | Prisma Studio (DB browser) |
| `npm run db:reset` | DB sıfırla (DİKKAT: destructive) |

---

## Repo Yapısı

```
bilbil/
├── prisma/
│   ├── schema.prisma             # 7 model: User, Quiz, Question, QuestionOption,
│   │                             #          GameSession, PlayerResult, PlayerAnswer
│   └── migrations/               # version-controlled migrations
├── server.ts                     # Custom Next.js + Socket.IO server (production entry point)
├── scripts/dev.sh                # Lokal lifecycle yöneticisi (start/stop/status/logs/clean)
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx              # / — Landing (mockup #1B Demo Centric)
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── forgot-password/
│   │   │   ├── reset-password/[token]/
│   │   │   └── verify-email/{[token]/, sent/}
│   │   ├── (host)/
│   │   │   ├── layout.tsx        # Auth gate + Navbar (mockup #14)
│   │   │   ├── dashboard/        # Mockup #8 (empty + filled)
│   │   │   ├── quizzes/{new/, [id]/{page.tsx, edit/}}
│   │   │   └── host/[pin]/       # Live host lobby (mockup #15)
│   │   ├── play/                 # Public — PIN entry + nickname (mockup #2, #21-22)
│   │   │   ├── page.tsx
│   │   │   └── [pin]/page.tsx
│   │   ├── api/auth/[...nextauth]/route.ts   # Auth.js handler
│   │   ├── api/health/route.ts               # ✅ Faz 4 — deploy health probe
│   │   ├── api/ai/chat/route.ts              # ✅ Faz 4.6 — AI Asistan chat (POST, 2-call orchestration: router → SQL → summarizer)
│   │   ├── globals.css           # Tailwind v4 @theme + brand tokens + .auth-card
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                   # shadcn/ui primitives (Button)
│   │   ├── auth/                 # AuthCard, LoginForm, RegisterForm, ForgotPasswordForm,
│   │   │                         # ResetPasswordForm, PasswordStrengthMeter, LogoBlock,
│   │   │                         # ResendVerificationButton, form-bits (FieldError, FormBanner)
│   │   ├── layout/               # HostNavbar (mockup #14)
│   │   ├── dashboard/            # EmptyDashboard, QuizCard, DashboardAIButton (Faz 4.5)
│   │   ├── quiz/                 # QuizForm, QuestionRow, DeleteQuizButton (drag-drop @dnd-kit)
│   │   │                         # Faz 4.5: AIQuizModal, AIChatBody, AIQuizProposalCard, AIConfirmDialog
│   │   ├── public/               # (Faz 4-5'te genişleyecek)
│   │   └── game/                 # Faz 2: HostLobby, PlayerNicknameForm, PlayerWaitingLobby
│   │                             # Faz 3: HostGameOrchestrator, PlayerGameOrchestrator,
│   │                             #        CountdownView, HostQuestionView, PlayerQuestionView,
│   │                             #        RevealView, LeaderboardView, PodiumView,
│   │                             #        TimerRing, AnswerShapeIcon
│   ├── lib/
│   │   ├── auth.ts               # Auth.js v5 (Credentials + JWT, EmailNotVerifiedError)
│   │   ├── auth/
│   │   │   ├── handlers.ts       # GET/POST re-export
│   │   │   └── tokens.ts         # generateToken, expiresAt, TTL constants
│   │   ├── db.ts                 # Prisma singleton (hot-reload safe)
│   │   ├── dal.ts                # getCurrentUser, requireUser (Data Access Layer)
│   │   ├── utils.ts              # shadcn cn() helper
│   │   ├── email/
│   │   │   ├── mock.ts           # Faz 1 mock email (tmp/emails/*.json)
│   │   │   └── templates.ts      # verificationEmail, passwordResetEmail
│   │   ├── validation/
│   │   │   ├── auth.ts           # registerSchema, loginSchema, passwordStrength, vb
│   │   │   └── quiz.ts           # quizFormSchema (4-şık + 1-doğru kuralı)
│   │   ├── actions/
│   │   │   ├── auth.ts           # register/login/forgot/reset/verify/logout server actions
│   │   │   ├── quiz.ts           # createQuiz/updateQuiz/deleteQuiz/listQuizzes/getQuiz
│   │   │   └── game.ts           # createGameSession/cancelGameSession (Faz 2)
│   │   ├── socket-events.ts      # Server↔Client tip sözleşmesi (Faz 2)
│   │   ├── socket-server.ts      # Server-side Socket.IO handlers (Faz 2)
│   │   ├── socket-client.ts      # Client wrapper (Faz 2)
│   │   ├── game/                 # Game logic
│   │   │   ├── pin-generator.ts  # ✅ Faz 2 (6-hane numerik, collision retry)
│   │   │   ├── validators.ts     # ✅ Faz 2 (nickname rules + suggestion)
│   │   │   ├── state-machine.ts  # ✅ Faz 2 (GameSessionManager class)
│   │   │   ├── scoring.ts        # ✅ Faz 3 — formül B (hız bonuslu, max 1000)
│   │   │   ├── leaderboard.ts    # ✅ Faz 3 — tie-break: ortalama yanıt süresi
│   │   │   └── answer-style.ts   # ✅ Faz 3 — pos→renk+şekil eşlemesi
│   │   └── ai/                   # ✅ Faz 4.5 — AI ile Quiz Oluştur, ✅ Faz 4.6 — Raporlama
│   │       ├── openai.ts             # Vercel AI SDK + OpenAI provider singleton + AI_MODEL
│   │       ├── system-prompt.ts      # ✅ Faz 4.6 — router prompt (quiz + sql modları)
│   │       ├── summarizer-prompt.ts  # ✅ Faz 4.6 — SQL sonucu doğal dile çevirici
│   │       ├── db-schema-prompt.ts   # ✅ Faz 4.6 — DB şeması + 5 few-shot SQL
│   │       ├── report-executor.ts    # ✅ Faz 4.6 — $queryRawUnsafe + 50 row cap + BigInt serialize
│   │       ├── quiz-schema.ts        # Zod union (ask|propose|refuse|report_answer) + routerOutputSchema (sql internal)
│   │       ├── mock-responses.ts     # AI_MOCK=1 ile fixture: quiz keyword + rapor keyword routing
│   │       └── types.ts              # AIChatMessage, AIChatResponse, API contracts
│   ├── hooks/                    # useGameSocket, useGameState (Faz 2)
│   ├── types/
│   │   └── next-auth.d.ts        # Auth.js Session/JWT type augmentation
│   └── middleware.ts             # Auth gate (mor → /login, login → /dashboard)
├── tests/
│   ├── setup.ts                  # Vitest setup
│   ├── unit/                     # Vitest unit tests
│   └── e2e/                      # Playwright (live-game.spec.ts kritik — Faz 3)
├── docs/
│   ├── PLAN.md                   # Detaylı MVP planı
│   └── DESIGN_PROMPT.md          # Tasarım sistemi spec
├── mockups/                      # 28 ekran üretim kalitesinde HTML/Tailwind mockup
│   ├── index.html                # Hub
│   ├── 01-design-system.html     # Renkler/tipografi/component referansı
│   ├── 02-player-question.html   # 3 varyant — Varyant B onaylandı
│   ├── 03-player-live-flow.html  # 7 state
│   ├── 04-host-live-flow.html    # 6 state (büyük ekran)
│   ├── 05-host-dashboard.html    # 7 ekran — Quiz Creation Varyant A onaylandı
│   ├── 06-auth.html              # 5 ekran
│   └── 07-public.html            # Landing 2 varyant — Varyant B (Demo Centric) onaylandı
├── docker-compose.yml            # Lokal Postgres (port 5435)
├── .github/workflows/ci.yml      # CI: lint + format + typecheck + test + build
├── .env.example                  # Tüm env vars şablonu
├── components.json               # shadcn config
├── eslint.config.mjs
├── next.config.ts
├── postcss.config.mjs            # Tailwind v4 PostCSS
├── playwright.config.ts
├── vitest.config.ts
├── tsconfig.json
└── package.json
```

---

## Tasarım Sistemi (özet)

- **Brand:** `#7C3AED` mor + `#F59E0B` amber accent (Tailwind v4 `@theme` tokens)
- **4 sabit cevap rengi** — kalıcı sıralama, renk + şekil ikili kodlama (renk körü a11y):
  - Şık 1: `#EF4444` kırmızı + ▲ üçgen
  - Şık 2: `#3B82F6` mavi + ◆ elmas
  - Şık 3: `#F59E0B` sarı + ● daire
  - Şık 4: `#10B981` yeşil + ■ kare
- **Tipografi:** Inter (UI) + Inter 800-900 (`.display` class)
- **Hibrit yaklaşım:** Player ekranları **light/clean**, Host Live ekranları **mor dark/dramatic**, Host Dashboard **clean panel**

**Kilitlenmiş tasarım kararları:**
- Player Question (state 23): **Varyant B** (timer ring, light tema, şekil + metin)
- Quiz Creation: **Varyant A** (long form, drag-drop, tek sayfa)
- Landing: **Varyant B** (Demo Centric — sol metin + sağ telefon mockup)

**Detaylar:** [docs/DESIGN_PROMPT.md](docs/DESIGN_PROMPT.md) + [mockups/01-design-system.html](mockups/01-design-system.html). Mockup'lar Tailwind class'larıyla yazılı, implementasyona ~%60-70 reuse edilebilir.

---

## Kritik Kurallar (DO / DON'T)

### DO
- ✅ Faz başında brief, sonunda commit. Faz milestone'u önemli.
- ✅ User-facing tüm metinler **Türkçe**. Kod yorumları Türkçe kabul.
- ✅ Type-safe end-to-end: Prisma schema → TS types → Zod → Components.
- ✅ Mockup'lardan Tailwind class'larını referans al — implementasyon süresini düşürür.
- ✅ 4 cevap rengi sırasını koru (kırmızı/mavi/sarı/yeşil — her ekranda aynı pozisyon).
- ✅ Server'dan `correctOptionId`'yi **soru açıkken gönderme** (DevTools cheat'i önle).
- ✅ Game state in-memory + bittiğinde DB persist.
- ✅ `./scripts/dev.sh` ile lokal lifecycle yönet.
- ✅ Türkçe karakter desteği (ş, ğ, İ, ı, ö, ü, ç) — fontlarda kontrol et.
- ✅ Mobile-first (≥44px tap hedefi, focus ring, WCAG AA kontrast).

### DON'T
- ❌ Vercel'e deploy etmeye çalışma — Socket.IO için Fly.io.
- ❌ Tailwind v3 syntax kullanma (`tailwind.config.ts` ile theme extend) — v4 `@theme {}` directive in CSS.
- ❌ Prisma 7'ye geçme — `url` schema'dan kaldırıldı, breaking change. v6'da kal.
- ❌ Live game state'i DB'de tutma (her tick'te update = DB ölür). Memory + final persist.
- ❌ Generic AI gradient hero / emoji bombardımanı / lorem ipsum. Türkçe gerçekçi placeholder ("Türkiye Coğrafyası", "Ayşe", "Mehmet").
- ❌ shadcn UI'nın semantik token'larına (`bg-accent`, `bg-primary`) çakışan brand override yapma — gerekirse ayrı isim alanı kullan.
- ❌ Player ekranında doğru cevap reveal etmeden cevap göster (suspense bozma + cheat).

---

## USER WRITES — Kullanıcı Kod Katkısı Noktaları

Aşağıdaki dosyalarda implementasyon **doğrudan agent tarafından yapılmaz**. Stub fonksiyon + test dosyası önceden hazırlanır, kullanıcı 5-10 satır kod yazar (business judgment kararları içerir):

| Dosya | Faz | ~satır | Karar tipi | Durum |
|---|---|---|---|---|
| `src/lib/game/pin-generator.ts` | 2 | ~15 | Çakışma önleme stratejisi | ✅ Faz 2 (otonom) |
| `src/lib/game/validators.ts` | 2 | ~20 | Nickname kuralları + duplication suggestion | ✅ Faz 2 (otonom) |
| `src/lib/game/scoring.ts` | 3 | ~10 | Hız bonuslu formül (B): `correct ? 500 + 500*(kalan/toplam) : 0` | ✅ Faz 3 (otonom) |
| `src/lib/game/leaderboard.ts` | 3 | ~10 | Tie-break: ortalama yanıt süresi (düşük=üstte) | ✅ Faz 3 (otonom) |

Her birinde stub + test önceden hazır olacak; agent kullanıcıya "bu fonksiyonu sen yaz" diye işaret eder, devamını implement etmez.

---

## Faz 4 — Bilinen Açık Noktalar (canlı test 2026-05-07)

Faz 3 sonrası Cloudflare tunnel ile canlı test yapıldığında ortaya çıkan UI audit bulguları. Detaylı task listesi: [docs/PLAN.md → Faz 4](docs/PLAN.md).

**P0 — KRİTİK (oyun oynanamaz):**
1. **`globals.css` 4 cevap rengi token isimleri** — `--color-answer-red/...` ile tanımlı; component'ler ve mockup'lar `bg-a-red/...` kullanıyor. Tailwind v4 mismatch → buton bg transparent → beyaz zeminde beyaz text → soru/cevap görünmüyor. Fix: token'ları `--color-a-red/blue/yellow/green` olarak rename.
2. **`confetti-piece` keyframes eksik** — PodiumView class'ı kullanıyor ama mockup'taki inline `<style>` globals.css'e taşınmamış.
3. **`NEXT_PUBLIC_APP_URL` Cloudflare URL'iyle uyumsuz** — mock email verify link'leri lokal kalıyor.

**P1-P5:** Framer Motion, error states (host gone, full session, network down), reconnect UX, rate limiting, Sentry, Lighthouse mobile ≥85, a11y, bundle optimization, test genişletme. PLAN.md'de Sub-4a..Sub-4h olarak detaylı.

---

## Test Stratejisi

| Test türü | Tool | Hedef coverage | Ne test edilir |
|---|---|---|---|
| Type check | `tsc --noEmit` | %100 | Tip hataları |
| Lint | ESLint | %100 | Format + bug-prone pattern |
| Unit | Vitest + happy-dom | %70+ (core logic) | scoring, validators, pin-gen, state-machine |
| Component | Vitest + RTL | %50+ | QuizForm, QuestionDisplay |
| E2E | Playwright | Kritik akışlar | auth flow, quiz CRUD, **multi-client live game** |

**En kritik test:** `tests/e2e/live-game.spec.ts` — 1 host + 3 player tarayıcı context'i parallel açılır, gerçek bir oyun simüle edilir, skor/leaderboard/podium doğrulanır. (Faz 3 sonunda)

### Test verisi izolasyonu (kritik)

**Lokal DB'de manuel veriler asla silinmez.** Test koşusu sadece `@bilbil.test` domain'li kayıtları temizler.

- **Konvansiyon:** Tüm e2e fixture e-postaları `@bilbil.test` ile bitmek **zorunda**. `tests/e2e/helpers.ts` içindeki `uniqueEmail()` bunu otomatik garanti ediyor.
- **Cleanup:** `tests/e2e/cleanup-test-data.ts` — Playwright `globalSetup` (suite başında) ve `globalTeardown` (suite sonunda) bu fonksiyonu çağırır.
- **Filtre:** `email LIKE '%@bilbil.test'` — sadece test domain'i. `@gmail.com`, `@example.com` vb. manuel veriler **dokunulmaz**.
- **Cascade:** GameSession + EmailVerificationToken + PasswordResetToken da test user ID'sine göre temizlenir; Quiz cascade User'a bağlı (Prisma schema). `tmp/emails/*.json` içinde de aynı domain filter uygulanır.
- **Yeni test fixture eklerken** mutlaka `@bilbil.test` domain'i kullan; başka domain seçersen cleanup atlar ve DB şişer.

---

## Faz Giriş / Çıkış Akışı (Onaylanmış İş Tarzı)

Her faz şu döngüyle ilerler. Agent bu adımları otonom uygular, kullanıcı her adımın çıktısını sonradan inceleyebilir.

### Faz Girişi (Brief)
1. Mevcut durumu özetle (önceki commit, hangi dosyalar değişti, hangi mockup ekranları açık).
2. Bu fazın kapsamı + sıralaması (alt parçalara böl, her biri commit-edilebilir olsun).
3. USER WRITES varsa kullanıcıyı önceden bilgilendir; fazın o noktasında stub/test bırakıp dur.
4. Açık olmayan kararlar varsa kullanıcıdan onay al; **otonom mod**'sa makul varsayım yap ve dökümante et.

### Faz Çalışması
- Mockup'lara birebir uy — (4-renk şıklar, brand mor + amber accent, mor logo cube vs hepsi mockup'tan kopyalanmış olmalı).
- TDD'yi validation/util/business logic için uygula. UI komponentleri için sadece e2e testle yetin.
- Tek dosya yarattıktan sonra `typecheck` çalıştırma alışkanlığı: hata büyümeden yakala.

### Faz Çıkışı (Closing)
1. **Lokal smoke test** zorunlu sıra:
   - `npm run db:up` (Postgres ayakta mı)
   - `npm run db:migrate` (varsa yeni migration uygulansın)
   - `npm run typecheck` → 0 errors
   - `npm run lint` → 0 errors
   - `npm test` → tüm unit testler geçsin
   - `npm run build` → production build geçsin
   - `npm run test:e2e` → tüm Playwright e2e geçsin
   - `./scripts/dev.sh start` → manual smoke (rota response, mock email pipeline, DB connectivity)
   - `./scripts/dev.sh stop` + DB temizle
2. **Dökümanları senkronize et** (PLAN.md, AGENTS.md, CLAUDE.md, README.md):
   - Mevcut faz `✅ TAMAMLANDI (tarih, commit hash)` → bir sonraki faz `🟡 Sıradaki`
   - Yeni dosyalar/dependencies repo yapısı bölümünde güncellensin
   - Faz boyunca alınan kararlar (mock email, Auth.js JWT-only, vb) "Stack ve Kritik Versiyon Notları"na yansısın
3. **Faz commit'i** descriptive mesajla:
   ```
   feat(faz-N): kısa başlık
   
   - Yapılan büyük şeyler (~5-8 madde)
   - Test sonuçları (X unit + Y e2e geçti)
   - Sonraki faz için açık not (varsa)
   ```
4. **Retro** — ne öğrendik, sonraki fazda ne dikkat (kullanıcı isteyince).

### Otonom Mod Kuralları
Kullanıcı "tüm fazı otonom yap" derse:
- Her açık karar için **mockup + PLAN.md** kaynak alınarak makul varsayım yap.
- Cevap bilinmezse **muhafazakar** karar al (örn. mock email > gerçek SMTP, JWT > database session).
- Karar gerekçesini ilgili dosyada veya AGENTS.md'de bir cümleyle dökümante et.
- Faz çıkışında tüm smoke test'leri çalıştırmadan ve dökümanları senkronize etmeden commit ATMA.

---

## Bağlantılı Dökümanlar

- 📋 [docs/PLAN.md](docs/PLAN.md) — Detaylı 6-fazlı MVP planı
- 🎨 [docs/DESIGN_PROMPT.md](docs/DESIGN_PROMPT.md) — Tasarım sistemi spec (28 ekran listesi, renk paleti, tipografi)
- 🖼️ [mockups/index.html](mockups/index.html) — Tasarım mockup'ları hub
- 🤖 [CLAUDE.md](CLAUDE.md) — Claude Code'a özel ek kurallar
- 📝 [README.md](README.md) — Public okuyucu için proje tanıtımı
