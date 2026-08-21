import { describe, it, expect, beforeAll } from "vitest";
import { signShareToken, verifyShareToken } from "@/lib/shareLink";

const DOCUMENT_ID = "123e4567-e89b-42d3-a456-426614174000";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret";
});

describe("shareLink tokens", () => {
  it("roundtrips for the matching document id", async () => {
    const token = await signShareToken(DOCUMENT_ID, 3600);
    await expect(verifyShareToken(DOCUMENT_ID, token)).resolves.toBe(true);
  });

  it("fails for a different document id", async () => {
    const token = await signShareToken(DOCUMENT_ID, 3600);
    await expect(
      verifyShareToken("999e4567-e89b-42d3-a456-426614174999", token),
    ).resolves.toBe(false);
  });

  it("fails for an expired token", async () => {
    const token = await signShareToken(DOCUMENT_ID, -10);
    await expect(verifyShareToken(DOCUMENT_ID, token)).resolves.toBe(false);
  });

  it("fails on a tampered signature", async () => {
    const token = await signShareToken(DOCUMENT_ID, 3600);
    const [exp, sig] = token.split(".");
    const tamperedSig = sig.slice(0, -1) + (sig.endsWith("0") ? "1" : "0");
    await expect(verifyShareToken(DOCUMENT_ID, `${exp}.${tamperedSig}`)).resolves.toBe(false);
  });

  it("fails on a malformed token", async () => {
    await expect(verifyShareToken(DOCUMENT_ID, "notatoken")).resolves.toBe(false);
    await expect(verifyShareToken(DOCUMENT_ID, null)).resolves.toBe(false);
  });
});
