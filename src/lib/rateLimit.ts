const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
const MAX_TRACKED_IPS = 10000;

type Entry = { timestamps: number[] };

const failures = new Map<string, Entry>();

export function isRateLimited(key: string): boolean {
  const entry = failures.get(key);
  if (!entry) return false;
  prune(entry);
  return entry.timestamps.length >= MAX_FAILURES;
}

export function recordFailure(key: string): void {
  let entry = failures.get(key);
  if (!entry) {
    if (failures.size >= MAX_TRACKED_IPS) {
      const oldest = failures.keys().next().value;
      if (oldest !== undefined) failures.delete(oldest);
    }
    entry = { timestamps: [] };
    failures.set(key, entry);
  }
  prune(entry);
  entry.timestamps.push(Date.now());
}

export function clearFailures(key: string): void {
  failures.delete(key);
}

function prune(entry: Entry): void {
  const cutoff = Date.now() - WINDOW_MS;
  while (entry.timestamps.length > 0 && entry.timestamps[0] < cutoff) {
    entry.timestamps.shift();
  }
}

export function clientIpFrom(req: { headers: { get(name: string): string | null } }): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((ip) => ip.trim()).filter(Boolean);
    if (ips.length > 0) return ips[ips.length - 1];
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
