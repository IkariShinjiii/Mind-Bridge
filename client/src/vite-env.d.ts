/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  /** "true" turns on the high-risk email alert route (client/api/alert-high-risk.ts). Off when unset. */
  readonly VITE_ALERT_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
