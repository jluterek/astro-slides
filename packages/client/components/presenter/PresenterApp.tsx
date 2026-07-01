import { Command } from "cmdk";
import { useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { type NavState, nextState, prevState, type SlideMeta } from "../../src/navigation.js";
import { createSyncStore, type SyncStore } from "../../src/sync/store.js";
import { displayMs, initialState, type SharedState } from "../../src/sync/types.js";

/**
 * Presenter view (Phase 10). A React island that drives the deck over BroadcastChannel:
 * the current-slide iframe and the audience window follow the main channel; the
 * next-slide iframe follows a separate `preview` channel so it shows the *next* click's
 * result. Notes, a timer, blackout, keyboard shortcuts, and a command palette round it
 * out. Pane sizes persist via react-resizable-panels' `autoSaveId`.
 */

export interface PresenterSlide {
  no: number;
  title: string | null;
  notesHtml: string;
  totalClicks: number;
}

export interface PresenterProps {
  deckId: string;
  slides: PresenterSlide[];
  start: number;
  durationMs: number | null;
}

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

export default function PresenterApp({ deckId, slides, start, durationMs }: PresenterProps) {
  const navSlides = useMemo<SlideMeta[]>(
    () => slides.map((s) => ({ no: s.no, steps: s.totalClicks, title: s.title })),
    [slides],
  );

  const mainRef = useRef<SyncStore | null>(null);
  const previewRef = useRef<SyncStore | null>(null);
  const [state, setState] = useState<SharedState>(() => initialState(start, 0));
  const [paletteOpen, setPaletteOpen] = useState(false);

  // --- Sync stores (client only) --------------------------------------------
  useEffect(() => {
    const main = createSyncStore(deckId, initialState(start, 0));
    const preview = createSyncStore(deckId, initialState(start, 0), {
      suffix: "preview",
      publish: true,
    });
    mainRef.current = main;
    previewRef.current = preview;
    const unsub = main.state.subscribe(setState);
    return () => {
      unsub();
      main.close();
      preview.close();
    };
  }, [deckId, start]);

  const cur: NavState = { slide: state.no, step: state.step };
  const preview = nextState(cur, navSlides);

  // Keep the preview channel pointed at the next click whenever main state moves.
  useEffect(() => {
    previewRef.current?.dispatch({ type: "goto", no: preview.slide, step: preview.step });
  }, [preview.slide, preview.step]);

  // --- Actions --------------------------------------------------------------
  const go = (next: NavState): void => {
    mainRef.current?.dispatch({ type: "goto", no: next.slide, step: next.step });
  };
  const goNext = (): void => go(nextState(cur, navSlides));
  const goPrev = (): void => go(prevState(cur, navSlides));
  const toggleBlackout = (): void =>
    mainRef.current?.dispatch({ type: "blackout", on: !state.blackout });
  const timerStart = (): void => mainRef.current?.dispatch({ type: "timer/start", at: Date.now() });
  const timerPause = (): void => mainRef.current?.dispatch({ type: "timer/pause", at: Date.now() });
  const timerReset = (): void => mainRef.current?.dispatch({ type: "timer/reset" });
  const toggleFullscreen = (): void => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  };

  // Configure the timer mode from the deck's `duration:` once.
  useEffect(() => {
    mainRef.current?.dispatch({
      type: "timer/mode",
      mode: durationMs != null ? "countdown" : "stopwatch",
      durationMs,
    });
  }, [durationMs]);

  // --- Keyboard shortcuts ---------------------------------------------------
  useHotkeys("right,space,pagedown", goNext, [cur.slide, cur.step]);
  useHotkeys("left,pageup", goPrev, [cur.slide, cur.step]);
  useHotkeys("b", toggleBlackout, [state.blackout]);
  useHotkeys("f", toggleFullscreen, []);
  useHotkeys("k,/", (e) => {
    e.preventDefault();
    setPaletteOpen((v) => !v);
  });
  useHotkeys("escape", () => setPaletteOpen(false), { enableOnFormTags: true });

  const currentSlide = slides.find((s) => s.no === state.no) ?? slides[0];
  const nextSlide = slides.find((s) => s.no === preview.slide);
  const timer = useNow(state.timer.startedAt != null);
  const timeText = formatClock(displayMs(state.timer, timer));
  const base = `/${encodeURIComponent(deckId)}`;

  return (
    <div className="as-presenter">
      <PanelGroup direction="horizontal" autoSaveId={`as-presenter:${deckId}`}>
        <Panel defaultSize={62} minSize={30}>
          <section className="as-pane as-pane-current">
            <header className="as-pane-label">
              Current — {state.no} / {slides.length}
              {currentSlide?.title ? `: ${currentSlide.title}` : ""}
            </header>
            <iframe className="as-pane-frame" title="Current slide" src={`${base}/${start}`} />
          </section>
        </Panel>
        <PanelResizeHandle className="as-resize" />
        <Panel defaultSize={38} minSize={20}>
          <PanelGroup direction="vertical" autoSaveId={`as-presenter-right:${deckId}`}>
            <Panel defaultSize={45} minSize={20}>
              <section className="as-pane as-pane-next">
                <header className="as-pane-label">
                  Next{nextSlide?.title ? `: ${nextSlide.title}` : ""}
                </header>
                <iframe
                  className="as-pane-frame"
                  title="Next slide"
                  src={`${base}/${start}?as-preview`}
                />
              </section>
            </Panel>
            <PanelResizeHandle className="as-resize" />
            <Panel defaultSize={55} minSize={20}>
              <section className="as-pane as-pane-notes">
                <div className="as-presenter-bar">
                  <button type="button" onClick={goPrev} aria-label="Previous">
                    ‹
                  </button>
                  <button type="button" onClick={goNext} aria-label="Next">
                    ›
                  </button>
                  <span className={`as-timer${timerRunning(state) ? " is-running" : ""}`}>
                    {timeText}
                  </span>
                  <button type="button" onClick={timerRunning(state) ? timerPause : timerStart}>
                    {timerRunning(state) ? "Pause" : "Start"}
                  </button>
                  <button type="button" onClick={timerReset}>
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={toggleBlackout}
                    aria-pressed={state.blackout}
                    className={state.blackout ? "is-active" : ""}
                  >
                    Black
                  </button>
                </div>
                <Notes html={currentSlide?.notesHtml ?? ""} step={state.step} />
              </section>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>

      {paletteOpen && (
        <SlidePalette
          slides={slides}
          onPick={(no) => {
            go({ slide: no, step: 0 });
            setPaletteOpen(false);
          }}
          onClose={() => setPaletteOpen(false)}
        />
      )}
    </div>
  );
}

