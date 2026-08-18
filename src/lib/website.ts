export const DEFAULT_WEBSITE_URL = "https://nationalglasshousevapi.github.io/website/";

// Client-safe website URL. NEXT_PUBLIC_ vars are inlined by Next.js at build
// time, so this works in both server and client components.
export function publicWebsiteUrl(): string {
  return process.env.NEXT_PUBLIC_COMPANY_WEBSITE?.trim() || DEFAULT_WEBSITE_URL;
}
