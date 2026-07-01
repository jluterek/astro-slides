/**
 * URL <-> deck-location mapping. The current slide lives in the route path
 * (`/{deck}/{slide}`) and the current click step in the `?step=N` query. Both are
 * parsed defensively so a hand-typed or malformed URL degrades to slide 1, step 0.
 */

export interface DeckLocation {
  slide: number;
  step: number;
}

/** Parse the slide + step out of a pathname and query string. */
export function parseLocation(pathname: string, search: string): DeckLocation {
  const segments = pathname.split("/").filter(Boolean);
  const last = segments.at(-1);
  const slide = last ? Number.parseInt(last, 10) : Number.NaN;
  const stepRaw = new URLSearchParams(search).get("step");
  const step = stepRaw ? Number.parseInt(stepRaw, 10) : 0;
  return {
    slide: Number.isFinite(slide) && slide > 0 ? slide : 1,
    step: Number.isFinite(step) && step > 0 ? step : 0,
  };
}

/** The route path minus its trailing slide segment, e.g. `/talk/3` -> `/talk`. */
export function basePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  const idx = trimmed.lastIndexOf("/");
  return idx <= 0 ? "" : trimmed.slice(0, idx);
}

/** Build the URL (path + optional step query) for a location under `base`. */
export function buildLocation(base: string, location: DeckLocation): string {
  const path = `${base}/${location.slide}`;
  return location.step > 0 ? `${path}?step=${location.step}` : path;
}