function timerRunning(state: SharedState): boolean {
  return state.timer.startedAt != null;
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Notes pane — highlights the marker for the current click step. */
function Notes({ html, step }: { html: string; step: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    for (const el of root.querySelectorAll<HTMLElement>(".as-note-click")) {
      el.classList.toggle("is-current", Number(el.dataset.click) === step);
    }
  }, [step, html]);
  return (
    <div
      ref={ref}
      className="as-notes"
      // Notes HTML is rendered from the author's own deck at build time.
      dangerouslySetInnerHTML={{ __html: html || "<em>No notes.</em>" }}
    />
  );
}

/** cmdk command palette for jump-to-slide. */
function SlidePalette({
  slides,
  onPick,
  onClose,
}: {
  slides: PresenterSlide[];
  onPick: (no: number) => void;
  onClose: () => void;
}) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop click-to-dismiss; Escape also closes.
    <div className="as-palette-backdrop" onClick={onClose} role="presentation">
      <Command
        className="as-palette"
        onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}
        label="Go to slide"
      >
        <Command.Input autoFocus placeholder="Jump to slide…" />
        <Command.List>
          <Command.Empty>No slides found.</Command.Empty>
          {slides.map((s) => (
            <Command.Item
              key={s.no}
              value={`${s.no} ${s.title ?? ""}`}
              onSelect={() => onPick(s.no)}
            >
              <span className="as-palette-no">{s.no}</span>
              {s.title ?? <em>Untitled</em>}
            </Command.Item>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}
