import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  cancel,
  confirm,
  intro,
  isCancel,
  note,
  outro,
  select,
  spinner,
  text,
} from "@clack/prompts";
import pc from "picocolors";

/**
 * `create-astro-slides` — the `pnpm create astro-slides <target>` scaffolder. Generates a
 * ready-to-run deck project (Astro config + slides + scripts). The template rendering is a set
 * of pure functions that return a path→contents map (`scaffold`), unit-tested independently of
 * the interactive `run` flow.
 */

// Workspace packages are unpublished until the v1 release (Phase 18); a scaffolded project
// depends on the published range once it exists. Kept as one constant so it's easy to bump.
const DEP_RANGE = "^0.1.0";
const ASTRO_RANGE = "^5.0.0";

export type ThemeChoice = "starter" | "cosmic";

export interface ScaffoldOptions {
  /** Project directory name (used as the package name and shown in the deck title). */
  name: string;
  /** Bundled theme the deck opts into. */
  theme: ThemeChoice;
}

/** A friendly display title derived from a directory name (`my-talk` → `My Talk`). */
export function titleFromName(name: string): string {
  const base = name.split(/[/\\]/).filter(Boolean).pop() ?? name;
  return (
    base
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase()) || "My Deck"
  );
}

/** npm package name from a directory name (lowercased, safe characters only). */
export function packageName(name: string): string {
  const base = name.split(/[/\\]/).filter(Boolean).pop() ?? name;
  return (
    base
      .toLowerCase()
      .replace(/[^a-z0-9-~]/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "") || "astro-slides-deck"
  );
}

function renderPackageJson(name: string): string {
  const pkg = {
    name: packageName(name),
    version: "0.0.0",
    private: true,
    type: "module",
    scripts: {
      dev: "astro-slides dev",
      build: "astro build",
      preview: "astro preview",
      export: "astro-slides export --format pdf",
    },
    dependencies: {
      "@astro-slides/cli": DEP_RANGE,
      "@astro-slides/client": DEP_RANGE,
      "@astro-slides/core": DEP_RANGE,
      astro: ASTRO_RANGE,
    },
  };
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

function renderAstroConfig(): string {
  return `import astroSlides from "@astro-slides/core";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [astroSlides()],
});
`;
}

function renderSlides(name: string, theme: ThemeChoice): string {
  const title = titleFromName(name);
  return `---
title: ${title}
theme: ${theme}
---

# ${title}

Built with **astro-slides** — a web-native presentation framework.

<!--
Speaker notes live in a trailing HTML comment. Press ? in the dev terminal for shortcuts.
-->

---
layout: section
---

## Author in Markdown

---

## What you get

- Slides authored in MDX (Marp/Slidev-compatible \`.md\` too)
- Click-stepped reveals and view-transition slide changes
- A live presenter view, drawing, and a phone remote
- Export to PDF, PNG, HTML, and editable PowerPoint

---
layout: two-cols
---

### Run it

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

::right::

### Export it

\`\`\`bash
pnpm export
\`\`\`

---
layout: fact
---

**100%**

web-native

---
layout: end
---

## Thanks

Edit \`slides.mdx\` and make it yours.
`;
}

function renderGitignore(): string {
  return `node_modules/
dist/
.astro/
.astro-slides/
`;
}

function renderReadme(name: string): string {
  const title = titleFromName(name);
  return `# ${title}

A presentation built with [astro-slides](https://github.com/jluterek/astro-slides).

## Develop

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

Open the printed URL. Each slide has its own URL (\`/<deck>/<n>\`); the presenter view lives at
\`/presenter/<deck>/<n>\`. Press \`?\` in the terminal for the in-app shortcuts.

## Export

\`\`\`bash
pnpm export                       # PDF (default)
pnpm astro-slides export --format png
pnpm astro-slides export --format pptx
\`\`\`

Edit \`slides.mdx\` to write your deck.
`;
}

/**
 * Render the full project as a path→contents map. Pure — no filesystem access — so it can be
 * unit-tested and diffed. Paths are relative to the target directory.
 */
export function scaffold({ name, theme }: ScaffoldOptions): Map<string, string> {
  return new Map([
    ["package.json", renderPackageJson(name)],
    ["astro.config.mjs", renderAstroConfig()],
    ["slides.mdx", renderSlides(name, theme)],
    [".gitignore", renderGitignore()],
    ["README.md", renderReadme(name)],
  ]);
}

/** Write a scaffold file map to disk under `targetDir`, creating parent directories. */
export function writeScaffold(targetDir: string, files: Map<string, string>): void {
  for (const [rel, contents] of files) {
    const dest = join(targetDir, rel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, contents);
  }
}

/** True when the directory is absent or empty (safe to scaffold into without clobbering). */
export function isDirEmpty(dir: string): boolean {
  if (!existsSync(dir)) return true;
  return readdirSync(dir).length === 0;
}

/** Read a `--flag value` or `--flag=value` option out of argv. Pure — unit-tested. */
export function readFlag(argv: string[], flag: string): string | undefined {
  const eq = argv.find((a) => a.startsWith(`--${flag}=`));
  if (eq) return eq.slice(flag.length + 3);
  const i = argv.indexOf(`--${flag}`);
  if (i >= 0 && i + 1 < argv.length) return argv[i + 1];
  return undefined;
}

/** The interactive scaffolder flow. Prompts for anything not passed on the command line. */
export async function run(argv: string[]): Promise<void> {
  intro(pc.bgCyan(pc.black(" create-astro-slides ")));

  const skipPrompts = argv.includes("--yes") || argv.includes("-y");
  // The target directory is the first positional argument (flags follow it).
  const first = argv[0];
  let name = first && !first.startsWith("-") ? first : undefined;
  if (!name) {
    const answer = await text({
      message: "Where should we create your deck?",
      placeholder: "my-talk",
      defaultValue: "my-talk",
    });
    if (isCancel(answer)) return cancel("Cancelled.");
    name = answer || "my-talk";
  }

  const targetDir = resolve(process.cwd(), name);
  if (!isDirEmpty(targetDir) && !skipPrompts) {
    const proceed = await confirm({
      message: `${pc.yellow(name)} already exists and isn't empty. Write into it anyway?`,
      initialValue: false,
    });
    if (isCancel(proceed) || !proceed) return cancel("Cancelled — nothing was written.");
  }

  const flagTheme = readFlag(argv, "theme");
  let theme: ThemeChoice;
  if (flagTheme === "cosmic" || flagTheme === "starter") {
    theme = flagTheme;
  } else {
    const picked = await select({
      message: "Pick a theme",
      options: [
        { value: "cosmic", label: "Cosmic", hint: "flagship dark-primary space theme" },
        { value: "starter", label: "Starter", hint: "the minimal default" },
      ],
      initialValue: "cosmic" as ThemeChoice,
    });
    if (isCancel(picked)) return cancel("Cancelled.");
    theme = picked;
  }

  const files = scaffold({ name, theme });
  const s = spinner();
  s.start("Writing files");
  writeScaffold(targetDir, files);
  s.stop(`Created ${files.size} files in ${pc.cyan(name)}`);

  note(
    [`${pc.dim("$")} cd ${name}`, `${pc.dim("$")} pnpm install`, `${pc.dim("$")} pnpm dev`].join(
      "\n",
    ),
    "Next steps",
  );
  outro(`Done. Edit ${pc.cyan("slides.mdx")} and present. ${pc.dim("pnpm only — no Corepack.")}`);
}
