import { describe, expect, it } from "vitest";
import en from "../locales/en.json";
import si from "../locales/si.json";

const flatten = (o: Record<string, unknown>, p = "", out: Record<string, string> = {}) => {
  for (const [k, v] of Object.entries(o)) {
    const key = p ? `${p}.${k}` : k;
    if (v && typeof v === "object") flatten(v as Record<string, unknown>, key, out);
    else out[key] = String(v);
  }
  return out;
};
const tokens = (s: string) => (s.match(/\{\{[^}]+\}\}|<\/?[a-z]+>/gi) || []).sort().join("|");

const enFlat = flatten(en);
const siFlat = flatten(si);

describe("locale parity", () => {
  it("every English key has a Sinhala translation (run `npm run i18n:translate`)", () => {
    const missing = Object.keys(enFlat).filter((k) => !siFlat[k]);
    expect(missing).toEqual([]);
  });

  it("Sinhala keeps the same {{placeholders}} and tags as English", () => {
    const bad = Object.keys(enFlat).filter((k) => siFlat[k] && tokens(siFlat[k]) !== tokens(enFlat[k]));
    expect(bad).toEqual([]);
  });
});
