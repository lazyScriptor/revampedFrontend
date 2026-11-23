/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


/** Build id injected by vite.config.js (git sha on Vercel, else package version). */
declare const __APP_VERSION__: string;
