import { cookies } from "next/headers";
import { SESSION_COOKIE, signToken, verifyToken } from "./authEdge";

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("Missing SESSION_SECRET env var");
  return s;
}

// Call from a Route Handler after checking the password.
export async function createSession() {
  const token = await signToken(secret());
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export function destroySession() {
  cookies().delete(SESSION_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifyToken(token, secret());
}
