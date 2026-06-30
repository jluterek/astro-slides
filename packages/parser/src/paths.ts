/**
 * Minimal POSIX-style path helpers. Kept in-package (rather than `node:path`) so the
 * parser core has no Node dependency and stays portable. Import specifiers in decks use
 * forward slashes regardless of host OS.
 */

export function dirname(p: string): string {
  const i = p.lastIndexOf("/");
  if (i < 0) return ".";
  if (i === 0) return "/";
  return p.slice(0, i);
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
 * relative to the importing file's directory.
 */
export function resolveImport(spec: string, fromFile: string, root: string): string {
  let base: string;
  let rel: string;
  if (spec.startsWith("@/")) {
    base = root;
    rel = spec.slice(2);
  } else if (spec.startsWith("/")) {
    base = root;
    rel = spec.slice(1);
  } else {
    base = dirname(fromFile);
    rel = spec;
  }
  return normalizePath(`${base}/${rel}`);
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
