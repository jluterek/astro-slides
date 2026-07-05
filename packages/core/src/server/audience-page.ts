/**
 * The audience page served at `/audience` (Phase 19). A self-contained mobile page a
 * spectator opens by QR: vote on the active poll, submit a question, tap reactions.
 * It joins the sync gateway WebSocket with `?role=audience`, which the gateway relay
 * restricts server-side to `vote` / `qa/ask` / `react` / `hello` — no navigation or
 * drawing control, regardless of what the page sends. Rendered as one HTML string so
 * the dev server serves it without a build step (mirrors `/entry`).
 */

export interface AudiencePageOptions {
  deck: string;
  /** WebSocket path of the gateway, e.g. `/__astro-slides/sync`. */
  wsPath: string;
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

export const REACTION_EMOJI = ["👏", "🎉", "❤️", "😂", "🤯", "👍"];

export function renderAudiencePage(options: AudiencePageOptions): string {
  const config = JSON.stringify({
    deck: options.deck,
    wsPath: options.wsPath,
    token: options.token ?? "",
    emoji: REACTION_EMOJI,
  }).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<title>Join — ${escapeHtml(options.deck)}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100dvh; display: flex; flex-direction: column;
    font: 500 1rem system-ui, sans-serif; background: #0b1020; color: #e5e7eb; }
  header { padding: 0.8rem 1rem; display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid rgba(255,255,255,0.1); }
  header .deck { opacity: 0.7; font-size: 0.85rem; }
  main { flex: 1; padding: 1rem; display: flex; flex-direction: column; gap: 1.2rem; }
  section h2 { margin: 0 0 0.5rem; font-size: 0.8rem; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.6; }
  .poll { display: none; }
  .poll.active { display: block; }
  .poll .q { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.6rem; }
  .poll button { display: block; width: 100%; margin: 0.4rem 0; padding: 0.9rem 1rem; font-size: 1rem;
    text-align: left; color: #fff; background: #1f2937; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; }
  .poll button.mine { background: #4c1d95; border-color: #a78bfa; }
  .poll .closed-note { opacity: 0.6; font-size: 0.85rem; }
  .nopoll { opacity: 0.5; font-size: 0.9rem; }
  .ask { display: flex; gap: 0.5rem; }
  .ask input { flex: 1; padding: 0.8rem; font-size: 1rem; color: #fff; background: #111827;
    border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; }
  .ask button { padding: 0.8rem 1.1rem; font-size: 1rem; color: #fff; background: #4c1d95;
    border: 0; border-radius: 10px; }
  .asked { font-size: 0.85rem; opacity: 0.6; min-height: 1.2em; margin-top: 0.4rem; }
  .react { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .react button { flex: 1; min-width: 3.2rem; padding: 0.7rem 0; font-size: 1.6rem;
    background: #111827; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; }
  .react button:active { background: #1f2937; }
  .status { padding: 0.4rem 1rem; font-size: 0.8rem; opacity: 0.6; text-align: center; }
</style>
</head>
<body>
<header><span class="deck">${escapeHtml(options.deck)}</span><span>audience</span></header>
<main>
  <section>
    <h2>Poll</h2>
    <div class="poll" id="poll">
      <div class="q" id="poll-q"></div>
      <div id="poll-opts"></div>
      <div class="closed-note" id="poll-closed" hidden>Voting closed.</div>
    </div>
    <div class="nopoll" id="nopoll">No poll is open right now.</div>
  </section>
  <section>
    <h2>Ask a question</h2>
    <div class="ask">
      <input id="ask-text" maxlength="280" placeholder="Type your question…" />
      <button id="ask-send">Ask</button>
    </div>
    <div class="asked" id="asked"></div>
  </section>
  <section>
    <h2>React</h2>
    <div class="react" id="react"></div>
  </section>
</main>
<div class="status" id="status">connecting…</div>
<script id="cfg" type="application/json">${config}</script>
<script>
(function () {
  var cfg = JSON.parse(document.getElementById("cfg").textContent);
  var status = document.getElementById("status");

  // Anonymous, stable client identity — one revisable vote per device per poll.
  var clientId = localStorage.getItem("as-client-id");
  if (!clientId) {
    clientId = (self.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random()).slice(2);
    localStorage.setItem("as-client-id", clientId);
  }

  var active = null;             // { id, question, options }
  var votes = {};                // pollId -> my option index (local echo)
  var closed = {};               // pollId -> true

  var pollEl = document.getElementById("poll");
  var nopollEl = document.getElementById("nopoll");
  var qEl = document.getElementById("poll-q");
  var optsEl = document.getElementById("poll-opts");
  var closedEl = document.getElementById("poll-closed");

  function renderPoll() {
    var has = !!active;
    pollEl.classList.toggle("active", has);
    nopollEl.style.display = has ? "none" : "block";
    if (!has) return;
    qEl.textContent = active.question;
    closedEl.hidden = !closed[active.id];
    optsEl.innerHTML = "";
    active.options.forEach(function (label, i) {
      var b = document.createElement("button");
      b.textContent = label;
      if (votes[active.id] === i) b.classList.add("mine");
      b.disabled = !!closed[active.id];
      b.onclick = function () {
        votes[active.id] = i;
        send({ type: "vote", poll: active.id, client: clientId, option: i });
        renderPoll();
      };
      optsEl.appendChild(b);
    });
  }
  renderPoll();

  var scheme = location.protocol === "https:" ? "wss:" : "ws:";
  var q = "?deck=" + encodeURIComponent(cfg.deck) + "&role=audience" +
    (cfg.token ? "&token=" + encodeURIComponent(cfg.token) : "");
  var ws;
  function connect() {
    ws = new WebSocket(scheme + "//" + location.host + cfg.wsPath + q);
    ws.onopen = function () { status.textContent = "connected"; send({ type: "hello" }); };
    ws.onclose = function () { status.textContent = "disconnected — retrying"; setTimeout(connect, 1000); };
    ws.onmessage = function (ev) {
      var a; try { a = JSON.parse(ev.data); } catch (e) { return; }
      if (a.type === "poll/open" && a.poll) { active = a.poll; renderPoll(); }
      else if (a.type === "poll/close") { closed[a.id] = true; if (active && active.id === a.id) active = null; renderPoll(); }
      else if (a.type === "state" && a.state) {
        active = a.state.activePoll || null;
        var polls = a.state.polls || {};
        Object.keys(polls).forEach(function (id) {
          if (polls[id].closed) closed[id] = true;
          if (polls[id].votes && polls[id].votes[clientId] != null) votes[id] = polls[id].votes[clientId];
        });
        renderPoll();
      }
    };
  }
  function send(a) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(a)); }
  connect();

  var askText = document.getElementById("ask-text");
  var asked = document.getElementById("asked");
  document.getElementById("ask-send").onclick = function () {
    var text = askText.value.trim();
    if (!text) return;
    var id = clientId.slice(0, 8) + "-" + Date.now().toString(36);
    send({ type: "qa/ask", id: id, text: text, at: Date.now() });
    askText.value = "";
    asked.textContent = "Sent — the presenter will see it.";
    setTimeout(function () { asked.textContent = ""; }, 4000);
  };

  // Reactions: client-side rate limit (min interval) — the overlay also caps sprites.
  var reactEl = document.getElementById("react");
  var lastReact = 0;
  cfg.emoji.forEach(function (emoji) {
    var b = document.createElement("button");
    b.textContent = emoji;
    b.onclick = function () {
      var now = Date.now();
      if (now - lastReact < 300) return;
      lastReact = now;
      send({ type: "react", id: clientId.slice(0, 8) + "-" + now.toString(36), emoji: emoji });
    };
    reactEl.appendChild(b);
  });
})();
</script>
</body>
</html>`;
}
