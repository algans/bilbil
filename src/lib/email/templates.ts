// Email template'leri — Türkçe, sade.
// HTML basic styling, text fallback. Faz 4 polish'inde brand template'i eklenebilir.

interface VerificationEmailInput {
  displayName: string;
  verifyUrl: string;
}

interface PasswordResetEmailInput {
  displayName: string;
  resetUrl: string;
}

export function verificationEmail({ displayName, verifyUrl }: VerificationEmailInput) {
  const subject = "Bilbil — E-postanı doğrula";
  const text = `Merhaba ${displayName},

Bilbil hesabını oluşturduğun için teşekkürler. E-posta adresini doğrulamak için aşağıdaki bağlantıya tıkla:

${verifyUrl}

Bu bağlantı 24 saat geçerli. Hesap senin değilse bu e-postayı yok sayabilirsin.

— Bilbil`;

  const html = `<!doctype html><html><body style="font-family:Inter,system-ui,sans-serif;background:#f1f5f9;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 20px 60px -15px rgba(124,58,237,.15)">
    <div style="display:flex;align-items:center;gap:8px;justify-content:center;margin-bottom:24px">
      <div style="width:40px;height:40px;border-radius:12px;background:#7C3AED;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:18px">B</div>
      <span style="font-weight:800;font-size:20px">Bilbil</span>
    </div>
    <h1 style="font-weight:800;font-size:22px;text-align:center;margin:0 0 12px">E-postanı doğrula</h1>
    <p style="color:#475569;line-height:1.6">Merhaba <strong>${escapeHtml(displayName)}</strong>,</p>
    <p style="color:#475569;line-height:1.6">Bilbil hesabını oluşturduğun için teşekkürler. Aşağıdaki butona tıklayarak e-posta adresini doğrula:</p>
    <p style="text-align:center;margin:24px 0">
      <a href="${verifyUrl}" style="display:inline-block;background:#7C3AED;color:#fff;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none">E-postamı Doğrula</a>
    </p>
    <p style="color:#94a3b8;font-size:13px;line-height:1.5">Buton çalışmazsa bu bağlantıyı tarayıcına yapıştır:<br><code style="word-break:break-all;color:#7C3AED">${verifyUrl}</code></p>
    <p style="color:#94a3b8;font-size:12px;margin-top:24px">Bu bağlantı 24 saat geçerli. Hesap senin değilse bu e-postayı yok sayabilirsin.</p>
  </div>
  </body></html>`;

  return { subject, text, html };
}

export function passwordResetEmail({ displayName, resetUrl }: PasswordResetEmailInput) {
  const subject = "Bilbil — Şifre sıfırlama bağlantısı";
  const text = `Merhaba ${displayName},

Şifre sıfırlama isteği aldık. Yeni bir şifre belirlemek için aşağıdaki bağlantıya tıkla:

${resetUrl}

Bu bağlantı 1 saat geçerli. Şifre sıfırlama isteği sen yapmadıysan bu e-postayı yok say — hesabın güvende.

— Bilbil`;

  const html = `<!doctype html><html><body style="font-family:Inter,system-ui,sans-serif;background:#f1f5f9;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 20px 60px -15px rgba(124,58,237,.15)">
    <div style="display:flex;align-items:center;gap:8px;justify-content:center;margin-bottom:24px">
      <div style="width:40px;height:40px;border-radius:12px;background:#7C3AED;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:18px">B</div>
      <span style="font-weight:800;font-size:20px">Bilbil</span>
    </div>
    <h1 style="font-weight:800;font-size:22px;text-align:center;margin:0 0 12px">Şifreni sıfırla</h1>
    <p style="color:#475569;line-height:1.6">Merhaba <strong>${escapeHtml(displayName)}</strong>,</p>
    <p style="color:#475569;line-height:1.6">Şifre sıfırlama isteği aldık. Aşağıdaki butona tıklayarak yeni bir şifre belirleyebilirsin:</p>
    <p style="text-align:center;margin:24px 0">
      <a href="${resetUrl}" style="display:inline-block;background:#7C3AED;color:#fff;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none">Şifreyi Sıfırla</a>
    </p>
    <p style="color:#94a3b8;font-size:13px;line-height:1.5">Buton çalışmazsa bu bağlantıyı tarayıcına yapıştır:<br><code style="word-break:break-all;color:#7C3AED">${resetUrl}</code></p>
    <p style="color:#94a3b8;font-size:12px;margin-top:24px">Bu bağlantı 1 saat geçerli. Şifre sıfırlama isteği sen yapmadıysan bu e-postayı yok say — hesabın güvende.</p>
  </div>
  </body></html>`;

  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
