export type { Announcer } from "./a11y.js";
export { createAnnouncer } from "./a11y.js";
export { bindCopyButtons, initMagicMove } from "./code/index.js";
export { initMermaid } from "./diagrams/index.js";
export {
  type DrawingHandle,
  type DrawingOptions,
  initDrawing,
  initLaser,
  type LaserHandle,
  normalizePointer,
} from "./drawing/index.js";
export { initFitText } from "./fit-text.js";
export { bindKeyboard, type NavActions, SHORTCUTS } from "./keyboard.js";
export { fmString, type LayoutProps } from "./layout-types.js";
export {
  DeckController,
  type DeckControllerOptions,
  gotoState,
  type NavState,
  nextState,
  prevState,
  type SlideMeta,
} from "./navigation.js";
export { cssVars, type FlexBlockVariant, flexBlockClass } from "./primitives.js";
export {
  extensionForMime,
  type IsTypeSupported,
  listDevices,
  needsWebmDurationFix,
  pickVideoMime,
  type RecordedClip,
  type RecordingKind,
  type RecordingSession,
  type StartRecordingOptions,
  startRecording,
  VIDEO_MIME_PREFERENCES,
} from "./recording/index.js";
export { type DeckHandle, initAllDecks, initDeck } from "./runtime.js";
export { applyScale, computeScale, type Size } from "./scaling.js";
export { applySlideStates, type SlideState, slideState } from "./state-machine.js";
export { createDeckStore, type DeckStore, type DeckStoreInit } from "./store.js";
export {
  channelName,
  createSyncChannel,
  createSyncStore,
  createWebSocketTransport,
  displayMs,
  drawingKey,
  elapsedMs,
  formatDuration,
  gatewayUrl,
  initialState,
  initialTimer,
  type LaserPoint,
  parseTimeString,
  reduce,
  type SharedState,
  type SyncAction,
  type SyncChannel,
  type SyncStore,
  type TimerMode,
  type TimerState,
  type WebSocketLike,
} from "./sync/index.js";
export { bindTouch, type TouchOptions } from "./touch.js";
export {
  createSlideTransition,
  flipMorph,
  type MorphPair,
  matchMorphs,
  prefersReducedMotion,
  type SlideTransition,
  supportsViewTransitions,
  type TransitionContext,
  type TransitionOptions,
} from "./transitions/index.js";
export { bindOverviewClicks, ensureHelpOverlay } from "./ui.js";
export { basePath, buildLocation, type DeckLocation, parseLocation } from "./url.js";
