import type { SlideSlots } from "@astro-slides/types";

/**
 * Slot sugar. `::name::` on its own line opens a named slot region; content before the
 * first marker is the `default` slot. Layouts (Phase 05) consume these as named slots.
 * Fence-aware so a `::name::` inside a code block is left untouched.
 */
const SLOT_MARK = /^::\s*([\w-]+)\s*::\s*$/;
const FENCE = /^(\s{0,3})(`{3,}|~{3,})/;
const FENCE_ONLY = /^\s*(`{3,}|~{3,})\s*$/;

export function parseSlots(body: string): SlideSlots {
  const lines = body.split("\n");
  const order: string[] = ["default"];
  const buffers: Record<string, string[]> = { default: [] };
  let current = "default";
  let fence: string | null = null;

  for (const line of lines) {
    if (fence) {
      if (FENCE_ONLY.test(line) && line.trimStart().startsWith(fence)) fence = null;
      (buffers[current] as string[]).push(line);
      continue;
    }
    const f = FENCE.exec(line);
    if (f) {
      fence = (f[2] as string)[0] as string;
      (buffers[current] as string[]).push(line);
      continue;
    }
    const m = SLOT_MARK.exec(line);
    if (m) {
      current = m[1] as string;
      if (!buffers[current]) {
        buffers[current] = [];
        order.push(current);
      }
      continue;
    }
    (buffers[current] as string[]).push(line);
  }

  const slots: SlideSlots = { default: "" };
  for (const name of order) {
    slots[name] = (buffers[name] as string[]).join("\n").trim();
  }
  return slots;
}

/** True if the body contains any `::name::` slot markers (outside code fences). */
export function hasSlots(body: string): boolean {
  const slots = parseSlots(body);
  return Object.keys(slots).length > 1;
}
