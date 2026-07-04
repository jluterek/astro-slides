---
"@astro-slides/client": patch
"@astro-slides/core": patch
---

Fix the print route (PDF export) dropping the theme background and client-rendered islands. `.as-print`/`.as-print-slide` hardcoded/omitted backgrounds, so a dark deck exported to PDF on paper-white pages — they now paint `var(--slide-bg)`. The print route ran no client scripts, so Magic Move blocks shipped as empty boxes and Mermaid diagrams as a stuck "Rendering diagram…" fallback — it now statically renders each Magic Move island at its final step (print reveals all click state) and mounts Mermaid diagrams. Mermaid islands also declare `data-waitfor=".as-mermaid svg"` so PDF/PNG exports wait for the async render instead of racing it.
