@AGENTS.md

# Claude Code'a Özel Bilbil Kuralları

> Bu dosya yalnızca Claude Code için geçerlidir. Universal proje kuralları için
> yukarıda import edilen [AGENTS.md](AGENTS.md) tüm bağlamı taşır — onu önce oku.
> Bu dosya o bağlamın üzerine **Claude'a özgü** ekler yapar.

---

## İletişim Dili

- Kullanıcı **Türkçe** iletişimi tercih ediyor.
- Tüm açıklamalar, brief'ler, sorular Türkçe olmalı.
- Kod yorumları Türkçe kabul edilebilir; API/library isimleri İngilizce.
- Commit mesajları İngilizce (Conventional Commits: `chore:`, `feat:`, `fix:`).

## Kullanıcı Profili

- TypeScript / Next.js / Socket.IO ekosisteminde **başlangıç-orta seviye**.
- Mainstream + iyi dokümantasyonlu + AI desteği yoğun teknolojiler tercih ediyor.
- Belirsiz konularda "sen öner, avantaj/dezavantajla anlat" yaklaşımı tercih ediyor.
- Tek seçenek dayatma değil, alternatiflerle gerekçeli öneri istiyor.

## İş Tarzı (kritik)

Her implementation faz'ı şu döngüyle ilerler:

1. **Brief** — Faz başında "şunu yapacağız, şu dosyaları yaratacağız" özeti
2. **Implementation** — Önce iskelet, sonra detay; ara ara kullanıcıya göster
3. **USER WRITES** — İşaretli yerlerde (scoring, validators, pin-gen, leaderboard tie-break) kullanıcı 5-10 satır yazar
4. **Test** — Birlikte çalıştır, hata varsa düzelt
5. **Commit** — Faz tamamlanınca descriptive commit (Co-Authored-By: Claude tag'iyle)
6. **Retro** — Kısa "ne öğrendik" özeti

**Neden:** Kullanıcı tech bilgisini geliştirmek istiyor, sadece ürün değil. "Hızlı bitirmek" değil "anlayarak bitirmek" öncelikli. Toplu teslimde sürpriz/ret riski yüksek; faz faz onaylı ilerleme her aşamada hizalanmayı sağlıyor.

**Uygulama:**
- Yeni bir faza başlarken brief mesajı gönder, onay al.
- Her büyük dosya yaratımı sonrası kısa açıklama ver, soru sor.
- USER WRITES dosyalarını TODO/stub ile bırak — implement etme, kullanıcıya yazdır.
- Birden fazla dosyayı paralel oluşturma; lineer ve takip edilebilir kal.

## USER WRITES Protokolü

Aşağıdaki dosyalarda **kod yazma**:

| Dosya | Faz |
|---|---|
| `src/lib/game/scoring.ts` | 3 |
| `src/lib/game/pin-generator.ts` | 2 |
| `src/lib/game/validators.ts` | 2 |
| `src/lib/game/leaderboard.ts` | 3 |

**Yapacağın:**
1. Dosyayı oluştur, surrounding context yaz (imports, types, JSDoc).
2. Function signature'ı net parametreler/return type ile yaz.
3. Yorum satırlarında purpose, 2-3 alternatif yaklaşım, trade-off'ları açıkla.
4. Function body'de **TODO** ya da `throw new Error("USER WRITES: ...")` bırak.
5. Test dosyası önceden yaz (Vitest), kullanıcı kodu yazınca anında doğrulansın.
6. Kullanıcıya "şu fonksiyonu sen yaz" diye **explicit** söyle, beklerken implement etme.

Bu, Learning Mode philosophy'sinin somut uygulaması — boilerplate'i hızlandırırken business judgment'ı kullanıcıya bırakıyoruz.

## Memory Sistemi (Auto-recall)

Persistent memory: `/Users/seferalgan/.claude/projects/-Users-seferalgan-claude-egitimi-1/memory/`

Mevcut memory dosyaları:
- `MEMORY.md` — index
- `bilbil_project.md` — proje bağlamı + faz durumu (Faz 0 ✅ commit `e6e533d`)
- `user_profile.md` — Türkçe, başlangıç-orta TS, multi-choice tercih
- `feedback_phase_review.md` — faz faz brief→implement→review→commit döngüsü

**Ne zaman güncelleyeceksin:**
- Bir faz tamamlandığında → `bilbil_project.md`'de fazı ✅ olarak işaretle, commit hash'i ekle.
- Tasarım kararı kilitlendiğinde (hangi varyant seçildi) → not düş.
- Kullanıcı yeni bir tercih bildirirse → ilgili memory'yi güncelle.
- **NEVER** memory'ye stale/yanlış bilgi yaz; doğrulamadan önce git/dosya kontrol et.

## Tasarım → Kod Geçişi

`mockups/` klasöründe 28 ekran üretim kalitesinde HTML/Tailwind mockup var.

**Kullanım:**
- Bir ekranı implement ederken ilgili mockup HTML'ini aç, Tailwind class'larını referans al.
- Tahmini reuse: %60-70 (özellikle layout, spacing, color tokens).
- Mockup'larda kullanılan token'lar (`bg-brand`, `bg-a-red`, vb) globals.css'te `@theme` ile tanımlı, doğrudan çalışır.
- Mockup'larda kullanılan Türkçe placeholder'ları implementasyonda da kullan ("Türkiye Coğrafyası", "Ayşe", "Mehmet").

**Örnek workflow:** Faz 1'de `/login` sayfasını yazmaya başlarken:
1. `mockups/06-auth.html` aç → "3. Giriş Yap" bölümü
2. HTML yapısını ve class'ları kopyala
3. shadcn/ui Button, Input komponenetleriyle uyumla
4. Auth.js ile state bağla
5. Form validation Zod ile

## Skill Öncelikleri

Bu projede yaygın kullanılacaklar:
- **brainstorming** — yeni özellik fikri varsa
- **writing-plans** — Faz başında detay plan
- **systematic-debugging** — bug sırasında (kök neden bulmadan çözüm yok)
- **test-driven-development** — USER WRITES dosyalarında test önce
- **verification-before-completion** — "tamam" demeden önce komut çalıştır

## Plan Mode

Plan mode aktifse:
- Sadece plan dosyasına yazabilirsin (sistem belirler).
- Diğer dosyalara dokunma — sadece okuma.
- Plan dosyasını incremental olarak doldur (Phase 1 → Phase 5).
- Tamamlandığında `ExitPlanMode` çağır.

## Risk Yönetimi

- **Destructive operations:** `npm run db:reset`, `./scripts/dev.sh clean`, `git reset --hard`, `rm -rf` — kullanıcı onayı **şart**.
- **Vercel'e deploy:** Reddetmeli — Socket.IO için yanlış platform. Fly.io kullan.
- **Prisma 7'ye upgrade:** Reddetmeli — breaking changes, MVP için riskli.
- **Tailwind v3 config ekleme:** Reddetmeli — v4 `@theme` directive ile CSS-first.

## Bağlantılı Dökümanlar

- [AGENTS.md](AGENTS.md) — Universal proje bağlamı (stack, kurallar, repo yapısı)
- [docs/PLAN.md](docs/PLAN.md) — 6-fazlı MVP planı
- [docs/DESIGN_PROMPT.md](docs/DESIGN_PROMPT.md) — Tasarım sistemi spec
- [mockups/index.html](mockups/index.html) — 28 ekran tasarım mockup'ı
- [README.md](README.md) — Public proje tanıtımı
