import { describe, expect, it } from "vitest";
import { TYPES_PACKAGE_VERSION } from "../index.js";

describe("@astro-slides/types placeholder", () => {
  it("exposes the package version constant", () => {
    expect(TYPES_PACKAGE_VERSION).toBe("0.0.0");
  });
});
