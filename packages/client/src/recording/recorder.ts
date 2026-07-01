import { extensionForMime, needsWebmDurationFix, pickVideoMime } from "./mime.js";

/**
 * In-browser recording (Phase 11). Captures the screen (`getDisplayMedia`) and/or the
 * camera + mic (`getUserMedia`) and records each as its own clip. `recordrtc` and the
 * WebM duration fixer are **lazy-imported only when recording starts**, so the ~100 KB of
 * recorder code never loads for a viewer who never records.
 *
 * Chrome's `MediaRecorder` writes an "unknown" WebM duration; on stop we repair it with
 * the measured elapsed time so the file is seekable in players.
 */

export type RecordingKind = "screen" | "camera";

export interface RecordedClip {
  kind: RecordingKind;
  blob: Blob;
  mime: string;
  extension: string;
  /** Object URL for download/preview; revoke when done. */
  url: string;
}

export interface StartRecordingOptions {
  screen?: boolean;
  camera?: boolean;
  /** Capture system/tab audio with the screen share (browser-permitting). */
  screenAudio?: boolean;
  cameraDeviceId?: string;
  micDeviceId?: string;
  mimeCandidates?: readonly string[];
}

export interface RecordingSession {
  streams: MediaStream[];
  /** Stop every recorder, repair WebM durations, and return the clips. */
  stop(): Promise<RecordedClip[]>;
}

/** Minimal RecordRTC promise-handler shape we depend on (keeps the import lazy). */
interface PromiseHandler {
  startRecording(): Promise<void>;
  stopRecording(): Promise<unknown>;
  getBlob(): Promise<Blob>;
}

interface Track {
  kind: RecordingKind;
  stream: MediaStream;
  handler: PromiseHandler;
}

function mediaDevices(): MediaDevices | null {
  return typeof navigator !== "undefined" && navigator.mediaDevices ? navigator.mediaDevices : null;
}

/** List available input devices, so the UI can offer a camera/mic picker. */
export async function listDevices(): Promise<{
  cameras: MediaDeviceInfo[];
  mics: MediaDeviceInfo[];
}> {
  const md = mediaDevices();
  if (!md?.enumerateDevices) return { cameras: [], mics: [] };
  const devices = await md.enumerateDevices();
  return {
    cameras: devices.filter((d) => d.kind === "videoinput"),
    mics: devices.filter((d) => d.kind === "audioinput"),
  };
}

async function captureScreen(withAudio: boolean): Promise<MediaStream> {
  const md = mediaDevices();
  if (!md?.getDisplayMedia) throw new Error("getDisplayMedia is not available");
  return md.getDisplayMedia({ video: true, audio: withAudio });
}

async function captureCamera(cameraId?: string, micId?: string): Promise<MediaStream> {
  const md = mediaDevices();
  if (!md?.getUserMedia) throw new Error("getUserMedia is not available");
  return md.getUserMedia({
    video: cameraId ? { deviceId: { exact: cameraId } } : true,
    audio: micId ? { deviceId: { exact: micId } } : true,
  });
}

/**
 * Begin recording. Prompts for the requested sources, negotiates a MIME type, and starts
 * a recorder per stream. Throws if no source was requested or capture is denied.
 */
export async function startRecording(
  options: StartRecordingOptions = {},
): Promise<RecordingSession> {
  const { screen = true, camera = false } = options;
  if (!screen && !camera) throw new Error("Select at least one source (screen or camera).");

  const mime = pickVideoMime(options.mimeCandidates);
  // Lazy: recorder code loads only now, on first record.
  const { RecordRTCPromisesHandler } = (await import("recordrtc")) as unknown as {
    RecordRTCPromisesHandler: new (
      stream: MediaStream,
      config: { type: "video"; mimeType?: string },
    ) => PromiseHandler;
  };

  const tracks: Track[] = [];
  const requested: [RecordingKind, () => Promise<MediaStream>][] = [];
  if (screen) requested.push(["screen", () => captureScreen(options.screenAudio ?? true)]);
  if (camera)
    requested.push(["camera", () => captureCamera(options.cameraDeviceId, options.micDeviceId)]);

  for (const [kind, capture] of requested) {
    const stream = await capture();
    const config = mime ? { type: "video" as const, mimeType: mime } : { type: "video" as const };
    const handler = new RecordRTCPromisesHandler(stream, config);
    await handler.startRecording();
    tracks.push({ kind, stream, handler });
  }

  const startedAt = Date.now();

  return {
    streams: tracks.map((t) => t.stream),
    async stop(): Promise<RecordedClip[]> {
      const elapsed = Date.now() - startedAt;
      const clips: RecordedClip[] = [];
      for (const track of tracks) {
        await track.handler.stopRecording();
        let blob = await track.handler.getBlob();
        const effectiveMime = mime ?? blob.type ?? "video/webm";
        if (needsWebmDurationFix(effectiveMime)) {
          const { fixWebmDuration } = await import("@fix-webm-duration/fix");
          blob = await fixWebmDuration(blob, elapsed);
        }
        for (const t of track.stream.getTracks()) t.stop();
        clips.push({
          kind: track.kind,
          blob,
          mime: effectiveMime,
          extension: extensionForMime(effectiveMime),
          url: URL.createObjectURL(blob),
        });
      }
      return clips;
    },
  };
}
