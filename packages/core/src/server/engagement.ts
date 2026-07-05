import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Audience-engagement support for the sync gateway (Phase 19).
 *
 * Persistence mirrors drawings: results live under
 * `<root>/.astro-slides/engagement/<deck>.json` (gitignored) so poll votes and
 * questions survive a dev-server or window refresh. The publisher deck window
 * debounce-POSTs its state; the deck route embeds the seed at render.
 *
 * The audience role filter is the server-side half of scoping: audience phones may
 * vote, ask, and react — never navigate or draw. The gateway stays otherwise
 * payload-agnostic; this is the one place it inspects a message.
 */

const OUT_DIR = ".astro-slides";
const ENGAGEMENT = "engagement";

/** Actions an `?role=audience` WebSocket client may send. Everything else is dropped. */
export const AUDIENCE_ALLOWED_ACTIONS = new Set(["vote", "qa/ask", "react", "hello"]);

/** True when a raw wire message is permitted from an audience-role client. */
export function audienceAllowed(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw) as { type?: unknown };
    return typeof parsed.type === "string" && AUDIENCE_ALLOWED_ACTIONS.has(parsed.type);
  } catch {
    return false;
  }
}

export interface EngagementSnapshot {
  polls: Record<string, { votes: Record<string, number>; closed?: boolean }>;
  questions: { id: string; text: string; at: number; status: string }[];
}

const EMPTY: EngagementSnapshot = { polls: {}, questions: [] };

function sanitize(deck: string): string {
  return deck.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function engagementFile(root: string, deck: string): string {
  return join(root, OUT_DIR, ENGAGEMENT, `${sanitize(deck)}.json`);
}

/** Persist a deck's engagement snapshot (whole-file write, like drawings). */
export function saveEngagement(root: string, deck: string, snap: EngagementSnapshot): boolean {
  try {
    const file = engagementFile(root, deck);
    mkdirSync(join(root, OUT_DIR, ENGAGEMENT), { recursive: true });
    writeFileSync(file, JSON.stringify(snap), "utf8");
    return true;
  } catch {
    return false;
  }
}

/** Load a deck's persisted engagement snapshot (empty when none). */
export function loadEngagement(root: string, deck: string): EngagementSnapshot {
  const file = engagementFile(root, deck);
  if (!existsSync(file)) return EMPTY;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<EngagementSnapshot>;
    return {
      polls: parsed.polls ?? {},
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
    };
  } catch {
    return EMPTY;
  }
}
