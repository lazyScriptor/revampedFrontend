/**
 * i18n setup — drives every translated string in the app outside the landing
 * page. Architecture:
 *
 *   1. Boot with offline fallback locales (src/i18n/locales/*.json) so the
 *      app paints something readable instantly even if the API is slow.
 *   2. On first paint or login, fetch the live pack from
 *      `${VITE_API_URL}/i18n/pack/{{lng}}` via i18next-http-backend. The DB
 *      pack overrides the offline one on top.
 *   3. Resolution order for the active language:
 *        a. URL ?lang=… (override for testing)
 *        b. localStorage (last user preference, persists across reloads)
 *        c. auth store: user.language → tenant_default_language
 *        d. browser navigator.language if Sinhala/English
 *        e. "si" — GearGrid platform default (per product spec)
 *
 * Components consume translations via `useTranslation()`:
 *
 *     const { t } = useTranslation();
 *     <Typography>{t("nav.dashboard")}</Typography>
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";

import enFallback from "./locales/en.json";
import siFallback from "./locales/si.json";

export const SUPPORTED_LANGUAGES = ["en", "si"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const PLATFORM_DEFAULT_LANGUAGE: SupportedLanguage = "si";

const STORAGE_KEY = "geargrid-language";

const apiBase = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

// Pick the best initial language based on storage / URL params. Auth state
// isn't ready yet at i18n.init() time, so we use this to make the first paint
// reasonable; the auth store calls `syncFromAuth()` after login to refine.
const detectInitialLanguage = (): SupportedLanguage => {
  if (typeof window !== "undefined") {
    const urlLang = new URLSearchParams(window.location.search).get("lang");
    if (urlLang && (SUPPORTED_LANGUAGES as readonly string[]).includes(urlLang)) {
      return urlLang as SupportedLanguage;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)) {
      return stored as SupportedLanguage;
    }
    const nav = (window.navigator.language || "").toLowerCase();
    if (nav.startsWith("si")) return "si";
    if (nav.startsWith("en")) return "en";
  }
  return PLATFORM_DEFAULT_LANGUAGE;
};

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: detectInitialLanguage(),
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    // Single bundled namespace per language — translations are nested by
    // domain (common, nav, dashboard, …) within one file.
    ns: ["translation"],
    defaultNS: "translation",
    // Seed the in-memory store with the offline fallback so the first paint
    // never shows raw keys. The HTTP backend hydrates on top.
    resources: {
      en: { translation: enFallback },
      si: { translation: siFallback },
    },
    backend: {
      loadPath: `${apiBase}/i18n/pack/{{lng}}`,
      // Add ?v=... so the browser caches by pack version. We don't have the
      // version at init time, so just timestamp-bust it once per session.
      queryStringParams: { v: Date.now().toString() },
    },
    interpolation: {
      // React already escapes by default — no need for i18next to double-escape.
      escapeValue: false,
    },
    react: {
      // We render trans-friendly markup with <Trans /> only where needed; the
      // rest uses `t()`.
      useSuspense: false,
    },
    saveMissing: false,
    // Quiet logs in production.
    debug: false,
  });

// Public helpers used elsewhere in the app

export const changeLanguage = async (lng: SupportedLanguage) => {
  await i18n.changeLanguage(lng);
  try {
    window.localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* private mode etc. */
  }
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("lang", lng);
  }
};

// Called by the auth store after login/refresh so we honor:
//   user.language → tenant_default_language → already-active language
export const syncLanguageFromAuth = async (
  userLanguage?: string | null,
  tenantDefault?: string | null,
) => {
  const next =
    (userLanguage && (SUPPORTED_LANGUAGES as readonly string[]).includes(userLanguage)
      ? userLanguage
      : undefined) ||
    (tenantDefault && (SUPPORTED_LANGUAGES as readonly string[]).includes(tenantDefault)
      ? tenantDefault
      : undefined);

  if (!next || next === i18n.language) return;
  await changeLanguage(next as SupportedLanguage);
};

// Set the <html lang> attribute on boot for screen readers / browser hints.
if (typeof document !== "undefined") {
  document.documentElement.setAttribute("lang", i18n.language);
}

export default i18n;
