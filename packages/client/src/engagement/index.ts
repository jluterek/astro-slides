import { renderSVG } from "uqr";
import type { SyncStore } from "../sync/store.js";
import { type ActivePoll, type QaQuestion, tallyVotes } from "../sync/types.js";
import { gatewayHttpOrigin } from "../sync/websocket.js";

/**
 * Audience engagement runtime (Phase 19): `<Poll>` live tallies, the floating
 * reactions overlay, and the moderated-question banner. Vanilla modules in the
 * drawing/laser style — the deck window owns them; follow-only previews and embeds
 * stay passive. Everything drives off the sync store: votes/questions/reactions
 * arrive as idempotent actions from audience phones via the gateway.
 */

export interface EngagementOptions {
  sync: SyncStore;
  deckId: string;
  /** Follow-only preview iframe (`?as-preview`) — render, never dispatch. */
  preview: boolean;
  /** Embed mode (`?embed=1`) — fully inert: no overlay, no dispatch. */
  embedded: boolean;
  /** Gateway WS path when running under `dev --remote`, else undefined. */
  gatewayPath?: string | undefined;
  /** LAN address phones can reach (dev --remote; issue #60) — swapped into the
   * audience-join URL when the page itself was opened via localhost. */
  publicHost?: string | undefined;
}

/** Max simultaneously-floating reaction sprites — excess reactions are dropped. */
const MAX_SPRITES = 24;
/** Debounce for persisting engagement state to the gateway (ms). */
const PERSIST_DEBOUNCE = 800;

interface PollElement {
  el: HTMLElement;
  poll: ActivePoll;
  bars: HTMLElement[];
  counts: HTMLElement[];
  total: HTMLElement | null;
  closeBtn: HTMLButtonElement | null;
  resetBtn: HTMLButtonElement | null;
}

function parsePoll(el: HTMLElement): ActivePoll | null {
  const id = el.dataset.pollId;
  const question = el.dataset.pollQuestion ?? "";
  let options: string[] = [];
  try {
    options = JSON.parse(el.dataset.pollOptions ?? "[]") as string[];
  } catch {
    return null;
  }
  if (!id || options.length === 0) return null;
  return { id, question, options };
}

/** Boot every `<Poll>` under `root`: publish `poll/open` when a poll's slide becomes
 * present (publisher windows only) and render live tallies from the store. */
function initPolls(root: HTMLElement, opts: EngagementOptions): () => void {
  const els = Array.from(root.querySelectorAll<HTMLElement>(".as-poll"));
  const polls: PollElement[] = [];
  for (const el of els) {
    const poll = parsePoll(el);
    if (!poll) continue;
    polls.push({
      el,
      poll,
      bars: Array.from(el.querySelectorAll<HTMLElement>(".as-poll-bar-fill")),
      counts: Array.from(el.querySelectorAll<HTMLElement>(".as-poll-count")),
      total: el.querySelector<HTMLElement>(".as-poll-total"),
      closeBtn: el.querySelector<HTMLButtonElement>(".as-poll-close"),
      resetBtn: el.querySelector<HTMLButtonElement>(".as-poll-reset"),
    });
  }
  if (polls.length === 0) return () => {};

  const isPresent = (el: HTMLElement): boolean =>
    el.closest(".as-slide")?.classList.contains("present") ?? false;

  const render = (): void => {
    const state = opts.sync.state.get();
    for (const p of polls) {
      const pollState = state.polls[p.poll.id];
      const counts = tallyVotes(pollState, p.poll.options.length);
      const total = counts.reduce((a, b) => a + b, 0);
      counts.forEach((count, i) => {
        const bar = p.bars[i];
        if (bar) bar.style.width = total > 0 ? `${Math.round((count / total) * 100)}%` : "0%";
        const label = p.counts[i];
        if (label) label.textContent = String(count);
      });
      if (p.total) p.total.textContent = `${total} vote${total === 1 ? "" : "s"}`;
      p.el.classList.toggle("as-poll-closed", !!pollState?.closed);
      if (p.closeBtn) p.closeBtn.hidden = !!pollState?.closed || opts.preview || opts.embedded;
      // Per-poll reset (issue #71): publisher-only, and only once there is
      // something to wipe (votes or a closed flag).
      if (p.resetBtn)
        p.resetBtn.hidden = (total === 0 && !pollState?.closed) || opts.preview || opts.embedded;
    }
  };

  // Publisher windows open the poll for the audience when its slide is present.
  const publishActive = (): void => {
    if (opts.preview || opts.embedded) return;
    const state = opts.sync.state.get();
    for (const p of polls) {
      const present = isPresent(p.el);
      const pollState = state.polls[p.poll.id];
      if (present && !pollState?.closed && state.activePoll?.id !== p.poll.id) {
        opts.sync.dispatch({ type: "poll/open", poll: p.poll });
      } else if (!present && state.activePoll?.id === p.poll.id) {
        opts.sync.dispatch({ type: "poll/close", id: p.poll.id });
      }
    }
  };

  for (const p of polls) {
    p.closeBtn?.addEventListener("click", () => {
      opts.sync.dispatch({ type: "poll/close", id: p.poll.id });
    });
    p.resetBtn?.addEventListener("click", () => {
      opts.sync.dispatch({ type: "poll/reset", id: p.poll.id });
    });
  }

  const unsubState = opts.sync.state.subscribe(() => {
    render();
    publishActive();
  });
  render();
  publishActive();
  return unsubState;
}

