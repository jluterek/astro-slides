import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import {
  buildDeckPptx,
  buildPptxSlide,
  inToEmu,
  type PptxSlideLike,
  parseCssColor,
  pxToIn,
  type SlideModel,
} from "../main.js";

describe("unit conversions", () => {
  it("pxToIn scales a design pixel length onto its slide dimension", () => {
    // Half of a 1920px design width maps to half of a 13.333in slide.
    expect(pxToIn(960, 1920, 13.333)).toBeCloseTo(6.6665, 4);
    expect(pxToIn(0, 1920, 13.333)).toBe(0);
  });
  it("pxToIn guards a non-positive design dimension", () => {
    expect(pxToIn(100, 0, 13.333)).toBe(0);
    expect(pxToIn(100, -5, 13.333)).toBe(0);
  });
  it("inToEmu rounds inches to PowerPoint's EMU", () => {
    expect(inToEmu(1)).toBe(914400);
    expect(inToEmu(0.5)).toBe(457200);
  });
});

describe("parseCssColor", () => {
  it("normalizes #rgb and #rrggbb to uppercase RRGGBB", () => {
    expect(parseCssColor("#abc")).toBe("AABBCC");
    expect(parseCssColor("#1a2b3c")).toBe("1A2B3C");
  });
  it("converts rgb()/rgba() to RRGGBB", () => {
    expect(parseCssColor("rgb(255, 0, 16)")).toBe("FF0010");
    expect(parseCssColor("rgba(0, 128, 255, 0.5)")).toBe("0080FF");
  });
  it("returns '' for transparent / empty / unparseable input", () => {
    expect(parseCssColor("transparent")).toBe("");
    expect(parseCssColor("rgba(0, 0, 0, 0)")).toBe("");
    expect(parseCssColor(undefined)).toBe("");
    expect(parseCssColor("chartreuse")).toBe("");
  });
});

/** A fake slide that records every call the mapper makes, so mapping is pure to assert on. */
function recorder() {
  const calls: { method: string; args: unknown[] }[] = [];
  const slide: PptxSlideLike & { background?: { color?: string } } = {
    addText: (...args) => calls.push({ method: "addText", args }),
    addImage: (...args) => calls.push({ method: "addImage", args }),
    addTable: (...args) => calls.push({ method: "addTable", args }),
    addNotes: (...args) => calls.push({ method: "addNotes", args }),
  };
  return { slide, calls };
}

const box = { x: 1, y: 1, w: 4, h: 1 };

describe("buildPptxSlide", () => {
  it("maps text, list, image, and table elements plus background and notes", () => {
    const { slide, calls } = recorder();
    const model: SlideModel = {
      no: 1,
      widthIn: 13.333,
      heightIn: 7.5,
      background: "112233",
      notes: "  speak here  ",
      elements: [
        {
          kind: "text",
          box,
          runs: [{ text: "Hello", bold: true }],
          fontSize: 32,
          align: "center",
          color: "FF0000",
        },
        {
          kind: "list",
          box,
          items: [{ runs: [{ text: "one" }], level: 0 }],
          fontSize: 18,
        },
        { kind: "image", box, data: "data:image/png;base64,AAAA" },
        {
          kind: "table",
          box,
          rows: [
            ["a", "b"],
            ["c", "d"],
          ],
        },
      ],
    };

    buildPptxSlide(slide, model);

    expect(slide.background).toEqual({ color: "112233" });
    expect(calls.map((c) => c.method)).toEqual([
      "addText", // text
      "addText", // list (also addText, with bullets)
      "addImage",
      "addTable",
      "addNotes",
    ]);

    // Text run carries bold + color; box + alignment flow through the options.
    const [runs, opts] = calls[0]?.args as [
      { text: string; options: { bold?: boolean } }[],
      { align: string; fontSize: number; x: number },
    ];
    expect(runs[0]?.text).toBe("Hello");
    expect(runs[0]?.options.bold).toBe(true);
    expect(opts.align).toBe("center");
    expect(opts.fontSize).toBe(32);
    expect(opts.x).toBe(1);

    // Notes are trimmed.
    expect(calls[4]?.args[0]).toBe("speak here");
  });

  it("omits background and notes when absent/blank", () => {
    const { slide, calls } = recorder();
    buildPptxSlide(slide, {
      no: 1,
      widthIn: 13.333,
      heightIn: 7.5,
      notes: "   ",
      elements: [],
    });
    expect(slide.background).toBeUndefined();
    expect(calls).toEqual([]);
  });
});

describe("buildDeckPptx", () => {
  it("produces a valid OOXML zip with one slide part per model", async () => {
    const mk = (no: number): SlideModel => ({
      no,
      widthIn: 13.333,
      heightIn: 7.5,
      notes: `notes ${no}`,
      elements: [
        {
          kind: "text",
          box,
          runs: [{ text: `Slide ${no}` }],
          fontSize: 28,
          align: "left",
        },
      ],
    });

    const buf = await buildDeckPptx([mk(1), mk(2), mk(3)], {
      widthIn: 13.333,
      heightIn: 7.5,
    });
    expect(buf.length).toBeGreaterThan(0);

    const zip = await JSZip.loadAsync(buf);
    const names = Object.keys(zip.files);
    expect(names).toContain("ppt/presentation.xml");
    expect(names).toContain("[Content_Types].xml");
    const slideParts = names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
    expect(slideParts).toHaveLength(3);
    // Notes were added, so a notes part exists per slide.
    const notesParts = names.filter((n) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(n));
    expect(notesParts).toHaveLength(3);
  });
});
