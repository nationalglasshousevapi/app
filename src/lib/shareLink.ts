// Stateless signed share-link tokens for public PDF viewing.
// Token format: `<exp-epoch>.<hmac-sha256("<documentId>.<exp>")>`
// Works in both Node and Edge runtimes (uses Web Crypto).

async function hmacHex(value: string, secret: string): Promise<string> {
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

function secret(): string {
  return process.env.SESSION_SECRET ?? "";
}

export async function signShareToken(
  documentId: string,
  expirySeconds: number
): Promise<string> {
  const s = secret();
  if (!s) throw new Error("Missing SESSION_SECRET env var");
  const exp = Math.floor(Date.now() / 1000) + expirySeconds;
  const value = `${documentId}.${exp}`;
  const sig = await hmacHex(value, s);
  return `${exp}.${sig}`;
}

export async function verifyShareToken(
  documentId: string,
  token: string | null
): Promise<boolean> {
  const s = secret();
  if (!s || !token) return false;
  const dotIdx = token.indexOf(".");
  if (dotIdx === -1) return false;
  const expStr = token.slice(0, dotIdx);
  const providedSig = token.slice(dotIdx + 1);
  if (!/^\d+$/.test(expStr)) return false;
  const exp = Number(expStr);
  if (exp <= Math.floor(Date.now() / 1000)) return false;
  const expected = await hmacHex(`${documentId}.${exp}`, s);
  if (providedSig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= providedSig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
