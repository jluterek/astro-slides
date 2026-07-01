import { useEffect, useRef, useState } from "react";
import type { RecordedClip, RecordingSession } from "../../src/recording/recorder.js";

/**
 * Recording controls (Phase 11) — a presenter-side island. Lets the speaker pick a
 * camera + mic, choose screen and/or camera capture, and record. The recorder core is
 * lazy-imported on Start, so viewers never pay for it. A `beforeunload` guard warns if
 * the tab is closed mid-recording; finished clips surface as download links.
 */

interface Devices {
  cameras: MediaDeviceInfo[];
  mics: MediaDeviceInfo[];
}

type Phase = "idle" | "recording" | "error";

export interface RecordingControlsProps {
  /** File-name stem for downloads (defaults to the deck id). */
  nameStem?: string;
}

export default function RecordingControls({ nameStem = "recording" }: RecordingControlsProps) {
  const [devices, setDevices] = useState<Devices>({ cameras: [], mics: [] });
  const [screen, setScreen] = useState(true);
  const [camera, setCamera] = useState(false);
  const [cameraId, setCameraId] = useState<string>("");
  const [micId, setMicId] = useState<string>("");
  const [stem, setStem] = useState(nameStem);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string>("");
  const [clips, setClips] = useState<RecordedClip[]>([]);
  const sessionRef = useRef<RecordingSession | null>(null);

  // Populate the device pickers once (labels require a prior permission grant).
  useEffect(() => {
    let live = true;
    void import("../../src/recording/recorder.js").then(({ listDevices }) =>
      listDevices().then((d) => {
        if (live) setDevices(d);
      }),
    );
    return () => {
      live = false;
    };
  }, []);

  // Guard against losing a recording to an accidental tab close.
  useEffect(() => {
    if (phase !== "recording") return;
    const guard = (e: BeforeUnloadEvent): void => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [phase]);

  const start = async (): Promise<void> => {
    setError("");
    for (const c of clips) URL.revokeObjectURL(c.url);
    setClips([]);
    try {
      const { startRecording } = await import("../../src/recording/recorder.js");
      sessionRef.current = await startRecording({
        screen,
        camera,
        cameraDeviceId: cameraId || undefined,
        micDeviceId: micId || undefined,
      });
      setPhase("recording");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  };

  const stop = async (): Promise<void> => {
    const session = sessionRef.current;
    if (!session) return;
    const result = await session.stop();
    sessionRef.current = null;
    setClips(result);
    setPhase("idle");
  };

  const recording = phase === "recording";

  return (
    <div className="as-recording">
      <div className="as-recording-row">
        <label>
          <input
            type="checkbox"
            checked={screen}
            disabled={recording}
            onChange={(e) => setScreen(e.target.checked)}
          />
          Screen
        </label>
        <label>
          <input
            type="checkbox"
            checked={camera}
            disabled={recording}
            onChange={(e) => setCamera(e.target.checked)}
          />
          Camera
        </label>
      </div>

      {camera && (
        <div className="as-recording-row">
          <select
            value={cameraId}
            disabled={recording}
            onChange={(e) => setCameraId(e.target.value)}
            aria-label="Camera"
          >
            <option value="">Default camera</option>
            {devices.cameras.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
          <select
            value={micId}
            disabled={recording}
            onChange={(e) => setMicId(e.target.value)}
            aria-label="Microphone"
          >
            <option value="">Default mic</option>
            {devices.mics.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Mic ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="as-recording-row">
        <input
          type="text"
          value={stem}
          disabled={recording}
          onChange={(e) => setStem(e.target.value)}
          aria-label="File name"
          placeholder="File name"
        />
        {recording ? (
          <button type="button" className="as-rec-stop" onClick={() => void stop()}>
            ◼ Stop
          </button>
        ) : (
          <button type="button" className="as-rec-start" onClick={() => void start()}>
            ● Record
          </button>
        )}
      </div>

      {error && <p className="as-recording-error">{error}</p>}

      {clips.length > 0 && (
        <ul className="as-recording-clips">
          {clips.map((c) => (
            <li key={c.kind}>
              <a href={c.url} download={`${stem}-${c.kind}.${c.extension}`}>
                Download {c.kind} ({c.extension})
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
