import { describe, expect, it } from "vitest";
import {
  extensionForMime,
  needsWebmDurationFix,
  pickVideoMime,
  VIDEO_MIME_PREFERENCES,
} from "../recording/mime.js";

describe("pickVideoMime", () => {
  it("returns the first supported candidate in preference order", () => {
    // Only VP9 supported → skips the (unsupported) H.264 preference ahead of it.
    const supported = new Set(["video/webm;codecs=vp9,opus", "video/webm"]);
    expect(pickVideoMime(VIDEO_MIME_PREFERENCES, (m) => supported.has(m))).toBe(
      "video/webm;codecs=vp9,opus",
    );
  });
  it("prefers H.264-in-WebM when everything is supported", () => {
    expect(pickVideoMime(VIDEO_MIME_PREFERENCES, () => true)).toBe("video/webm;codecs=h264");
  });
  it("returns null when nothing is supported", () => {
    expect(pickVideoMime(VIDEO_MIME_PREFERENCES, () => false)).toBeNull();
  });
});

describe("extensionForMime", () => {
  it("maps container to file extension", () => {
    expect(extensionForMime("video/webm;codecs=vp9")).toBe("webm");
    expect(extensionForMime("video/mp4")).toBe("mp4");
    expect(extensionForMime("video/x-matroska")).toBe("mkv");
    expect(extensionForMime(null)).toBe("webm");
  });
});

describe("needsWebmDurationFix", () => {
  it("is true for WebM (and unknown) but false for MP4", () => {
    expect(needsWebmDurationFix("video/webm;codecs=vp9")).toBe(true);
    expect(needsWebmDurationFix(null)).toBe(true);
    expect(needsWebmDurationFix("video/mp4")).toBe(false);
  });
});
