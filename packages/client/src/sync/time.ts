/**
 * Parse a `duration:` headmatter value to milliseconds (Phase 10). Accepts:
 *   "30min" / "30m"      → 30 minutes
 *   "90s" / "45sec"      → seconds
 *   "1h" / "2hr"         → hours
 *   "1:05"               → 1 min 5 s (m:ss)
 *   "2:30:00"            → 2 h 30 m 0 s (h:mm:ss)
 *   30                    → bare number = minutes (Slidev convention)
 * Returns null when it can't parse.
 */
export function parseTimeString(input: string | number | null | undefined): number | null {
  if (input == null) return null;
  if (typeof input === "number") return input > 0 ? input * 60_000 : null;

  const s = input.trim().toLowerCase();
  if (s === "") return null;

  if (s.includes(":")) {
    const parts = s.split(":").map((p) => Number(p));
    if (parts.some((n) => !Number.isFinite(n))) return null;
    let ms = 0;
    if (parts.length === 2) ms = (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
    else if (parts.length === 3)
      ms = (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
    else return null;
    return ms * 1000;
  }

  const m = s.match(/^([\d.]+)\s*(ms|s|sec|secs|m|min|mins|h|hr|hrs)?$/);
  if (!m) return null;
  const value = Number(m[1]);
  if (!Number.isFinite(value)) return null;
  switch (m[2]) {
    case "ms":
      return value;
    case "s":
    case "sec":
    case "secs":
      return value * 1000;
    case "h":
    case "hr":
    case "hrs":
      return value * 3_600_000;
    default:
      // "m"/"min"/unitless → minutes
      return value * 60_000;
  }
}

/** Format a millisecond duration as `H:MM:SS` (or `M:SS` under an hour). */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
