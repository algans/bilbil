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
| **Faz 0: Setup** | ✅ **TAMAMLANDI** (commit `e6e533d`) | Tüm tooling kuruldu |
| **Faz 1: Auth + Quiz CRUD** | 🟡 Sıradaki | ~1 hafta |
| Faz 2: Live Game Skeleton | ⏳ Bekliyor | ~1 hafta |
| Faz 3: Question Lifecycle | ⏳ Bekliyor | ~1 hafta |
| Faz 4: Polish + Edge Cases | ⏳ Bekliyor | ~1 hafta |
| Faz 5: Deploy (Fly.io + Neon) | ⏳ Bekliyor | ~2-3 gün |

---

## Stack ve Kritik Versiyon Notları

| Katman | Tercih | ⚠ Dikkat |
|---|---|---|
| Framework | **Next.js 16** (App Router, src/, Turbopack) | Eğitim verisinde olmayabilir; breaking changes var. Şüpheli durumda `node_modules/next/dist/docs/` veya web docs kontrol edin. |
| Dil | TypeScript (strict) | — |
| Styling | **Tailwind CSS v4** + shadcn/ui | v3 değil — `tailwind.config.ts` YOK; CSS'te `@theme {}` directive ile token tanımı (`src/app/globals.css`) |
| Real-time | Socket.IO 4.x | rooms + reconnection + fallbacks |
| Backend | **Custom `server.ts`** (Next.js + Socket.IO entegre, tsx ile çalışır) | Vercel'e deploy EDİLEMEZ — persistent WebSocket istiyor. Hedef: Fly.io |
| Auth | Auth.js v5 (NextAuth) | Credentials provider + bcrypt |
| Database | PostgreSQL 16 (lokal docker, prod Neon) | Lokal port: **5435** (5432/5433 sıkça çakışıyor) |
| ORM | **Prisma 6** | v7 değil — v7'de `url = env(...)` schema'dan kaldırıldı, `prisma.config.ts`'a taşındı; biz v6 kullanıyoruz |
| Email | Resend | Faz 1'de aktif |
| Validation | Zod | Her sınırda |
| State (client) | Zustand + TanStack Query | Faz 1+'da kurulacak |
| State (live game) | **In-memory `Map`** (process-local) | Game state DB'de değil; oyun bittiğinde DB'ye yazılır. Process restart = canlı oyun kayıp (kabul edilen MVP trade-off) |
| Test (unit) | Vitest + happy-dom + Testing Library | `tests/unit/` |
| Test (e2e) | Playwright | `tests/e2e/` — multi-client live game senaryosu Faz 3'te kritik |
| CI/CD | GitHub Actions | `.github/workflows/ci.yml` (lint + format + typecheck + test + build) |
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
│   │   ├── (public)/             # / · /play · /play/[pin]
│   │   ├── (auth)/               # /login · /register · /forgot-password · /reset-password · /verify-email
│   │   ├── (host)/               # /dashboard · /quizzes/* · /host/[sessionId] · /history/*
│   │   ├── api/                  # API routes
│   │   ├── globals.css           # Tailwind v4 @theme + brand tokens
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                   # shadcn/ui primitives (Button, vb)
│   │   ├── quiz/                 # QuizForm, QuestionEditor, OptionInput (Faz 1)
│   │   ├── game/                 # QuestionDisplay, AnswerButton, Leaderboard, Podium (Faz 2-3)
│   │   └── layout/               # Navbar, AuthGuard
│   ├── lib/
│   │   ├── auth.ts               # Auth.js v5 config (skeleton, Faz 1'de doldurulacak)
│   │   ├── db.ts                 # Prisma singleton (hot-reload safe)
│   │   ├── utils.ts              # shadcn cn() helper
│   │   ├── socket-server.ts      # Server-side Socket.IO handlers (Faz 2)
│   │   ├── socket-client.ts      # Client wrapper (Faz 2)
│   │   └── game/                 # Game logic (Faz 2-3)
│   │       ├── scoring.ts        # 🎯 USER WRITES — puanlama formülü
│   │       ├── pin-generator.ts  # 🎯 USER WRITES — collision avoidance
│   │       ├── validators.ts     # 🎯 USER WRITES — nickname + quiz rules
│   │       ├── leaderboard.ts    # 🎯 USER WRITES — tie-break
│   │       └── state-machine.ts  # In-memory GameSession Manager
│   ├── hooks/                    # useGameSocket, useGameState (Faz 2)
│   ├── types/                    # Paylaşılan TS tipleri
│   └── middleware.ts             # Auth gate
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

| Dosya | Faz | ~satır | Karar tipi |
|---|---|---|---|
| `src/lib/game/scoring.ts` | 3 | ~10 | Doğru/hız puanlama formülü (3 yaklaşım açıklı) |
| `src/lib/game/pin-generator.ts` | 2 | ~15 | Çakışma önleme stratejisi (DB lookup vs in-memory cache) |
| `src/lib/game/validators.ts` | 2 | ~20 | Nickname kuralları + quiz validity |
| `src/lib/game/leaderboard.ts` | 3 | ~10 | Eşit skorda tie-break |

Her birinde stub + test önceden hazır olacak; agent kullanıcıya "bu fonksiyonu sen yaz" diye işaret eder, devamını implement etmez.

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

---

## Bağlantılı Dökümanlar

- 📋 [docs/PLAN.md](docs/PLAN.md) — Detaylı 6-fazlı MVP planı
- 🎨 [docs/DESIGN_PROMPT.md](docs/DESIGN_PROMPT.md) — Tasarım sistemi spec (28 ekran listesi, renk paleti, tipografi)
- 🖼️ [mockups/index.html](mockups/index.html) — Tasarım mockup'ları hub
- 🤖 [CLAUDE.md](CLAUDE.md) — Claude Code'a özel ek kurallar
- 📝 [README.md](README.md) — Public okuyucu için proje tanıtımı
