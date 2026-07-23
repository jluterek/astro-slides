---
"@astro-slides/core": minor
"@astro-slides/client": minor
---

Presenter view gains a slide grid — the PowerPoint "see all slides" gesture. The new **Slides** toolbar button (or `G`) opens a full-screen grid of every slide as a real prerendered thumbnail (scaled slide content, not screenshots — code, math, and diagrams render), numbered and titled, with the current slide highlighted and scrolled into view. Clicking a thumbnail jumps the presentation straight there at step 0 — click steps and animations are skipped by design. Keyboard-accessible (`Enter`/`Space` on a focused thumbnail, `Esc` closes).
