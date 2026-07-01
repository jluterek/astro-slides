/**
 * The mobile remote page served at `/entry` (Phase 11). A self-contained, touch-friendly
 * controller that joins the sync gateway over WebSocket and drives the deck: prev/next,
 * blackout, and a laser-pointer pad. It advances whole slides (absolute `goto`); fine
 * per-click stepping stays with the laptop/presenter. Rendered as a single HTML string so
 * the dev server can serve it without a build step.
 */

export interface EntryPageOptions {
  deck: string;
  /** WebSocket path of the gateway, e.g. `/__astro-slides/sync`. */
  wsPath: string;
  /** Total slides in the deck (upper bound for next). */
  total: number;
  /** Shared-secret token appended to the WS query when the server requires one. */
  token?: string | undefined;
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });

export function renderEntryPage(options: EntryPageOptions): string {
  // Config is embedded as JSON and read by the inline script (no server templating in JS).
  // Escape `<` so a deck name can't break out of the <script> block (`</script>`).
  const config = JSON.stringify({
    deck: options.deck,
    wsPath: options.wsPath,
    total: options.total,
    token: options.token ?? "",
  }).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<title>Remote — ${escapeHtml(options.deck)}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; height: 100dvh; display: flex; flex-direction: column;
    font: 500 1rem system-ui, sans-serif; background: #0b1020; color: #e5e7eb; }
  header { padding: 0.8rem 1rem; display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid rgba(255,255,255,0.1); }
  header .deck { opacity: 0.7; font-size: 0.85rem; }
  header .pos { font-variant-numeric: tabular-nums; font-weight: 700; }
  .nav { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 2px; background: rgba(255,255,255,0.08); }
  .nav button { border: 0; font-size: 2.5rem; color: #fff; background: #111827; }
  .nav button:active { background: #1f2937; }
  .pad { flex: 1.4; position: relative; touch-action: none; background: #0f172a;
    display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.35); }
  .pad .dot { position: absolute; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%;
    background: radial-gradient(circle, rgba(255,60,60,.95), rgba(255,60,60,0) 70%); display: none; }
  .bar { display: flex; gap: 2px; background: rgba(255,255,255,0.08); }
  .bar button { flex: 1; border: 0; padding: 1rem; font-size: 1rem; color: #fff; background: #111827; }
  .bar button.on { background: #dc2626; }
  .status { padding: 0.4rem 1rem; font-size: 0.8rem; opacity: 0.6; text-align: center; }
</style>
</head>
<body>
<header><span class="deck">${escapeHtml(options.deck)}</span><span class="pos" id="pos">–</span></header>
<div class="nav">
  <button id="prev" aria-label="Previous">‹</button>
  <button id="next" aria-label="Next">›</button>
</div>
<div class="pad" id="pad"><span>laser pad</span><div class="dot" id="dot"></div></div>
<div class="bar">
  <button id="black">Blackout</button>
</div>
<div class="status" id="status">connecting…</div>
<script id="cfg" type="application/json">${config}</script>
<script>
(function () {
  var cfg = JSON.parse(document.getElementById("cfg").textContent);
  var pos = document.getElementById("pos");
  var status = document.getElementById("status");
  var blackBtn = document.getElementById("black");
  var cur = { no: 1, blackout: false };

  function render() {
    pos.textContent = cur.no + " / " + cfg.total;
    blackBtn.classList.toggle("on", cur.blackout);
  }
  render();

  var scheme = location.protocol === "https:" ? "wss:" : "ws:";
  var q = "?deck=" + encodeURIComponent(cfg.deck) + (cfg.token ? "&token=" + encodeURIComponent(cfg.token) : "");
  var ws;
  function connect() {
    ws = new WebSocket(scheme + "//" + location.host + cfg.wsPath + q);
    ws.onopen = function () { status.textContent = "connected"; send({ type: "hello" }); };
    ws.onclose = function () { status.textContent = "disconnected — retrying"; setTimeout(connect, 1000); };
    ws.onmessage = function (ev) {
      var a; try { a = JSON.parse(ev.data); } catch (e) { return; }
      if (a.type === "goto") { cur.no = a.no; render(); }
      else if (a.type === "state" && a.state) { cur.no = a.state.no; cur.blackout = !!a.state.blackout; render(); }
      else if (a.type === "blackout") { cur.blackout = a.on; render(); }
    };
  }
  function send(a) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(a)); }
  connect();

  document.getElementById("next").onclick = function () {
    cur.no = Math.min(cfg.total, cur.no + 1); render(); send({ type: "goto", no: cur.no, step: 0 });
  };
  document.getElementById("prev").onclick = function () {
    cur.no = Math.max(1, cur.no - 1); render(); send({ type: "goto", no: cur.no, step: 0 });
  };
  blackBtn.onclick = function () {
    cur.blackout = !cur.blackout; render(); send({ type: "blackout", on: cur.blackout });
  };

  var pad = document.getElementById("pad");
  var dot = document.getElementById("dot");
  var lastSent = 0;
  function laserFrom(e) {
    var r = pad.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    return { x: x, y: y };
  }
  pad.addEventListener("pointermove", function (e) {
    if (e.pressure === 0 && e.pointerType !== "mouse") return;
    var now = Date.now(); if (now - lastSent < 40) return; lastSent = now;
    var p = laserFrom(e); if (!p) return;
    dot.style.display = "block"; dot.style.left = p.x * 100 + "%"; dot.style.top = p.y * 100 + "%";
    send({ type: "laser", point: p });
  });
  function laserOff() { dot.style.display = "none"; send({ type: "laser", point: null }); }
  pad.addEventListener("pointerup", laserOff);
  pad.addEventListener("pointerleave", laserOff);
})();
</script>
</body>
</html>`;
}
