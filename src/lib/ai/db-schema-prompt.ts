// AI router prompt'una embed edilen veritabanı şeması ve few-shot SQL örnekleri.
// Statik string — compile-time const. Runtime'da {HOST_ID} placeholder'ı interpolate edilir.
//
// Sadece raporlama için gerekli 6 tablo dahil. Hassas tablolar (users.passwordHash, tokens)
// kasıtlı olarak listelenmez; AI bu tabloları bilmediği için sorgulamayı denemez.

export const DB_SCHEMA_PROMPT = `
# Veritabanı Şeması (PostgreSQL)

PostgreSQL identifier'lar büyük/küçük harf duyarlı. Prisma camelCase kolon isimleri
çift tırnak içinde olmalı (örn: "hostId", "endedAt", "finalRank"). Tablo isimleri
snake_case ve tırnak gerektirmez.

TABLE quizzes (
  id text PRIMARY KEY,
  "hostId" text NOT NULL,
  title text NOT NULL,
  description text,
  "isPublished" boolean,
  "createdAt" timestamp,
  "updatedAt" timestamp
)
-- Notlar:
--   * "hostId" her sorguda WHERE filtresi olarak KULLANILACAK: q."hostId" = '{HOST_ID}'

TABLE questions (
  id text PRIMARY KEY,
  "quizId" text NOT NULL,      -- → quizzes.id
  prompt text NOT NULL,
  "order" int NOT NULL,         -- "order" PostgreSQL reserved word; ÇİFT TIRNAK ZORUNLU
  "timeLimitSec" int
)

TABLE question_options (
  id text PRIMARY KEY,
  "questionId" text NOT NULL,   -- → questions.id
  text text NOT NULL,
  "isCorrect" boolean NOT NULL,
  position int NOT NULL         -- 0..3 (sabit cevap pozisyonu)
)

TABLE game_sessions (
  id text PRIMARY KEY,
  pin text UNIQUE,              -- 6 haneli numerik string
  "quizId" text NOT NULL,       -- → quizzes.id
  "hostId" text NOT NULL,       -- → users.id (ama users tablosuna JOIN yapma)
  status text NOT NULL,         -- 'lobby' | 'in_progress' | 'ended' | 'abandoned'
  "startedAt" timestamp,
  "endedAt" timestamp,
  "createdAt" timestamp NOT NULL
)

TABLE player_results (
  id text PRIMARY KEY,
  "sessionId" text NOT NULL,    -- → game_sessions.id
  nickname text NOT NULL,
  "finalScore" int NOT NULL,
  "finalRank" int NOT NULL      -- 1 = kazanan
)

TABLE player_answers (
  id text PRIMARY KEY,
  "sessionId" text NOT NULL,
  "questionId" text NOT NULL,
  nickname text NOT NULL,
  "optionId" text,              -- null = timeout (oyuncu cevap vermedi)
  "answeredAtMs" int NOT NULL,  -- soru başlangıcından ms cinsinden
  "pointsAwarded" int NOT NULL,
  "isCorrect" boolean NOT NULL,
  "createdAt" timestamp NOT NULL
)

# JOIN İPUÇLARI
- Bir game_session'ı host'a bağlamak için: gs."hostId" = '{HOST_ID}' (direkt)
  VEYA gs."quizId" → q.id → q."hostId" = '{HOST_ID}' (quiz üzerinden)
- player_results host'a bağlamak: pr."sessionId" → gs.id → gs."hostId" = '{HOST_ID}'
- player_answers'tan question'a: pa."questionId" → qu.id → qu."quizId" → q."hostId" = '{HOST_ID}'

# KURALLAR
- Her sorgu sonunda LIMIT 50 ZORUNLU.
- WHERE "hostId" = '{HOST_ID}' filtresi (uygun JOIN üzerinden) ZORUNLU.
- Sadece SELECT. UPDATE/INSERT/DELETE/DROP yasak.
- users tablosuna asla SELECT'leme (passwordHash, email vs hassas).
- _token ile biten tablolara dokunma.
`.trim();

export const FEW_SHOT_EXAMPLES = `
-- "Son oyunu kim kazandı?"
SELECT pr.nickname, pr."finalScore", q.title, gs."endedAt"
FROM player_results pr
JOIN game_sessions gs ON pr."sessionId" = gs.id
JOIN quizzes q ON gs."quizId" = q.id
WHERE q."hostId" = '{HOST_ID}' AND pr."finalRank" = 1
ORDER BY gs."endedAt" DESC NULLS LAST
LIMIT 1;

-- "Bu ay kaç oyun oynandı?"
SELECT COUNT(*) AS games
FROM game_sessions gs
JOIN quizzes q ON gs."quizId" = q.id
WHERE q."hostId" = '{HOST_ID}'
  AND gs.status = 'ended'
  AND gs."endedAt" >= date_trunc('month', NOW())
LIMIT 50;

-- "En çok kazanan oyuncum kim?"
SELECT pr.nickname, COUNT(*) AS wins
FROM player_results pr
JOIN game_sessions gs ON pr."sessionId" = gs.id
JOIN quizzes q ON gs."quizId" = q.id
WHERE q."hostId" = '{HOST_ID}' AND pr."finalRank" = 1
GROUP BY pr.nickname
ORDER BY wins DESC
LIMIT 50;

-- "Türkiye Coğrafyası quiz'imde en zor soru hangisi?"
SELECT qu.prompt, AVG(CASE WHEN pa."isCorrect" THEN 1.0 ELSE 0.0 END) AS accuracy
FROM player_answers pa
JOIN questions qu ON pa."questionId" = qu.id
JOIN quizzes q ON qu."quizId" = q.id
WHERE q."hostId" = '{HOST_ID}' AND q.title ILIKE '%Türkiye Coğrafyası%'
GROUP BY qu.prompt
ORDER BY accuracy ASC
LIMIT 5;

-- "PIN 123456 olan oyunda kim kazandı?"
SELECT pr.nickname, pr."finalScore"
FROM player_results pr
JOIN game_sessions gs ON pr."sessionId" = gs.id
WHERE gs.pin = '123456' AND gs."hostId" = '{HOST_ID}'
ORDER BY pr."finalRank" ASC
LIMIT 50;
`.trim();
