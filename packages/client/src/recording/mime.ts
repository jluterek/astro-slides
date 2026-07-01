/**
 * MediaRecorder MIME negotiation (Phase 11). Browser codec support varies wildly, so we
 * probe a preference list at runtime rather than assuming a format. Pure + injectable so
 * it's unit-tested without a real `MediaRecorder`.
 *
 * Preference order: H.264-in-WebM (widely re-encodable, small) → VP9 → VP8 → bare WebM →
 * MP4 (Safari). The first supported entry wins; `null` means the browser supports none.
 */

export const VIDEO_MIME_PREFERENCES = [
  "video/webm;codecs=h264",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp8",
  "video/webm",
  "video/mp4",
] as const;

/** Type of `MediaRecorder.isTypeSupported`; injected in tests. */
export type IsTypeSupported = (mime: string) => boolean;

function defaultIsSupported(): IsTypeSupported {
  if (typeof MediaRecorder !== "undefined" && typeof MediaRecorder.isTypeSupported === "function") {
    return (mime) => MediaRecorder.isTypeSupported(mime);
  }
  return () => false;
}

/** First supported MIME from `candidates`, or null if none are supported. */
export function pickVideoMime(
  candidates: readonly string[] = VIDEO_MIME_PREFERENCES,
  isSupported: IsTypeSupported = defaultIsSupported(),
): string | null {
  for (const mime of candidates) {
    if (isSupported(mime)) return mime;
  }
  return null;
}

/** File extension for a negotiated MIME (`webm` unless it's an MP4/MKV container). */
export function extensionForMime(mime: string | null): string {
  if (!mime) return "webm";
  if (mime.startsWith("video/mp4")) return "mp4";
  if (mime.startsWith("video/x-matroska")) return "mkv";
  return "webm";
}

/** Whether a negotiated MIME needs the WebM duration-metadata repair pass. */
export function needsWebmDurationFix(mime: string | null): boolean {
  return !mime || mime.startsWith("video/webm");
}
