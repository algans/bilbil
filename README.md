# Bilbil

Türkçe canlı multiplayer quiz uygulaması — Kahoot benzeri MVP.

Host kendi quiz'ini hazırlar, oyun başlatır, 6 haneli PIN paylaşır. Oyuncular nickname ile anonim katılır. Hız + doğruluk = puan. ≤50 oyuncu / oturum.

## Stack

- **Next.js 16** (App Router, src/) + React 19 + TypeScript
- **Tailwind CSS v4** + shadcn/ui
- **Custom server.ts** — Next.js + Socket.IO entegre (gerçek zamanlı oyun için)
- **PostgreSQL 16** (lokal docker, prod Neon) + **Prisma 7**
- **Auth.js v5** (Credentials provider + bcrypt)
- **Vitest** (unit) + **Playwright** (e2e, multi-client)
- **ESLint** + **Prettier** + **Husky** + **lint-staged**

## Hızlı Başlangıç

```bash
# 1. Bağımlılıklar
npm install

# 2. Lokal Postgres'i başlat (port 5433)
npm run db:up

# 3. Environment
cp .env.example .env
# AUTH_SECRET'i üret: openssl rand -base64 32

# 4. Database migrate
npm run db:migrate

# 5. Geliştirme sunucusu (Next.js + Socket.IO)
npm run dev
# → http://localhost:3000
```

## Komutlar

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
| `npm run db:up` | Docker Postgres başlat |
| `npm run db:down` | Docker Postgres durdur |
| `npm run db:migrate` | Prisma migration |
| `npm run db:studio` | Prisma Studio (db browser) |

## Proje Yapısı

```
bilbil/
├── prisma/schema.prisma       # User, Quiz, Question, Option, GameSession, PlayerResult, PlayerAnswer
├── server.ts                  # Custom Next.js + Socket.IO server
├── src/
│   ├── app/                   # Next.js App Router
│   ├── components/ui/         # shadcn/ui primitives
│   ├── lib/
│   │   ├── auth.ts            # Auth.js v5 config
│   │   ├── db.ts              # Prisma singleton
│   │   └── game/              # Faz 2-3'te: scoring, state-machine, validators
│   └── generated/prisma/      # Prisma client (gitignored)
├── tests/
│   ├── unit/                  # Vitest
│   └── e2e/                   # Playwright (multi-client live game)
├── docs/
│   ├── PLAN.md                # MVP planı
│   └── DESIGN_PROMPT.md       # Tasarım sistemi
├── mockups/                   # 28 ekran HTML mockup (referans)
├── docker-compose.yml         # Lokal Postgres
└── .github/workflows/ci.yml   # Lint + typecheck + test + build
```

## Faz Planı

| Faz | Süre | İçerik |
|---|---|---|
| **0** ✓ | 1-2 gün | Setup (şu an buradayız) |
| **1** | 1 hafta | Auth + Quiz CRUD |
| **2** | 1 hafta | Live Game Skeleton (PIN + lobby + reconnect) |
| **3** | 1 hafta | Question Lifecycle (timer + scoring + leaderboard + persist) |
| **4** | 1 hafta | Polish + edge cases + e2e tests |
| **5** | 2-3 gün | Deploy (Fly.io + Neon) |

Detay için `docs/PLAN.md`.

## Tasarım Sistemi

- **Brand:** `#7c3aed` mor + `#f59e0b` amber accent
- **4 sabit cevap rengi** (kalıcı sıralama, renk + şekil ikili kodlama):
  - Kırmızı üçgen `#ef4444`
  - Mavi elmas `#3b82f6`
  - Sarı daire `#f59e0b`
  - Yeşil kare `#10b981`
- **Tipografi:** Inter (UI) + Inter 800-900 (display)
- **Hibrit yaklaşım:** Player ekranları light/clean, Host Live mor dark/dramatic

`mockups/index.html` → 28 ekran referansı.

## License

Private — geliştirme aşamasında.