/** Floating reactions overlay — observes `react` actions; caps concurrent sprites. */
function initReactions(root: HTMLElement, opts: EngagementOptions): () => void {
  if (opts.embedded || opts.preview) return () => {};
  const layer = document.createElement("div");
  layer.className = "as-reactions";
  layer.setAttribute("aria-hidden", "true");
  root.append(layer);

  const unsub = opts.sync.onAction((action) => {
    if (action.type !== "react") return;
    if (layer.childElementCount >= MAX_SPRITES) return; // rate cap: drop, don't queue
    const sprite = document.createElement("span");
    sprite.className = "as-reaction";
    sprite.textContent = action.emoji.slice(0, 4);
    sprite.style.left = `${8 + Math.random() * 84}%`;
    sprite.style.setProperty("--drift", `${(Math.random() - 0.5) * 120}px`);
    layer.append(sprite);
    sprite.addEventListener("animationend", () => sprite.remove());
    // Belt & suspenders: remove even if the animation never fires (reduced motion).
    setTimeout(() => sprite.remove(), 4000);
  });
  return () => {
    unsub();
    layer.remove();
  };
}

/** Banner showing the currently-moderated ("shown") audience question. */
function initQaBanner(root: HTMLElement, opts: EngagementOptions): () => void {
  if (opts.embedded) return () => {};
  const banner = document.createElement("div");
  banner.className = "as-qa-banner";
  banner.hidden = true;
  root.append(banner);

  const unsub = opts.sync.state.subscribe((state) => {
    const shown = state.questions.find((q: QaQuestion) => q.status === "shown");
    banner.hidden = !shown;
    if (shown) banner.textContent = shown.text;
  });
  return () => {
    unsub();
    banner.remove();
  };
}

/** Debounce-persist polls + questions to the gateway so results survive a refresh. */
function initPersistence(opts: EngagementOptions): () => void {
  if (!opts.gatewayPath || opts.preview || opts.embedded) return () => {};
  let timer: ReturnType<typeof setTimeout> | null = null;
  let last = "";
  const unsub = opts.sync.state.subscribe((state) => {
    const snap = JSON.stringify({
      deck: opts.deckId,
      polls: state.polls,
      questions: state.questions,
    });
    if (snap === last) return;
    last = snap;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void fetch(`${gatewayHttpOrigin(opts.gatewayPath ?? "")}/__astro-slides/engagement`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: snap,
      }).catch(() => {});
    }, PERSIST_DEBOUNCE);
  });
  return () => {
    if (timer) clearTimeout(timer);
    unsub();
  };
}

/** The URL audience phones should open, or null when no gateway is live. A same-origin
 * dev gateway inherits the page's origin — but when the presenter opened the deck via
 * localhost, phones can't follow, so a known LAN `publicHost` replaces a loopback host
 * (issue #60). External gateways (issue #62) carry their own host. */
export function audienceJoinUrl(
  gatewayPath: string | undefined,
  deckId: string,
  publicHost?: string | undefined,
  loc: Pick<Location, "protocol" | "hostname" | "port" | "host"> = location,
): string | null {
  if (!gatewayPath) return null;
  const query = `deck=${encodeURIComponent(deckId)}`;
  const remote = gatewayHttpOrigin(gatewayPath);
  if (remote) return `${remote}/audience?${query}`;
  let host = loc.host;
  if (publicHost && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(loc.hostname)) {
    host = loc.port ? `${publicHost}:${loc.port}` : publicHost;
  }
  return `${loc.protocol}//${host}/audience?${query}`;
}

/** Full-screen audience-join QR overlay (issue #60). Driven by the shared `qr` flag so
 * the presenter view can raise it on the deck window the room is watching; the deck's
 * `A` shortcut toggles the same flag. Inert in embeds and follow-only previews. */
function initQrOverlay(root: HTMLElement, opts: EngagementOptions): () => void {
  if (opts.embedded || opts.preview) return () => {};
  const url = audienceJoinUrl(opts.gatewayPath, opts.deckId, opts.publicHost);
  if (!url) return () => {};

  let overlay: HTMLElement | null = null;
  const ensure = (): HTMLElement => {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.className = "as-qr";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Join the audience");
    overlay.hidden = true;

    const panel = document.createElement("div");
    panel.className = "as-qr-panel";
    const heading = document.createElement("h2");
    heading.textContent = "Join in";
    const code = document.createElement("div");
    code.className = "as-qr-code";
    code.innerHTML = renderSVG(url, { ecc: "M", border: 2 });
    const link = document.createElement("p");
    link.className = "as-qr-url";
    link.textContent = url.replace(/^https?:\/\//, "");
    const hint = document.createElement("p");
    hint.className = "as-qr-hint";
    hint.textContent = "Scan to vote, ask, and react — A or Esc to close";
    panel.append(heading, code, link, hint);
    overlay.append(panel);
    // Click anywhere dismisses (shared state, so every window closes together).
    overlay.addEventListener("click", () => opts.sync.dispatch({ type: "qr", on: false }));
    root.append(overlay);
    return overlay;
  };

  const unsub = opts.sync.state.subscribe((state) => {
    if (state.qr) ensure().hidden = false;
    else if (overlay) overlay.hidden = true;
  });
  return () => {
    unsub();
    overlay?.remove();
  };
}

/** Boot the full engagement runtime; returns a cleanup. */
export function initEngagement(root: HTMLElement, opts: EngagementOptions): () => void {
  const stops = [
    initPolls(root, opts),
    initReactions(root, opts),
    initQaBanner(root, opts),
    initPersistence(opts),
    initQrOverlay(root, opts),
  ];
  return () => {
    for (const stop of stops) stop();
  };
}
