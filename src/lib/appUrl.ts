/**
 * Centralized App URL helper — single source of truth for generating
 * absolute URLs to this application.
 *
 * Share links, emails, and any feature that produces a link a recipient
 * will open outside the current session MUST use `getAppBaseUrl()` rather
 * than reading request headers directly. This prevents regressions where
 * a feature works in local/preview but generates a `*.vercel.app` preview
 * URL or `localhost` URL in production.
 *
 * Priority (highest first):
 *  1. Explicit canonical env vars: NEXT_PUBLIC_APP_URL, APP_URL, SITE_URL
 *  2. Vercel production URL: VERCEL_PROJECT_PRODUCTION_URL (without scheme)
 *  3. Vercel deployment URL: VERCEL_URL (fallback, may be preview)
 *  4. Request headers: origin, x-forwarded-host/host + x-forwarded-proto
 *  5. Hardcoded localhost fallback
 */

function normalizeBaseUrl(raw: string): string {
  let url = raw.trim();
  if (!url) return "";
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url.replace(/\/$/, "");
}

function headerGet(headers: Headers | undefined, name: string): string | null {
  if (!headers) return null;
  try {
    return headers.get(name);
  } catch {
    return null;
  }
}

export function getAppBaseUrl(req?: {
  headers: Headers;
  nextUrl?: URL;
}): string {
  // 1. Explicit canonical URLs
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (explicit) {
    return normalizeBaseUrl(explicit);
  }

  // 2. Vercel deployment URL (may be preview — use only if no production URL)
  const vercelUrl =
    process.env.VERCEL_URL?.trim() || process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  if (vercelUrl) {
    return normalizeBaseUrl(vercelUrl);
  }

  // 3. Request-derived URL (local dev, preview without env, or fallback)
  if (req?.headers) {
    const headers = req.headers as Headers;

    // Prefer Origin header (set by browsers on POST/fetch) — most accurate
    const origin = headerGet(headers, "origin");
    if (origin) {
      try {
        const u = new URL(origin);
        return `${u.protocol}//${u.host}`.replace(/\/$/, "");
      } catch {
        // fall through
      }
    }

    const forwardedHost = headerGet(headers, "x-forwarded-host");
    const hostHeader = headerGet(headers, "host");
    // x-forwarded-host may be "host1, host2" — take first (original)
    const rawHost = (forwardedHost || hostHeader || "").split(",")[0].trim();
    if (rawHost) {
      const forwardedProto = headerGet(headers, "x-forwarded-proto");
      const proto =
        forwardedProto?.split(",")[0].trim() ||
        (rawHost.startsWith("localhost") || rawHost.startsWith("127.") ? "http" : "https");
      return `${proto}://${rawHost}`.replace(/\/$/, "");
    }

    // NextRequest.nextUrl fallback
    const nextUrl = (req as unknown as { nextUrl?: URL }).nextUrl;
    if (nextUrl?.host) {
      const proto = nextUrl.protocol ? nextUrl.protocol.replace(":", "") : (nextUrl.host.startsWith("localhost") ? "http" : "https");
      return `${proto}://${nextUrl.host}`.replace(/\/$/, "");
    }
  }

  // 4. Final fallback
  return "http://localhost:3000";
}

export function buildPublicPdfUrl(
  documentId: string,
  exp: string,
  sig: string,
  req?: { headers: Headers; nextUrl?: URL },
): string {
  const base = getAppBaseUrl(req as any);
  return `${base}/api/public/documents/${documentId}/pdf?exp=${exp}&sig=${sig}`;
}

export function buildDocumentPdfUrl(documentId: string, req?: { headers: Headers; nextUrl?: URL }): string {
  const base = getAppBaseUrl(req as any);
  return `${base}/api/documents/${documentId}/pdf`;
}
