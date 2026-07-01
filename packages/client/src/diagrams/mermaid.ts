/**
 * Mermaid runtime (Phase 09, ADR-0011). Mermaid is large, so it's imported lazily and
 * ONLY when a `.as-mermaid` element exists — Vite code-splits it into a chunk fetched
 * on demand (conditional bundle). Each diagram renders to SVG mounted in a Shadow DOM
 * (CSS isolation from the deck), honors the active color scheme, and re-renders when the
 * scheme changes.
 */

interface MermaidElement {
  el: HTMLElement;
  shadow: ShadowRoot;
  code: string;
  theme: string | null;
  scale: number;
}

/** Parse `theme: neutral, scale: 0.8` fence options into a record. */
export function parseOptions(raw: string | undefined): { theme?: string; scale?: number } {
  const out: { theme?: string; scale?: number } = {};
  for (const part of (raw ?? "").split(",")) {
    const [k, v] = part.split(":").map((s) => s.trim());
    if (!k || !v) continue;
    if (k === "theme") out.theme = v;
    else if (k === "scale") out.scale = Number(v) || 1;
  }
  return out;
}

/** Effective scheme: explicit `data-color-scheme`, else the OS preference. */
function currentScheme(): "light" | "dark" {
  const forced = document.documentElement.dataset.colorScheme;
  if (forced === "light" || forced === "dark") return forced;
  return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function initMermaid(root: HTMLElement): () => void {
  const els = Array.from(root.querySelectorAll<HTMLElement>(".as-mermaid"));
  if (els.length === 0) return () => {};

  const instances: MermaidElement[] = els.map((el) => {
    const opts = parseOptions(el.dataset.mermaidOptions);
    return {
      el,
      shadow: el.shadowRoot ?? el.attachShadow({ mode: "open" }),
      code: el.dataset.mermaid ?? "",
      theme: opts.theme ?? null,
      scale: opts.scale ?? 1,
    };
  });

  let disposed = false;
  let renderSeq = 0;

  const renderAll = async (): Promise<void> => {
    const { default: mermaid } = await import("mermaid");
    if (disposed) return;
    const scheme = currentScheme();
    for (let i = 0; i < instances.length; i++) {
      const mm = instances[i];
      if (!mm) continue;
      mermaid.initialize({
        startOnLoad: false,
        // User-supplied theme strings widen past mermaid's literal union; it validates
        // at runtime, so narrow here.
        theme: (mm.theme ?? (scheme === "dark" ? "dark" : "default")) as "default",
        securityLevel: "loose",
      });
      try {
        const { svg } = await mermaid.render(`as-mermaid-${i}-${renderSeq}`, mm.code);
        if (disposed) return;
        const wrap = mm.scale !== 1 ? `transform:scale(${mm.scale});transform-origin:top left` : "";
        mm.shadow.innerHTML = `<div style="${wrap}">${svg}</div>`;
      } catch (error) {
        mm.shadow.innerHTML = `<pre style="color:#c00">Mermaid error: ${String(error)}</pre>`;
      }
    }
  };

  void renderAll();

  // Re-render on color-scheme change (OS preference + forced attribute).
  const media =
    typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null;
  const onScheme = (): void => {
    renderSeq += 1;
    void renderAll();
  };
  media?.addEventListener("change", onScheme);
  const observer = new MutationObserver(onScheme);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-color-scheme"],
  });

  return () => {
    disposed = true;
    media?.removeEventListener("change", onScheme);
    observer.disconnect();
  };
}
