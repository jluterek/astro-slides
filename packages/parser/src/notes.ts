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
