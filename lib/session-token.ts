/**
 * HMAC-signed session tokens — pure Web Crypto, safe in both Node and Edge
 * runtimes (no Next.js imports, no shared state).
 *
 * Token format: base64url(userId).base64url(expiryMs).base64url(hmac-sha256)
 * The signature covers "userId.expiry", so both fields are tamper-proof.
 */

const SESSION_TTL_MS = 60 * 60 * 24 * 7; // 1 week — mirrors the cookie maxAge

const encoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return base64UrlEncode(new Uint8Array(signature));
}

export async function createSessionToken(userId: string, secret: string): Promise<string> {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${exp}`;
  const signature = await sign(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token: string, secret: string): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, signature] = parts;

  const expected = await sign(`${userId}.${exp}`, secret);
  if (expected.length !== signature.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  if (diff !== 0) return null;

  if (!Number.isFinite(Number(exp)) || Number(exp) < Date.now()) return null;
  return userId;
}
