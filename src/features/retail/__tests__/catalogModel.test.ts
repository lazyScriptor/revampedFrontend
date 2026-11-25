import { describe, expect, it } from "vitest";
import { EMPTY_CATALOG, browseView, buildIndex, lookupLocal, mergeCatalog, prefillFromWords, searchGroups } from "../catalog/catalogModel";
import { compareVariantLabels, generateFamilyName, generateName, sizeVariants } from "../catalog/names";
import { changedFields, diffProduct } from "../catalog/diff";
import { ScanDetector } from "../catalog/scanDetector";
import { reorderSiblings } from "../manage/reorder";
import { aliases, brands, categories, families, payload, products, sali } from "./catalogFixtures";

const catalog = () => mergeCatalog(undefined, payload(), false);
const index = () => buildIndex(catalog());

describe("local index search", () => {
  it("finds the same item with words in any order", () => {
    const idx = index();
    for (const q of ["sali steel 6", "6mm sali", "steel bit 6 sali", "6 mm sali steel"]) {
      const g = searchGroups(idx, q);
      expect(g[0].familyId, q).toBe(1);
      expect(g[0].products.map((p) => p.product_id)).toContain(1006);
      // the 6 mm chip is the matched one, the other sizes are listed but not highlighted
      expect([...g[0].matchedIds]).toEqual([1006]);
    }
  });

  it("expands shop words: hss finds steel items", () => {
    const g = searchGroups(index(), "hss 6");
    expect(g.map((x) => x.familyId)).toEqual([1]);
  });

  it("matches a size written several ways", () => {
    const idx = index();
    expect(sizeVariants("6mm")).toEqual(expect.arrayContaining(["6mm", "6 mm", "6", "6.0"]));
    expect(searchGroups(idx, "tolsen 6 mm")[0].familyId).toBe(2);
    expect(searchGroups(idx, "tolsen 6.0")[0].familyId).toBe(2);
  });

  it("groups by family with sizes in reading order, stand-alone items alone", () => {
    const g = searchGroups(index(), "drill");
    const sali1 = g.find((x) => x.familyId === 1)!;
    expect(sali1.products.map((p) => p.variant_label)).toEqual(["3", "4", "5", "6", "8"]);
    expect(searchGroups(index(), "hose")[0].familyId).toBeNull();
    expect(compareVariantLabels("10", "3")).toBeGreaterThan(0);
  });

  it("puts an exact code or barcode first and returns nothing for a missing word", () => {
    const idx = buildIndex({ ...catalog(), products: [...products, { ...sali(12), barcodes: [{ barcode: "4791234567890" }] }] });
    expect(searchGroups(idx, "4791234567890")[0].products.some((p) => p.product_id === 1012)).toBe(true);
    expect(searchGroups(idx, "sali zzz")).toEqual([]);
  });

  it("answers fast on a big catalogue", () => {
    const many = Array.from({ length: 10000 }, (_, i) => ({ ...sali(i + 20), product_id: 50000 + i, name: `Brand${i % 50} Item ${i} steel ${i}mm`, family_id: null, code: `X${i}` }));
    const idx = buildIndex({ ...catalog(), products: many });
    const start = performance.now();
    searchGroups(idx, "brand7 steel 99", { limit: 40 });
    expect(performance.now() - start).toBeLessThan(150);
  });

  it("looks a barcode up locally, with its pack unit", () => {
    const withBox = { ...sali(6), units: [{ unit_id: 9, unit_name: "box", factor: 25 }], barcodes: [{ barcode: "111", unit_id: null }, { barcode: "222", unit_id: 9 }] };
    const idx = buildIndex({ ...catalog(), products: [withBox] });
    expect(lookupLocal(idx, "111")?.unit_id).toBeNull();
    expect(lookupLocal(idx, "222")?.unit_id).toBe(9);
    expect(lookupLocal(idx, "HW-S6")?.product.product_id).toBe(1006);
    expect(lookupLocal(idx, "nope")).toBeNull();
  });
});

describe("delta sync merge", () => {
  it("upserts changed products (duplicates are harmless) and drops archived ids", () => {
    const first = catalog();
    const delta = payload({ products: [{ ...sali(6), sell_price: 999 }, { ...sali(6), sell_price: 999 }], archived_ids: [1003], categories: undefined, brands: undefined, families: undefined, aliases: undefined, server_time: "2026-11-24T10:05:00Z" });
    const next = mergeCatalog(first, delta, true);
    expect(next.products.filter((p) => p.product_id === 1006)).toHaveLength(1);
    expect(next.products.find((p) => p.product_id === 1006)!.sell_price).toBe(999);
    expect(next.products.find((p) => p.product_id === 1003)).toBeUndefined();
    expect(next.products).toHaveLength(products.length - 1);
    expect(next.serverTime).toBe("2026-11-24T10:05:00Z");
    expect(next.categories).toEqual(first.categories); // untouched lookups survive
  });

  it("drops a product that comes back inactive; a full load replaces everything", () => {
    const first = catalog();
    const next = mergeCatalog(first, payload({ products: [{ ...sali(4), is_active: false }], categories: undefined }), true);
    expect(next.products.find((p) => p.product_id === 1004)).toBeUndefined();
    const full = mergeCatalog(first, payload({ products: [sali(3)] }), false);
    expect(full.products).toHaveLength(1);
    expect(mergeCatalog(undefined, payload({ products: [] }), true).products).toEqual([]);
    expect(EMPTY_CATALOG.products).toEqual([]);
  });
});

