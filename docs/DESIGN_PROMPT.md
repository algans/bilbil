# Bilbil — Tasarım Promptu (Claude / Claude Artifacts için)

> Bu promptu Claude'a (claude.ai veya artifact mode) verdiğinde tüm ekranları
> tek seferde veya parça parça ürettirebilirsin. Aşağıdaki blok tek bir
> "system prompt" gibi davranır.

---

## 🎯 GÖREV

Sen kıdemli bir ürün tasarımcısı + frontend developer'sın. **Bilbil** adlı
canlı çoklu oyunculu quiz uygulamasının (Kahoot benzeri) tüm ekranlarını
**production kalitesinde, statik HTML + Tailwind CSS** olarak tasarla. Her
ekran ayrı bir `<section>` veya ayrı bir HTML belgesi olarak teslim
edilebilir.

## 📦 PROJE BAĞLAMI

- **Ürün:** Bilbil — Türkçe, canlı, anonim katılımlı 4-şıklı quiz oyunu
- **Kullanıcı tipleri:** Host (kayıtlı, quiz üreten) + Player (anonim, PIN ile katılan)
- **Cihaz:** Mobile-first responsive (Player büyük çoğunlukla telefonda; Host masaüstü/projeksiyon)
- **Dil:** Sadece Türkçe — i18n yok, tüm metinler doğrudan Türkçe
- **Eşzamanlılık:** ≤50 oyuncu/oturum
- **Stack hedefi:** Next.js 15 + Tailwind v4 + shadcn/ui + Framer Motion (sen sadece HTML + Tailwind döndür, shadcn primitiflerinin görünümünü taklit et: `Button`, `Input`, `Card`, `Dialog`, `Badge`, `Avatar`)

## 🎨 GÖRSEL DİL

**Karakter:** Enerjik, modern, oyunsu ama **AI slop değil** — gradient bombardımanı yok, generic emoji-pattern yok.

