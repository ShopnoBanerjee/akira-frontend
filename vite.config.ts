import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    // src/lib/supabase.ts throws at module load when these are missing, which
    // is right for the app — a missing key should stop it at boot, not at the
    // first click. It is fatal for a test runner, though, and CI has no
    // .env.local: a test that imports anything under src/lib would die on
    // import. Stub values keep that door open. They point nowhere on purpose;
    // no test should be reaching a real Supabase.
    env: {
      VITE_SUPABASE_URL: "http://supabase.invalid",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only",
      VITE_API_BASE_URL: "http://api.invalid",
    },
  },
});
