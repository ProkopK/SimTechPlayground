import { defineConfig } from "vite";

// The site is served from https://<user>.github.io/SimTechPlayground/ by default.
// For a custom domain or other hosting, build with e.g. `BASE_PATH=/ npm run build`.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/SimTechPlayground/",
  build: {
    // Three.js (~750 kB, ~190 kB gzipped) is one chunk, loaded only by 3D simulations.
    chunkSizeWarningLimit: 800,
  },
});
