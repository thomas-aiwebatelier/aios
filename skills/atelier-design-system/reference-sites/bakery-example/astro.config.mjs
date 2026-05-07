import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://bakkerij-example-antw-ref1.pages.dev",
  integrations: [sitemap()],
});
