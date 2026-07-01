// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bindCopyButtons } from "../code/copy.js";

function buildBlock(): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = `
    <figure class="as-code">
      <div class="as-code-body">
        <button data-copy>Copy</button>
        <pre class="shiki"><code>const x = 1</code></pre>
      </div>
    </figure>`;
  document.body.append(root);
  return root;
}

let unbind: (() => void) | null = null;
beforeEach(() => {
  document.body.innerHTML = "";
  vi.useFakeTimers();
});
afterEach(() => {
  unbind?.();
  unbind = null;
  vi.useRealTimers();
});

describe("bindCopyButtons", () => {
  it("copies the block's code text and flashes 'Copied'", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const root = buildBlock();
    unbind = bindCopyButtons(root);
    const button = root.querySelector<HTMLButtonElement>("[data-copy]");
    button?.click();

    expect(writeText).toHaveBeenCalledWith("const x = 1");
    await Promise.resolve(); // let the writeText promise resolve
    expect(button?.classList.contains("as-copied")).toBe(true);
    expect(button?.textContent).toBe("Copied");

    vi.advanceTimersByTime(1300);
    expect(button?.classList.contains("as-copied")).toBe(false);
    expect(button?.textContent).toBe("Copy");
  });

  it("ignores clicks outside a copy button", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const root = buildBlock();
    unbind = bindCopyButtons(root);
    root.querySelector(".shiki")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(writeText).not.toHaveBeenCalled();
  });
});
