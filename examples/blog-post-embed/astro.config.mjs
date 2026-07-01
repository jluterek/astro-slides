import astroSlides from "@astro-slides/core";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [astroSlides()],
});
