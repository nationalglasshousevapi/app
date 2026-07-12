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

export async function signToken(secret: string): Promise<string> {
  const value = "authenticated";
  const sig = await hmac(value, secret);
  return `${value}.${sig}`;
}

export async function verifyToken(token: string, secret: string): Promise<boolean> {
  const idx = token.lastIndexOf(".");
  if (idx === -1) return false;
  const value = token.slice(0, idx);
  const expected = await hmac(value, secret);
  return token.slice(idx + 1) === expected;
}
