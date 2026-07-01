import { atom, type ReadableAtom } from "nanostores";
import { createSyncChannel, type SyncChannel } from "./channel.js";
import { reduce, type SharedState, type SyncAction } from "./types.js";

/**
 * Nanostore-backed shared state wired to a `SyncChannel` (Phase 10). Local `dispatch`
 * reduces and broadcasts; remote actions reduce without re-broadcasting (no echo loop).
 * A join-time `hello`/`state` handshake lets a late window adopt the current state.
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
  /** Injected channel (tests). */
  channel?: SyncChannel;
}

export function createSyncStore(
  deckId: string,
  initial: SharedState,
  options: SyncStoreOptions = {},
): SyncStore {
  const publish = options.publish ?? true;
  const channel = options.channel ?? createSyncChannel(deckId, options.suffix);
  const state = atom<SharedState>(initial);

  const unsubscribe = channel.subscribe((action) => {
    if (action.type === "hello") {
      if (publish) channel.post({ type: "state", state: state.get() });
      return;
    }
    state.set(reduce(state.get(), action));
  });

  function dispatch(action: SyncAction): void {
    state.set(reduce(state.get(), action));
    channel.post(action);
  }

  // Ask peers for the current state on join.
  channel.post({ type: "hello" });

  return {
    state,
    dispatch,
    close: () => {
      unsubscribe();
      channel.close();
    },
  };
}
