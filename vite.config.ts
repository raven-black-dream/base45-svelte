import { sentrySvelteKit } from "@sentry/sveltekit";
import { purgeCss } from "vite-plugin-tailwind-purgecss";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    sentrySvelteKit({
      sourceMapsUploadOptions: {
        org: "evan-harley",
        project: "base45-svelte",
      },
    }),
    sveltekit(),
    purgeCss(),
  ],
});
