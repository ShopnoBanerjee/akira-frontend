import { createBrowserClient } from "@supabase/ssr";

/**
 * The Supabase client is used for exactly three things:
 *   1. auth session management,
 *   2. direct-to-Storage uploads via a signed URL the API minted,
 *   3. realtime subscriptions.
 *
 * It is never used to query application tables. If a screen seems to want
 * that, the API endpoint is missing — ask for it rather than reaching around
 * the boundary. See CLAUDE.md.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set. Copy .env.example to .env.local.",
  );
}

export const supabase = createBrowserClient(url, publishableKey);