describe("tap-through", () => {
  it("shows only levels that have items", () => {
    const idx = index();
    const top = browseView(idx, {});
    expect(top.level).toBe("categories");
    expect(top.nodes.map((n) => n.name)).toEqual(["Drill bits", "Garden"]); // Abrasives is empty: hidden
    const subs = browseView(idx, { category: 1 });
    expect(subs.level).toBe("subcategories");
    expect(subs.nodes.map((n) => n.name)).toEqual(["Steel", "Wood"]);
    const brandsView = browseView(idx, { category: 1, subCategory: 11 });
    expect(brandsView.nodes.map((n) => n.name)).toEqual(["SALI"]);
    const items = browseView(idx, { category: 1, subCategory: 11, brand: 1 });
    expect(items.level).toBe("items");
    expect(items.groups[0].products).toHaveLength(5);
  });

  it("skips a level with nothing to choose and goes straight to items", () => {
    const view = browseView(index(), { category: 3 }); // Garden: no sub-categories, one unbranded item
    expect(view.level).toBe("items");
    expect(view.groups[0].name).toBe("Garden Hose 15m");
  });
});

describe("prefill from typed words", () => {
  it("reads brand, sub-category and sizes", () => {
    const idx = index();
    const p = prefillFromWords("sali steel 6mm", idx.ctx);
    expect(p).toMatchObject({ brandId: 1, subCategoryId: 11, categoryId: 1, sizes: ["6mm"] });
  });
});

describe("names", () => {
  it("builds '{brand} {item} {variant}{unit}' and tolerates a missing item name", () => {
    expect(generateName({ brand: "SALI", item: "Steel Drill Bit", variant: "6", unit: "mm" })).toBe("SALI Steel Drill Bit 6mm");
    expect(generateName({ brand: "SALI", item: "Cutting Wheel", variant: '4"', unit: "mm" })).toBe('SALI Cutting Wheel 4"');
    expect(generateName({ brand: "", item: "Cutting wheels", variant: "" })).toBe("Cutting wheels");
    expect(generateFamilyName({ brand: "SALI", item: "Steel Drill Bit" })).toBe("SALI Steel Drill Bit");
    expect(generateName({ brand: "Tolsen", item: "Hose", variant: "15", unit: "m", pattern: "{item} - {Brand} {size}{unit}" })).toBe("Hose - Tolsen 15m");
  });
});

describe("edits as a diff", () => {
  const base = sali(6);
  it("sends only the fields that changed, and ignores a value put back", () => {
    const { input, changed } = diffProduct(base, { sell_price: "175", contractor_price: "", reorder_level: "", name: base.name });
    expect(changed).toEqual(["sell_price"]);
    expect(input).toEqual({ sell_price: 175 });
    expect(changedFields(base, { sell_price: String(base.sell_price) })).toEqual([]);
  });
  it("flags bad numbers and a blank name; clears nullable fields", () => {
    expect(diffProduct(base, { sell_price: "abc" }).errors.sell_price).toBe("retail.sheet.badNumber");
    expect(diffProduct(base, { name: " " }).errors.name).toBe("retail.sheet.required");
    expect(diffProduct({ ...base, contractor_price: 5 }, { contractor_price: "" }).input).toEqual({ contractor_price: null });
  });
});

describe("scan detection", () => {
  const feed = (d: ScanDetector, text: string, start: number, gap: number, enter = true) => {
    let t = start;
    for (const ch of text) {
      d.feed(ch, t);
      t += gap;
    }
    return enter ? d.feed("Enter", t) : { type: "none" as const };
  };
  it("a fast burst ending in Enter is a scan", () => {
    expect(feed(new ScanDetector(), "4791234567890", 1000, 8)).toEqual({ type: "scan", code: "4791234567890" });
  });
  it("normal typing is never a scan", () => {
    expect(feed(new ScanDetector(), "sali steel", 1000, 120)).toEqual({ type: "none" });
  });
  it("too short or interrupted bursts are not scans", () => {
    expect(feed(new ScanDetector(), "ab", 0, 5)).toEqual({ type: "none" });
    const d = new ScanDetector();
    "12345".split("").forEach((c, i) => d.feed(c, i * 5));
    d.feed("Backspace", 30);
    expect(d.feed("Enter", 35)).toEqual({ type: "none" });
  });
  it("a slow first key does not poison the burst after it", () => {
    const d = new ScanDetector();
    d.feed("x", 0);
    expect(feed(d, "98765", 5000, 10)).toEqual({ type: "scan", code: "98765" });
  });
});

describe("reordering", () => {
  it("returns only the rows whose order changed", () => {
    const list = [{ id: 1, sort_order: 0 }, { id: 2, sort_order: 10 }, { id: 3, sort_order: 20 }];
    expect(reorderSiblings(list, 1, -1)).toEqual([{ id: 2, sort_order: 0 }, { id: 1, sort_order: 10 }]);
    expect(reorderSiblings(list, 0, -1)).toEqual([]);
  });
});

void [categories, brands, families, aliases];
