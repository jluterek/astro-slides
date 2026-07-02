/**
 * Minimal POSIX-style path helpers. Kept in-package (rather than `node:path`) so the
 * parser core has no Node dependency and stays portable. Import specifiers in decks use
 * forward slashes regardless of host OS.
 */

/** Import *specifiers* are always forward-slash, but file paths come from `node:path`
 * and carry backslashes on Windows — normalize before any `/`-based logic. */
function toPosix(p: string): string {
  return p.replace(/\\/g, "/");
}

export function dirname(p: string): string {
  const posix = toPosix(p);
  const i = posix.lastIndexOf("/");
  if (i < 0) return ".";
  if (i === 0) return "/";
  return posix.slice(0, i);
}

export function normalizePath(p: string): string {
  const isAbs = p.startsWith("/");
  const stack: string[] = [];
  for (const part of p.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (stack.length > 0 && stack[stack.length - 1] !== "..") stack.pop();
      else if (!isAbs) stack.push("..");
    } else {
      stack.push(part);
    }
  }
  return (isAbs ? "/" : "") + stack.join("/");
}

/**
 * Resolve a deck import specifier. `@/x` and `/x` are root-relative; everything else is
 * relative to the importing file's directory. The result is contained to the project
 * root: a specifier that `..`-escapes it throws — deck content must never be able to
 * inline arbitrary files from elsewhere on disk (decks may be untrusted, and the MCP
 * server parses them remotely).
 */
export function resolveImport(spec: string, fromFile: string, root: string): string {
  let base: string;
  let rel: string;
  if (spec.startsWith("@/")) {
    base = toPosix(root);
    rel = spec.slice(2);
  } else if (spec.startsWith("/")) {
    base = toPosix(root);
    rel = spec.slice(1);
  } else {
    base = dirname(fromFile);
    rel = spec;
  }
  const resolved = normalizePath(`${base}/${rel}`);
  const posixRoot = normalizePath(toPosix(root));
  if (resolved !== posixRoot && !resolved.startsWith(`${posixRoot}/`)) {
    throw new Error(`Import "${spec}" resolves outside the project root (${root})`);
  }
  return resolved;
}

const EXT_LANG: Record<string, string> = {
  ts: "ts",
  tsx: "tsx",
  js: "js",
  jsx: "jsx",
  mjs: "js",
  cjs: "js",
  vue: "vue",
  svelte: "svelte",
  astro: "astro",
  py: "python",
  rs: "rust",
  go: "go",
  java: "java",
  rb: "ruby",
  sh: "bash",
  bash: "bash",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  css: "css",
  html: "html",
  md: "markdown",
};

export function langFromPath(p: string): string {
  const ext = p.slice(p.lastIndexOf(".") + 1).toLowerCase();
  return EXT_LANG[ext] ?? ext;
}
