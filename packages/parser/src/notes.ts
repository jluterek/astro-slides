/**
 * Speaker notes are the *last* HTML comment in a slide, provided nothing but
 * whitespace follows it. Returns the body with that comment stripped.
 */
const COMMENT = /<!--([\s\S]*?)-->/g;

export function extractNotes(body: string): { body: string; notes: string | null } {
  COMMENT.lastIndex = 0;
  let last: RegExpExecArray | null = null;
  let m: RegExpExecArray | null = COMMENT.exec(body);
  while (m !== null) {
    last = m;
    m = COMMENT.exec(body);
  }
  if (last === null) return { body, notes: null };

  const after = body.slice(last.index + last[0].length);
  if (after.trim() !== "") return { body, notes: null }; // not a trailing comment

  const notes = (last[1] as string).trim();
  const newBody = body.slice(0, last.index).replace(/\s+$/, "");
  return { body: newBody, notes: notes === "" ? null : notes };
}

/**
 * Strip every HTML comment from a slide body — fence-aware, so `<!-- -->` inside a
 * code sample survives (issue #55). MDX rejects HTML comments outright, and the emit
 * pipeline compiles slide bodies as MDX: before this, one mid-slide comment 500'd the
 * whole deck with an error pointing at an emitted temp file. Comments are never
 * renderable content, so mid-slide ones become inert instead of fatal. (Speaker notes
 * are unaffected: the trailing comment is extracted by `extractNotes` before this.)
 */
export function stripHtmlComments(body: string): string {
  const FENCE = /^(\s{0,3})(`{3,}|~{3,})/;
  const FENCE_ONLY = /^\s*(`{3,}|~{3,})\s*$/;
  const lines = body.split("\n");
  const out: string[] = [];
  let fence: { ch: string; len: number } | null = null;
  let inComment = false;

  for (const line of lines) {
    if (fence) {
      out.push(line);
      if (FENCE_ONLY.test(line)) {
        const run = line.trim();
        if (run[0] === fence.ch && run.length >= fence.len) fence = null;
      }
      continue;
    }
    if (!inComment) {
      const f = FENCE.exec(line);
      if (f) {
        const run = f[2] as string;
        fence = { ch: run[0] as string, len: run.length };
        out.push(line);
        continue;
      }
    }
    // Outside fences: remove comment spans, carrying multi-line comment state.
    let result = "";
    let idx = 0;
    while (idx < line.length) {
      if (inComment) {
        const close = line.indexOf("-->", idx);
        if (close === -1) {
          idx = line.length;
        } else {
          inComment = false;
          idx = close + 3;
        }
      } else {
        const open = line.indexOf("<!--", idx);
        if (open === -1) {
          result += line.slice(idx);
          idx = line.length;
        } else {
          result += line.slice(idx, open);
          inComment = true;
          idx = open + 4;
        }
      }
    }
    // A line fully consumed by a comment vanishes rather than leaving blank noise.
    if (result.trim() !== "" || (!inComment && !line.includes("<!--"))) out.push(result);
  }
  return out.join("\n");
}
