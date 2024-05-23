// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types

import { SupabaseClient, Session } from "@supabase/supabase-js";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      getSession(): Promise<Session | null>;
    }
    interface PageData {
      session: Session | null;
    }
    interface Platform {
      env: {
        COUNTER: DurableObjectNamespace;
      };
      context: {
        waitUntil(promise: Promise<any>): void;
      };
      caches: CacheStorage & { default: Cache };
    }
    // interface Error {}
    // interface Platform {}
  }
}
