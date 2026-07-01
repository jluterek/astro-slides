import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

/**
 * Phase 03 renders a slide's parsed Markdown `content` to an HTML string via a unified
 * (remark → rehype) pipeline. This satisfies the "text-only" bar; full MDX/JSX-island
 * compilation lands with the runtime + component phases. Raw HTML in the source passes
 * through (`allowDangerousHtml`) since decks routinely embed it.
 */
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeStringify, { allowDangerousHtml: true });

export function renderMarkdown(md: string): string {
  return String(processor.processSync(md));
}
