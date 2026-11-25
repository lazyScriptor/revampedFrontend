import { api } from "@/lib/api";
import { unwrapData } from "./http";

// GET /api/me/ui-preferences -> every key for the signed-in user.
// Accepts {key: value}, {preferences: {...}} or [{pref_key, value}].
export const fetchUiPreferences = async (): Promise<Record<string, unknown>> => {
  const d = unwrapData<any>(await api.get("/me/ui-preferences"));
  const src = d?.preferences ?? d ?? {};
  if (Array.isArray(src)) {
    return Object.fromEntries(src.map((r: any) => [r.pref_key ?? r.key, r.value]));
  }
  return src as Record<string, unknown>;
};

// PUT /api/me/ui-preferences/:key {value}  (JSON, max 32 KB)
export const putUiPreference = async (key: string, value: unknown) =>
  api.put(`/me/ui-preferences/${encodeURIComponent(key)}`, { value });
