import { defineConfig } from "vite";

// The site is served from https://<user>.github.io/SimTechPlayground/ by default.
// For a custom domain or other hosting, build with e.g. `BASE_PATH=/ npm run build`.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/SimTechPlayground/",
});
