import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../render.js";

describe("renderMarkdown", () => {
  it("renders headings, lists, and inline code", () => {
    const html = renderMarkdown("# Title\n\n- a\n- b\n\n`code`");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<li>a</li>");
    expect(html).toContain("<code>code</code>");
  });

  it("passes raw HTML through", () => {
    expect(renderMarkdown('<div class="x">hi</div>')).toContain('<div class="x">hi</div>');
  });

  it("supports GFM (strikethrough)", () => {
    expect(renderMarkdown("~~gone~~")).toContain("<del>gone</del>");
  });
});
