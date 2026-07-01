// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { applySlideStates, slideState } from "../state-machine.js";

describe("slideState", () => {
  it("classifies slides relative to the current one", () => {
    expect(slideState(1, 2)).toBe("past");
    expect(slideState(2, 2)).toBe("present");
    expect(slideState(3, 2)).toBe("future");
  });
});

describe("applySlideStates", () => {
  it("puts exactly one class on each section", () => {
    const container = document.createElement("div");
    container.innerHTML = [1, 2, 3].map((n) => `<section data-slide-no="${n}"></section>`).join("");
    const sections = Array.from(container.querySelectorAll<HTMLElement>("section"));

    applySlideStates(sections, 2);

    expect(sections[0]?.className).toBe("past");
    expect(sections[1]?.className).toBe("present");
    expect(sections[2]?.className).toBe("future");

    applySlideStates(sections, 3);
    expect(sections[2]?.className).toBe("present");
    expect(sections[1]?.className).toBe("past");
  });
});
