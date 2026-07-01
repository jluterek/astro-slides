import { tinykeys } from "tinykeys";

/** The navigation intents the input layers dispatch. */
export interface NavActions {
  next(): void;
  prev(): void;
  first(): void;
  last(): void;
  toggleOverview(): void;
  toggleHelp(): void;
  escape(): void;
}

/** The keyboard shortcut map, shared with the on-screen help overlay. */
export const SHORTCUTS: ReadonlyArray<{ keys: string; label: string }> = [
  { keys: "→ / ↓ / Space", label: "Next slide or step" },
  { keys: "← / ↑", label: "Previous slide or step" },
  { keys: "Home / End", label: "First / last slide" },
  { keys: "O", label: "Toggle overview" },
  { keys: "?", label: "Toggle this help" },
  { keys: "Esc", label: "Close overview / help" },
];

/**
 * Bind navigation shortcuts via tinykeys. `Space` and letter keys match on
 * `event.code`; `Shift+?` is required because `?` is a shifted key on most
 * layouts. Returns an unbind function.
 */
export function bindKeyboard(target: Window | HTMLElement, actions: NavActions): () => void {
  return tinykeys(target as Window, {
    ArrowRight: (e) => run(e, actions.next),
    ArrowDown: (e) => run(e, actions.next),
    Space: (e) => run(e, actions.next),
    PageDown: (e) => run(e, actions.next),
    ArrowLeft: (e) => run(e, actions.prev),
    ArrowUp: (e) => run(e, actions.prev),
    PageUp: (e) => run(e, actions.prev),
    Home: (e) => run(e, actions.first),
    End: (e) => run(e, actions.last),
    o: (e) => run(e, actions.toggleOverview),
    "Shift+?": (e) => run(e, actions.toggleHelp),
    Escape: (e) => run(e, actions.escape),
  });
}

function run(event: KeyboardEvent, action: () => void): void {
  // Don't hijack keys while the user is typing in an input/textarea/contenteditable.
  const t = event.target as HTMLElement | null;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  event.preventDefault();
  action();
}
