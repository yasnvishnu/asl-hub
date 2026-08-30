import { createSessionCookie } from "./_auth.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Yöntem desteklenmiyor." });
  }

  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  if (!ADMIN_PASSWORD) {
    return res.status(500).json({
      error: "Sunucuda ADMIN_PASSWORD ortam değişkeni ayarlanmamış. Vercel proje ayarlarını kontrol et."
    });
  }

  const { password } = req.body || {};
  if (typeof password !== "string" || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Şifre yanlış." });
  }

  res.setHeader("Set-Cookie", createSessionCookie());
  return res.status(200).json({ ok: true });
}
