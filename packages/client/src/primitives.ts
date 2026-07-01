/**
 * Prop -> DOM mapping for the layout primitives. Primitives are declarative
 * `.astro` wrappers; this module holds the (testable) logic for turning their
 * props into the `--p-*` custom properties and class names the primitive CSS
 * consumes.
 */

/** Build a `--p-<key>:<value>` style string, skipping empty/undefined values. */
export function cssVars(pairs: Record<string, string | number | undefined>): string {
  return Object.entries(pairs)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `--p-${k}:${v}`)
    .join(";");
}

export type FlexBlockVariant = "features" | "metrics" | "clients" | "steps";

/** Class list for a FlexBlock of a given variant. */
export function flexBlockClass(variant: FlexBlockVariant): string {
  return `p-flexblock variant-${variant}`;
}