**Renk paleti (Kahoot'tan ilham, kendi kimliğimizle):**
- Brand: `#7C3AED` (mor) — birincil
- Accent: `#F59E0B` (amber) — vurgu, oyuncu enerjisi
- Cevap renkleri (kalıcı, tüm ekranlarda aynı sırayla):
  - Şık 1 (üst-sol): `#EF4444` kırmızı + üçgen ikon
  - Şık 2 (üst-sağ): `#3B82F6` mavi + elmas ikon
  - Şık 3 (alt-sol): `#F59E0B` sarı + daire ikon
  - Şık 4 (alt-sağ): `#10B981` yeşil + kare ikon
- Nötr: Tailwind `slate` ölçeği
- Dark mode: opsiyonel ama lobby + host büyük ekran **dark theme tercih**

**Tipografi:**
- Sans: `Inter` (UI), `Geist Sans` da kabul
- Display: Soru metni ve büyük skorlar için `Geist Sans` veya `Cabinet Grotesk` — extra bold
- Türkçe karakter desteği şart (ş, ğ, İ, ı, ö, ü, ç)

**Hareket prensipleri (yorum olarak ekle, animasyon kütüphanesini varsayalım):**
- Soru geçişi: slide-up + fade
- Doğru cevap reveal: yeşil pulse + checkmark spring
- Yanlış cevap: hafif shake + kırmızı flash
- Podium: top 3 sıralı pop-in (3. → 2. → 1.)
- Leaderboard: skor değişen oyuncuda glow + position swap

**Erişilebilirlik:**
- Min kontrast WCAG AA
- Tüm interaktif öğelerde focus ring
- Dokunma hedefi ≥ 44px (mobile)

## 🖼️ ÜRETİLECEK EKRANLAR (28 ekran)

> Her ekran için: **route**, **state**, **mobile + desktop varyantları**, **boş/dolu/error variants**.

### A. Public
1. **Landing (`/`)** — Hero + "Quiz Oluştur" / "PIN ile Katıl" çift CTA, kısa "nasıl çalışır" şeridi
2. **PIN Giriş (`/play`)** — büyük 6 haneli numpad input, "Katıl" butonu, mobil odaklı

### B. Auth (5 ekran)
3. **Giriş Yap** — email + şifre, "Şifremi unuttum" linki
4. **Kayıt Ol** — email + şifre + ad, KVKK onay checkbox
5. **Şifremi Unuttum** — sadece email + "Bağlantı gönder"
6. **Şifre Sıfırla** — yeni şifre + tekrar
7. **E-posta Doğrulama** — başarı varyantı (yeşil tik + "Devam et") VE hata varyantı (token geçersiz)

### C. Host Dashboard (7 ekran)
8. **Dashboard / Quiz Grid (`/dashboard`)** — boş durum (illüstrasyon + "İlk quiz'ini oluştur") VE dolu durum (kart grid: başlık, soru sayısı, son oynanma, "Başlat" + dropdown menü)
9. **Yeni Quiz (`/quizzes/new`)** — başlık, açıklama, sürükle-bırak ile sıralanabilir soru kartları, her soru: prompt + 4 şık + doğru radio + süre seçici (10/20/30s)
10. **Quiz Önizleme (`/quizzes/[id]`)** — quiz özeti + soruların önizlemesi + büyük "Oyun Başlat" CTA
11. **Quiz Düzenle (`/quizzes/[id]/edit`)** — aynı form, mevcut veri yüklenmiş, "Sil" tehlikeli aksiyonu altta
12. **Geçmiş Oyunlar (`/history`)** — tablo/liste: PIN, quiz adı, oyuncu sayısı, tarih, kazanan
13. **Oyun Analitiği (`/history/[sessionId]`)** — özet kartları + soru bazlı doğruluk bar grafiği + final leaderboard
14. **Navbar (layout)** — logo + ana nav (Quiz'lerim / Geçmiş) + profil dropdown (çıkış)

### D. Host Live — `/host/[sessionId]` (büyük ekran, 6 state)
15. **LOBBY** — devasa PIN (numerik, kopyalanabilir) + QR kod + animasyonla giren oyuncu kartları + altta oyuncu sayacı + "Oyunu Başlat" butonu (en az 1 oyuncu varsa aktif)
16. **QUESTION_OPEN** — üstte geri sayım halkası (20→0), ortada soru metni dev font, altta 4 renkli şık (Kahoot stili), sağ üstte "X / 50 cevapladı"
17. **QUESTION_REVEAL** — doğru şık glow + check ikonu + diğerleri sönükleşir, altta per-option bar grafiği (kaç kişi hangi şıkkı seçti), "Sonraki Soru" CTA
18. **LEADERBOARD** — top 10 satır, her satır: rank + nickname + avatar inisyali + skor + delta (+340 yeşil), "Devam Et" CTA
19. **GAME_ENDED / PODIUM** — top 3 podyum (2-1-3 sıralı), büyük şampiyon kartı, altında konfeti zemin, "Yeni Oyun" + "Sonuçları Gör" CTA
20. **ABANDONED / Error** — host disconnect uyarısı, "Oyun bitirildi, kısmi sonuçlar kaydedildi"

### E. Player Live — `/play/[pin]` (mobile-first, 8 state)
21. **Nickname Giriş** — tek input ("Adın ne?"), karakter limiti, "Katıl"
22. **Lobby** — "Bekleniyor…" pulsing dot + diğer oyuncuların avatar bulutu + ipucu metni
23. **Question Open** — soru metni üstte (küçük), ekranın %75'i 4 dev renkli buton (sembol odaklı, metin opsiyonel — Kahoot felsefesi), üstte minimal süre çubuğu
24. **Answer Submitted** — "Cevabın alındı 🔒" (emoji yok aslında — checkmark ikon), seçtiği rengin pulse arka planı, "Diğerleri bekleniyor"
25. **Question Reveal** — büyük ✓ veya ✗, "Doğru! +850 puan" veya "Yanlış 😞 (doğru cevap: yeşil)", mevcut sıralama
26. **Mid-game Rank** — "Şu an 3. sıradasın" + skor + bir üsttekiyle fark
27. **Final Result** — kazandıysa konfeti + madalya, kazanmadıysa centilmen mesaj + final sıra + "Tekrar oyna"
28. **Error States** — paneller: (a) "Oda dolu (50/50)", (b) "Host bağlantıyı kesti", (c) "Bağlantı koptu, tekrar bağlanılıyor…" üst banner, (d) "Geçersiz PIN"

## 📐 DELİVERABLE FORMATI

Her ekran için:

```html
<!-- ========================================== -->
<!-- EKRAN: [numara]. [İsim] -->
<!-- ROUTE: /... -->
<!-- STATE: ... (varsa) -->
<!-- VARIANT: mobile | desktop | empty | error -->
<!-- ========================================== -->
<section class="...">
  ...
</section>
```

- Tek bir HTML dosyasında tümünü dikey olarak listele (her ekran arası `<hr>` ve görünür başlık)
- Tailwind class'ları sadece (custom CSS yok)
- shadcn/ui görünümünü taklit et: `rounded-lg border bg-card text-card-foreground shadow-sm` gibi
- İkonlar için Lucide isimlerini yorum olarak yaz: `<!-- icon: trophy -->`
- Tüm metinler **Türkçe**
- Placeholder veriler **gerçekçi Türkçe** olmalı: oyuncu adları (Ayşe, Mehmet, Zeynep), quiz başlıkları ("Türkiye Coğrafyası", "90'lar Pop Müzik")
- Animasyon yerlerini `<!-- motion: slide-up + fade -->` gibi yorumla işaretle

## 🚫 KAÇINILACAKLAR

- Generic AI gradient (mor→pembe diagonal hero)
- Stock emoji bombası
- "Lorem ipsum" — hep gerçekçi Türkçe placeholder
- Backwards-compat mock UI (her şey production-ready görünmeli)
- shadcn/ui dışında kütüphane class'ları (Bootstrap, Bulma vs)
- Inline `<style>` veya custom CSS

## ✅ KABUL KRİTERLERİ

- 28 ekranın tamamı tek dökümanda
- Her ekran ≤ 80 satır HTML
- Mobile-first (`sm:`, `md:`, `lg:` breakpoint'leri doğru kullanılmış)
- Renk sistemi tutarlı (4 cevap rengi her yerde aynı sırada)
- Türkçe karakter doğru render
- Boş/error variant'ları belirtildiği yerlerde mevcut

---

**Çıktıyı Bilbil ekibi doğrudan Next.js 15 + shadcn/ui projesine entegre edebilmeli. Production ciddiyetinde tasarla.**
