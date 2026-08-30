import crypto from "crypto";

// Çerez imzalamak için kullanılan gizli anahtar. ADMIN_SESSION_SECRET
// ayarlanmadıysa ADMIN_PASSWORD'e düşer (o da yoksa sabit bir yedeğe).
const SECRET =
  process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "asl-hub-fallback-secret";

const COOKIE_NAME = "asl_admin";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 gün

function sign(value) {
  return crypto.createHmac("sha256", SECRET).update(value).digest("base64url");
}

export function createSessionCookie() {
  const expiry = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `admin.${expiry}`;
  const token = `${payload}.${sign(payload)}`;
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_SECONDS}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => {
        const idx = p.indexOf("=");
        return [decodeURIComponent(p.slice(0, idx)), decodeURIComponent(p.slice(idx + 1))];
      })
  );
}

export function isAdminRequest(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies[COOKIE_NAME];
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [type, expiry, sig] = parts;
  const payload = `${type}.${expiry}`;
  if (sign(payload) !== sig) return false;
  if (Date.now() > Number(expiry)) return false;
  return true;
}
