import { sentrySvelteKit } from "@sentry/sveltekit";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    sentrySvelteKit({
      //sourceMapsUploadOptions: {
      //  org: "evan-harley",
      //  project: "base45-svelte",
      //},
    }),
    sveltekit()
  ],
});
