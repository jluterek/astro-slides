import { atom, type ReadableAtom } from "nanostores";
import { createSyncChannel, type SyncChannel } from "./channel.js";
import { reduce, type SharedState, type SyncAction } from "./types.js";

/**
 * Nanostore-backed shared state wired to one or more `SyncChannel`s (Phase 10, extended
 * Phase 11). Local `dispatch` reduces and broadcasts to every channel; remote actions
 * reduce without re-broadcasting (no echo loop). A join-time `hello`/`state` handshake
 * lets a late window adopt the current state.
 *
 * Multiple channels let a window bridge transports — a same-origin `BroadcastChannel`
 * plus a WebSocket to the sync gateway (Phase 11). A remote action arriving on one
 * channel is applied but NOT forwarded to the others; every peer holds its own channels
 * to the gateway, so it hears the action directly, and all actions reduce idempotently.
 */
export interface SyncStore {
  state: ReadableAtom<SharedState>;
  dispatch(action: SyncAction): void;
  close(): void;
}

export interface SyncStoreOptions {
  /** Channel suffix (`preview` for the next-slide preview). */
  suffix?: string;
  /** Whether this window answers `hello` with a snapshot (false for follow-only). */
  publish?: boolean;
  /** Injected primary channel (tests). Replaces the default BroadcastChannel. */
  channel?: SyncChannel;
  /** Extra channels to fan out to (e.g. a WebSocket to the sync gateway). */
  transports?: SyncChannel[];
}

export function createSyncStore(
  deckId: string,
  initial: SharedState,
  options: SyncStoreOptions = {},
): SyncStore {
  const publish = options.publish ?? true;
  const primary = options.channel ?? createSyncChannel(deckId, options.suffix);
  const channels: SyncChannel[] = [primary, ...(options.transports ?? [])];
  const state = atom<SharedState>(initial);

  const post = (action: SyncAction): void => {
    for (const channel of channels) channel.post(action);
  };

  const unsubscribes = channels.map((channel) =>
    channel.subscribe((action) => {
      if (action.type === "hello") {
        // Answer only on the channel the hello arrived on, to the asking peer.
        if (publish) channel.post({ type: "state", state: state.get() });
        return;
      }
      state.set(reduce(state.get(), action));
    }),
  );

  function dispatch(action: SyncAction): void {
    state.set(reduce(state.get(), action));
    post(action);
  }

  // Ask peers for the current state on join.
  post({ type: "hello" });

  return {
    state,
    dispatch,
    close: () => {
      for (const unsub of unsubscribes) unsub();
      for (const channel of channels) channel.close();
    },
  };
}
