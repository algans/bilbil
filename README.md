# Bilbil

Türkçe canlı multiplayer quiz uygulaması — Kahoot benzeri MVP.

Host kendi quiz'ini hazırlar, oyun başlatır, 6 haneli PIN paylaşır. Oyuncular nickname ile anonim katılır. Hız + doğruluk = puan. ≤50 oyuncu / oturum.

## Stack

- **Next.js 16** (App Router, src/, Turbopack) + React 19 + TypeScript
- **Tailwind CSS v4** + shadcn/ui (CSS-first `@theme` directive)
- **Custom server.ts** — Next.js + Socket.IO entegre (gerçek zamanlı oyun için)
- **PostgreSQL 16** (lokal docker, prod Neon) + **Prisma 6**
- **Auth.js v5** (Credentials provider + bcrypt + JWT session)
- **@dnd-kit** (drag-drop, klavye + dokunmatik destekli)
- **Mock email** (Faz 1, `tmp/emails/` altına JSON yazar — Faz 5'te Resend ile değişir)
- **Vitest** (unit) + **Playwright** (e2e, multi-client)
- **ESLint** + **Prettier** + **Husky** + **lint-staged**
- **GitHub Actions** CI

## Hızlı Başlangıç

**Tek komut ile başlat (önerilen):**

```bash
./scripts/dev.sh start
# → Docker daemon kontrolü → .env (yoksa kopyalar) → npm install (gerekirse)
# → Postgres up (port 5435) → migrations → npm run dev → HTTP 200 wait
# → ~22 saniyede http://localhost:3000 hazır
```

İlk kurulumda `.env` dosyası `.env.example`'dan otomatik oluşturulur. **`AUTH_SECRET`'ı production öncesi değiştirmeyi unutma:** `openssl rand -base64 32`.

### Faz 1 mock email akışı

Geliştirme sırasında gerçek SMTP yerine **mock gönderici** kullanılıyor (Resend entegrasyonu Faz 5'te). Kayıt olduğunda doğrulama maili `tmp/emails/*.json` olarak yazılır + console'da basılır:

```bash
# En son gönderilen maili oku ve verify URL'ini al
ls -t tmp/emails/ | head -1 | xargs -I{} cat tmp/emails/{} | jq .text
```

Veya `./scripts/dev.sh logs` ile dev server log'undaki mailleri canlı izleyebilirsin.

**Manuel akış (script kullanmadan):**

```bash
npm install
cp .env.example .env       # AUTH_SECRET'i üret: openssl rand -base64 32
npm run db:up              # Docker Postgres (port 5435)
npm run db:migrate         # Prisma migration
npm run dev                # Custom server (Next.js + Socket.IO)
# → http://localhost:3000
```

## Komutlar

### Lifecycle (önerilen)

| Komut | Ne yapar |
|---|---|
| `./scripts/dev.sh start` | Tüm servisleri başlat (docker + db + dev server) |
| `./scripts/dev.sh stop` | Tüm servisleri durdur (process'ler + docker) |
| `./scripts/dev.sh restart` | Stop + start |
| `./scripts/dev.sh status` | Hangi servisler ayakta? |
| `./scripts/dev.sh logs` | Dev server log'larını canlı izle |
| `./scripts/dev.sh clean` | Stop + DB volume sil ⚠ destructive |
| `./scripts/dev.sh help` | Yardım |

### NPM script'leri

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Custom server.ts (Next.js + Socket.IO) çalıştırır |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run format` | Prettier auto-format |
| `npm run format:check` | Prettier check (CI) |
| `npm run typecheck` | TypeScript type check (`tsc --noEmit`) |
| `npm test` | Vitest unit testler |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:e2e` | Playwright e2e testler |
| `npm run db:up` | Docker Postgres başlat (port 5435) |
| `npm run db:down` | Docker Postgres durdur |
| `npm run db:migrate` | Prisma migration |
| `npm run db:generate` | Prisma client generate |
| `npm run db:studio` | Prisma Studio (db browser) |
| `npm run db:reset` | DB sıfırla ⚠ destructive |

## Proje Yapısı

```
bilbil/
├── prisma/schema.prisma       # User, Quiz, Question, QuestionOption,
│                              # GameSession, PlayerResult, PlayerAnswer
├── server.ts                  # Custom Next.js + Socket.IO server
├── scripts/dev.sh             # Lokal lifecycle yöneticisi
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (public)/          # / · /play · /play/[pin]
│   │   ├── (auth)/            # /login · /register · /forgot-password · ...
│   │   ├── (host)/            # /dashboard · /quizzes/* · /host/* · /history/*
│   │   ├── api/               # API routes
│   │   └── globals.css        # Tailwind v4 @theme + brand tokens
│   ├── components/
│   │   ├── ui/                # shadcn/ui primitives
│   │   ├── auth/              # Login/Register/Forgot/Reset/Verify form'ları (Faz 1)
│   │   ├── layout/            # HostNavbar (mockup #14)
│   │   ├── dashboard/         # QuizCard, EmptyDashboard
│   │   └── quiz/              # QuizForm, QuestionRow, DeleteQuizButton (Faz 1)
│   ├── middleware.ts          # Auth gate
│   └── lib/
│       ├── auth.ts            # Auth.js v5 (Credentials + JWT)
│       ├── auth/tokens.ts     # E-posta + reset token helpers
│       ├── dal.ts             # getCurrentUser, requireUser
│       ├── db.ts              # Prisma singleton
│       ├── email/             # Mock email + templates (Faz 1)
│       ├── validation/        # Zod şemaları (auth + quiz)
│       ├── actions/           # Server actions (auth + quiz)
│       └── game/              # Faz 2-3'te: scoring, state-machine, validators
├── tests/
│   ├── unit/                  # Vitest
│   └── e2e/                   # Playwright (multi-client live game)
├── docs/
│   ├── PLAN.md                # MVP planı
│   └── DESIGN_PROMPT.md       # Tasarım sistemi
├── mockups/                   # 28 ekran HTML mockup (referans)
├── docker-compose.yml         # Lokal Postgres (port 5435)
└── .github/workflows/ci.yml   # Lint + typecheck + test + build
```

## Faz Planı

| Faz | Süre | İçerik | Durum |
|---|---|---|---|
| **0** | 1-2 gün | Setup (Next.js + Tailwind + Prisma + Auth.js + Socket.IO + tests + CI) | ✅ Tamamlandı (`e6e533d`) |
| **1** | 1 hafta | Auth + Quiz CRUD (5 auth ekranı, dashboard, drag-drop quiz form, e2e + unit testler) | ✅ **Tamamlandı** (2026-05-05) |
| **2** | 1 hafta | Live Game Skeleton (PIN + lobby + reconnect) | 🟡 Sıradaki |
| **3** | 1 hafta | Question Lifecycle (timer + scoring + leaderboard + persist) | ⏳ |
| **4** | 1 hafta | Polish + edge cases + e2e tests | ⏳ |
| **5** | 2-3 gün | Deploy (Fly.io + Neon) | ⏳ |

Detay için [docs/PLAN.md](docs/PLAN.md).

## Tasarım Sistemi

- **Brand:** `#7c3aed` mor + `#f59e0b` amber accent
- **4 sabit cevap rengi** (kalıcı sıralama, renk + şekil ikili kodlama):
  - Kırmızı üçgen `#ef4444`
  - Mavi elmas `#3b82f6`
  - Sarı daire `#f59e0b`
  - Yeşil kare `#10b981`
- **Tipografi:** Inter (UI) + Inter 800-900 (display)
- **Hibrit yaklaşım:** Player ekranları light/clean, Host Live mor dark/dramatic

**Kilitlenmiş tasarım kararları:**
- Player Question (state 23): **Varyant B** (timer ring, light tema, şekil + metin)
- Quiz Creation: **Varyant A** (long form, drag-drop, tek sayfa)
- Landing: **Varyant B** (Demo Centric — sol metin + sağ telefon mockup)

[mockups/index.html](mockups/index.html) → 28 ekran referansı.

## AI Agent Bağlamı

- 🤖 [AGENTS.md](AGENTS.md) — Tüm AI agent'ler (Claude, Cursor, Cline, Copilot, vb.) için proje gerçekliği
- 🔵 [CLAUDE.md](CLAUDE.md) — Claude Code'a özel ek kurallar (memory, iş tarzı, USER WRITES protokolü)

## License

Private — geliştirme aşamasında.
