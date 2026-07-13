// @ts-check
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

// Deployed to GitHub Pages under the repo path. Override via env for a custom domain.
const SITE = process.env.DOCS_SITE ?? "https://jluterek.github.io";
const BASE = process.env.DOCS_BASE ?? "/astro-slides/";

// https://astro.build/config
export default defineConfig({
  site: SITE,
  base: BASE,
  integrations: [
    starlight({
      title: "astro-slides",
      description:
        "A web-native presentation framework built on Astro, TypeScript, and MDX, with a first-class MCP server.",
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/jluterek/astro-slides" },
      ],
      sidebar: [
        {
          label: "Start here",
          items: [
            { label: "Introduction", slug: "index" },
            { label: "Getting started", slug: "getting-started" },
          ],
        },
        {
          label: "Authoring",
          items: [
            { label: "Markdown & MDX", slug: "authoring/markdown-and-mdx" },
            { label: "Frontmatter", slug: "authoring/frontmatter" },
            { label: "Slots, snippets & imports", slug: "authoring/slots-and-imports" },
          ],
        },
        {
          label: "Design",
          items: [
            { label: "Layouts", slug: "design/layouts" },
            { label: "Themes", slug: "design/themes" },
          ],
        },
        {
          label: "Interactivity",
          items: [
            { label: "Click model", slug: "interactivity/click-model" },
            { label: "Transitions", slug: "interactivity/transitions" },
          ],
        },
        {
          label: "Rich content",
          items: [
            { label: "Code", slug: "content/code" },
            { label: "Math & diagrams", slug: "content/math-and-diagrams" },
          ],
        },
        {
          label: "Presenting",
          items: [
            { label: "Presenter mode", slug: "presenting/presenter-mode" },
            { label: "Drawing, recording & remote", slug: "presenting/drawing-and-remote" },
            { label: "Audience engagement", slug: "presenting/audience-engagement" },
          ],
        },
        {
          label: "Export",
          items: [
            { label: "Web (PDF, PNG, HTML)", slug: "export/web" },
            { label: "PowerPoint (PPTX)", slug: "export/pptx" },
          ],
        },
        {
          label: "Integrations",
          items: [
            { label: "Embedding in a site", slug: "integrations/embedding" },
            { label: "MCP server", slug: "integrations/mcp-server" },
            { label: "Marp & Slidev compatibility", slug: "integrations/marp-slidev" },
          ],
        },
        {
          label: "Reference",
          items: [{ label: "CLI", slug: "reference/cli" }],
        },
      ],
    }),
  ],
});
