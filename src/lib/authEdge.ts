// Edge-compatible signed-cookie helpers, shared by middleware.ts (edge runtime)
// and the login/logout route handlers.

export const SESSION_COOKIE = "ngh_session";

async function hmac(value: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signToken(
  secret: string,
  expiresInDays = 30
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60;
  const value = `authenticated.${exp}`;
  const sig = await hmac(value, secret);
  return `${value}.${sig}`;
}

export async function verifyToken(token: string, secret: string): Promise<boolean> {
  const sigIdx = token.lastIndexOf(".");
  if (sigIdx === -1) return false;
  const value = token.slice(0, sigIdx);
  const providedSig = token.slice(sigIdx + 1);
  const parts = value.split(".");
  if (parts.length !== 2 || parts[0] !== "authenticated") return false;
  const exp = Number(parts[1]);
  if (!Number.isInteger(exp) || exp <= Math.floor(Date.now() / 1000)) {
    return false;
  }
  const expected = await hmac(value, secret);
  if (providedSig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= providedSig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
