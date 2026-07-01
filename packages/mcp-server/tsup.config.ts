import { defineConfig } from "tsup";

// The MCP server ships from the CLI, which runs under Node type-stripping and cannot
// import workspace-TS packages at runtime (the `.js`→`.ts` resolution wall). So we bundle
// the workspace deps (`@astro-slides/parser`, `@astro-slides/types`) into a single plain-JS
// artifact the CLI can `import()`. npm deps (SDK, Hono, Zod) stay external — resolved from
// node_modules at runtime. tsc emits the `.d.ts`; tsup owns the `.js`.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  outDir: "dist",
  dts: false,
  clean: false,
  sourcemap: false,
  target: "node22",
  noExternal: [/^@astro-slides\//],
});
