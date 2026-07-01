import type { SyncAction } from "./types.js";

/**
 * A `BroadcastChannel` wrapper for same-origin presenter sync (ADR-0010). The channel is
 * keyed `astro-slides:<deck>[:<suffix>]` — a `preview` suffix isolates the next-slide
 * preview from the main channel. Degrades to a no-op where BroadcastChannel is absent
 * (some embedded webviews), so callers never need to feature-check.
 */
export interface SyncChannel {
  post(action: SyncAction): void;
  subscribe(cb: (action: SyncAction) => void): () => void;
  close(): void;
}

export function channelName(deckId: string, suffix = ""): string {
  return `astro-slides:${deckId}${suffix ? `:${suffix}` : ""}`;
}

export function createSyncChannel(deckId: string, suffix = ""): SyncChannel {
  if (typeof BroadcastChannel === "undefined") {
    return { post: () => {}, subscribe: () => () => {}, close: () => {} };
  }
  const bc = new BroadcastChannel(channelName(deckId, suffix));
  const listeners = new Set<(action: SyncAction) => void>();
  bc.onmessage = (event: MessageEvent<SyncAction>) => {
    for (const listener of listeners) listener(event.data);
  };
  return {
    post: (action) => bc.postMessage(action),
    subscribe: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    close: () => {
      listeners.clear();
      bc.close();
    },
  };
}
