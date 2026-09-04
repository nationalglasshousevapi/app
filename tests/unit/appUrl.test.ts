import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getAppBaseUrl, buildPublicPdfUrl } from "@/lib/appUrl";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

function mockHeaders(entries: Record<string, string>): Headers {
  return new Headers(entries);
}

describe("getAppBaseUrl — single source of truth for share links & emails", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    vi.unstubAllEnvs();
    // restore original
    for (const k of Object.keys(process.env)) delete (process.env as any)[k];
    Object.assign(process.env, originalEnv);
  });

  it("prefers NEXT_PUBLIC_APP_URL over request headers", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    vi.stubEnv("VERCEL_URL", "preview-123.vercel.app");
    const req = { headers: mockHeaders({ host: "preview-123.vercel.app" }) } as any;
    expect(getAppBaseUrl(req)).toBe("https://app.example.com");
  });

  it("falls back to VERCEL_PROJECT_PRODUCTION_URL when no explicit APP_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "prod.example.com");
    const req = { headers: mockHeaders({ host: "localhost:3000" }) } as any;
    expect(getAppBaseUrl(req)).toBe("https://prod.example.com");
  });

  it("normalizes VERCEL_URL without scheme", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_URL", "my-app-xyz.vercel.app");
    expect(getAppBaseUrl(undefined)).toBe("https://my-app-xyz.vercel.app");
  });

  it("uses Origin header from browser fetch (most accurate)", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    const req = {
      headers: mockHeaders({ origin: "https://custom.example.com", host: "custom.example.com", "x-forwarded-host": "internal.vercel.app" }),
    } as any;
    expect(getAppBaseUrl(req)).toBe("https://custom.example.com");
  });

  it("uses x-forwarded-host (first value) with x-forwarded-proto", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    const req = {
      headers: mockHeaders({ "x-forwarded-host": "custom.example.com, internal.vercel.app", "x-forwarded-proto": "https", host: "internal.vercel.app" }),
    } as any;
    expect(getAppBaseUrl(req)).toBe("https://custom.example.com");
  });

  it("defaults to https for non-localhost when no proto", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    const req = { headers: mockHeaders({ host: "example.com" }) } as any;
    expect(getAppBaseUrl(req)).toBe("https://example.com");
  });

  it("uses http for localhost", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    const req = { headers: mockHeaders({ host: "localhost:3000" }) } as any;
    expect(getAppBaseUrl(req)).toBe("http://localhost:3000");
  });

  it("strips trailing slash from env URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com/");
    expect(getAppBaseUrl(undefined)).toBe("https://app.example.com");
  });

  it("buildPublicPdfUrl always points to /api/public/documents/.../pdf", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    const url = buildPublicPdfUrl("doc-123", "9999999999", "abc123", undefined);
    expect(url).toBe("https://app.example.com/api/public/documents/doc-123/pdf?exp=9999999999&sig=abc123");
    expect(url).not.toContain("vercel");
    expect(url.startsWith("https://")).toBe(true);
  });

  it("never returns a bare Vercel deployment URL when canonical env is set", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://nationalglasshouse.example.com");
    vi.stubEnv("VERCEL_URL", "national-glass-house-git-branch.vercel.app");
    const req = { headers: mockHeaders({ host: "national-glass-house-git-branch.vercel.app", "x-forwarded-host": "national-glass-house-git-branch.vercel.app" }) } as any;
    const url = getAppBaseUrl(req);
    expect(url).toBe("https://nationalglasshouse.example.com");
    expect(url).not.toBe("https://national-glass-house-git-branch.vercel.app");
  });

  it("regression guard: share-link and email must use appUrl helper (not raw host headers)", () => {
    const shareLink = readFileSync(join(process.cwd(), "src/app/api/documents/[id]/share-link/route.ts"), "utf8");
    const email = readFileSync(join(process.cwd(), "src/app/api/documents/[id]/email/route.ts"), "utf8");

    // Both must import from "@/lib/appUrl"
    expect(shareLink).toContain('from "@/lib/appUrl"');
    expect(email).toContain('from "@/lib/appUrl"');

    // Neither should directly read host headers for URL building (only appUrl.ts should)
    // The helper file itself is allowed to read x-forwarded-host/host — check the two routes don't
    for (const [name, content] of [
      ["share-link", shareLink],
      ["email", email],
    ] as const) {
      const hasRawHost = /req\.headers\.get\(["'](x-forwarded-host|host|origin)["']\)/.test(content);
      // email may have had origin before, but now should use getAppBaseUrl — so raw host should be gone
      expect(hasRawHost, `${name} should not directly read host headers, use getAppBaseUrl`).toBe(false);
      expect(content, `${name} should use getAppBaseUrl/buildPublicPdfUrl`).toMatch(/getAppBaseUrl|buildPublicPdfUrl/);
    }
  });

  it("regression guard: no other API route builds URLs from host headers", () => {
    // Recursively scan src/app/api for direct host header usage outside appUrl.ts
    function walk(dir: string): string[] {
      const out: string[] = [];
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) out.push(...walk(full));
        else if (full.endsWith(".ts")) out.push(full);
      }
      return out;
    }
    const apiFiles = walk(join(process.cwd(), "src/app/api"));
    const offenders = apiFiles.filter((f) => {
      if (f.endsWith("src/lib/appUrl.ts")) return false;
      const content = readFileSync(f, "utf8");
      // Look for building absolute URLs from host — allow only if using helper
      const usesHelper = content.includes("getAppBaseUrl") || content.includes("buildPublicPdfUrl");
      const hasRawHost = /x-forwarded-host|get\(["']host["']\)/.test(content);
      return hasRawHost && !usesHelper;
    });
    expect(offenders, `These API files build URLs from host headers without using appUrl helper: ${offenders.join(", ")}`).toEqual([]);
  });
});
