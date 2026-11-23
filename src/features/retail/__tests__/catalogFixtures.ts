import type { CatalogPayload, CatalogProduct, RetailAlias, RetailBrand, RetailCategory, RetailFamily } from "../api/catalog.types";

export const categories: RetailCategory[] = [
  { category_id: 1, parent_id: null, name: "Drill bits", icon: "Construction", sort_order: 0, item_name: "Drill Bit" },
  {
    category_id: 11,
    parent_id: 1,
    name: "Steel",
    item_name: "Steel Drill Bit",
    icon: "Construction",
    sort_order: 0,
    attributes: [{ name: "Diameter", unit: "mm", values: [3, 4, 5, 6, 8], variant: true }],
  },
  { category_id: 12, parent_id: 1, name: "Wood", item_name: "Wood Drill Bit", sort_order: 10 },
  { category_id: 2, parent_id: null, name: "Abrasives", icon: "Hardware", sort_order: 10 },
  { category_id: 3, parent_id: null, name: "Garden", icon: "Grass", sort_order: 20 },
];
export const brands: RetailBrand[] = [
  { brand_id: 1, name: "SALI" },
  { brand_id: 2, name: "Tolsen" },
];
export const families: RetailFamily[] = [
  { family_id: 1, name: "SALI Steel Drill Bit", category_id: 11, brand_id: 1, option_label: "Diameter", option_unit: "mm" },
  { family_id: 2, name: "Tolsen Wood Drill Bit", category_id: 12, brand_id: 2, option_label: "Diameter", option_unit: "mm" },
];
export const aliases: RetailAlias[] = [{ alias_id: 1, term: "hss", means: "steel" }];

let nextId = 100;
export const product = (over: Partial<CatalogProduct> = {}): CatalogProduct => ({
  product_id: nextId++,
  code: `HW-${nextId}`,
  name: "Item",
  sell_price: 100,
  base_unit: "pcs",
  tracking: "counted",
  is_active: true,
  units: [],
  barcodes: [],
  ...over,
});

export const sali = (size: number, over: Partial<CatalogProduct> = {}) =>
  product({
    product_id: 1000 + size,
    code: `HW-S${size}`,
    name: `SALI Steel Drill Bit ${size}mm`,
    family_id: 1,
    variant_label: String(size),
    category_id: 11,
    brand_id: 1,
    sell_price: 100 + size * 10,
    ...over,
  });

export const products: CatalogProduct[] = [
  ...[3, 4, 5, 6, 8].map((n) => sali(n)),
  product({ product_id: 2006, code: "HW-T6", name: "Tolsen Wood Drill Bit 6mm", family_id: 2, variant_label: "6", category_id: 12, brand_id: 2, sell_price: 90 }),
  product({ product_id: 3001, code: "HW-G1", name: "Garden Hose 15m", category_id: 3, sell_price: 2500 }),
];

export const payload = (over: Partial<CatalogPayload> = {}): CatalogPayload => ({
  server_time: "2026-11-24T10:00:00Z",
  products,
  archived_ids: [],
  categories,
  brands,
  families,
  aliases,
  ...over,
});
