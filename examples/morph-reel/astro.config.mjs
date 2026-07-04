import astroSlides from "@astro-slides/core";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [astroSlides()],
});
