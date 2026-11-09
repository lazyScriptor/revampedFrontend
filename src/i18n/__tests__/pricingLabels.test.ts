import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const enPath = path.resolve(__dirname, "../locales/en.json");
const siPath = path.resolve(__dirname, "../locales/si.json");

const en = JSON.parse(fs.readFileSync(enPath, "utf-8"));
const si = JSON.parse(fs.readFileSync(siPath, "utf-8"));

// Helper to find all values for a given key name in a nested object
const findAllValuesForKey = (obj: any, keyName: string, prefix = ""): { path: string; value: string }[] => {
  const results: { path: string; value: string }[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${k}` : k;
    if (k === keyName && typeof v === "string") {
      results.push({ path: fullPath, value: v });
    }
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      results.push(...findAllValuesForKey(v, keyName, fullPath));
    }
  }
  return results;
};

const getNestedValue = (obj: any, keyPath: string): string | undefined => {
  return keyPath.split(".").reduce((acc, k) => (acc ? acc[k] : undefined), obj);
};

describe("Step 3.4: Pricing Label Guard", () => {
  it("base rate keys do not contain daily/Daily//day/දෛනික/දිනට", () => {
    const forbiddenPatterns = [/daily/i, /\/day/i, /දෛනික/, /දිනට/];
    const targetKeyNames = ["baseDailyRate", "dailyRate", "rate"];
    const targetPaths = ["baseDailyRate", "equipment.dailyRate", "equipment.sheet.cols.rate"];

    for (const keyPath of targetPaths) {
      const enVal = getNestedValue(en, keyPath);
      const siVal = getNestedValue(si, keyPath);
      if (enVal) {
        for (const pat of forbiddenPatterns) {
          expect(enVal, `Key ${keyPath} in en.json matched forbidden pattern ${pat}`).not.toMatch(pat);
        }
      }
      if (siVal) {
        for (const pat of forbiddenPatterns) {
          expect(siVal, `Key ${keyPath} in si.json matched forbidden pattern ${pat}`).not.toMatch(pat);
        }
      }
    }

    // Also scan all keys matching baseDailyRate across the trees
    const allEnBase = findAllValuesForKey(en, "baseDailyRate");
    const allSiBase = findAllValuesForKey(si, "baseDailyRate");

    for (const item of allEnBase) {
      for (const pat of forbiddenPatterns) {
        expect(item.value, `${item.path} in en.json matched forbidden pattern ${pat}`).not.toMatch(pat);
      }
    }
    for (const item of allSiBase) {
      for (const pat of forbiddenPatterns) {
        expect(item.value, `${item.path} in si.json matched forbidden pattern ${pat}`).not.toMatch(pat);
      }
    }
  });

  it("extra rate keys do not contain overdue/Overdue/expired/late/කල් ඉකුත්", () => {
    const forbiddenPatterns = [/overdue/i, /expired/i, /\blate\b/i, /කල් ඉකුත්/];
    const targetKeyNames = ["overdueExtraDailyRate", "appliedIfReturnedLate"];

    for (const keyName of targetKeyNames) {
      const allEn = findAllValuesForKey(en, keyName);
      const allSi = findAllValuesForKey(si, keyName);

      for (const item of allEn) {
        for (const pat of forbiddenPatterns) {
          expect(item.value, `${item.path} in en.json matched forbidden pattern ${pat}`).not.toMatch(pat);
        }
      }
      for (const item of allSi) {
        for (const pat of forbiddenPatterns) {
          expect(item.value, `${item.path} in si.json matched forbidden pattern ${pat}`).not.toMatch(pat);
        }
      }
    }
  });

  it("every key present in en.json is present in si.json with identical placeholders", () => {
    const getPlaceholders = (str: string): string[] => {
      const matches = str.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
      return matches.sort();
    };

    const missingKeys: string[] = [];
    const placeholderMismatches: string[] = [];

    const walk = (enObj: any, siObj: any, currentPath = "") => {
      for (const key of Object.keys(enObj)) {
        const fullPath = currentPath ? `${currentPath}.${key}` : key;
        if (siObj === undefined || siObj[key] === undefined) {
          missingKeys.push(fullPath);
          continue;
        }
        const enVal = enObj[key];
        const siVal = siObj[key];
        if (typeof enVal === "object" && enVal !== null && !Array.isArray(enVal)) {
          walk(enVal, siVal, fullPath);
        } else if (typeof enVal === "string") {
          const enP = getPlaceholders(enVal);
          const siP = getPlaceholders(siVal);
          if (enP.join(",") !== siP.join(",")) {
            placeholderMismatches.push(`${fullPath}: en=[${enP.join(",")}] vs si=[${siP.join(",")}]`);
          }
        }
      }
    };

    walk(en, si);
    expect(missingKeys, `Missing keys in si.json: ${missingKeys.join(", ")}`).toEqual([]);
    expect(
      placeholderMismatches,
      `Placeholder mismatches: ${placeholderMismatches.join("; ")}`
    ).toEqual([]);
  });
});
