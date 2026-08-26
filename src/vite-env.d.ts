/// <reference types="vite/client" />

/**
 * Typed environment. Without this every import.meta.env read is `any`, which
 * defeats strict mode at exactly the boundary where a missing variable causes
 * a runtime failure.
 *
 * Vite only exposes variables prefixed VITE_, and everything here ships inside
 * the JavaScript bundle — never add a secret.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
