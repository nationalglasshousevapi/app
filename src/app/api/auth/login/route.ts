import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import {
  clientIpFrom,
  clearFailures,
  isRateLimited,
  recordFailure,
} from "@/lib/rateLimit";

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export async function POST(req: NextRequest) {
  let password: unknown;
  try {
    const body = await req.json();
    password = body?.password;
  } catch {
    return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
  }

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "Server misconfigured: ADMIN_PASSWORD not set" },
      { status: 500 }
    );
  }

  const ip = clientIpFrom(req);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many failed login attempts. Try again in 15 minutes." },
      { status: 429 }
    );
  }

  const provided = sha256(typeof password === "string" ? password : "");
  const expected = sha256(process.env.ADMIN_PASSWORD);
  const ok =
    provided.length === expected.length && timingSafeEqual(provided, expected);

  if (!ok) {
    recordFailure(ip);
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  clearFailures(ip);
  await createSession();
  return NextResponse.json({ ok: true });
}
