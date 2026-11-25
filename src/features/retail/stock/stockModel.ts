import type { CatalogProduct } from "../api/catalog.types";
import type { StockLevel } from "../api/stock.types";
import { groupProducts, searchProducts, subtreeIds, type CatalogIndex, type ProductGroup } from "../catalog/catalogModel";
import { isLowStock, isNotCounted, isOutOfStock, isTrackableProduct } from "./levelsModel";

// What the Stock table shows: filters (category, saved view, words) and grouping by family.
// Kept apart from the screen so it can be tested.

export type StockView =
  | "all"
  | "low_stock"
  | "out_of_stock"
  | "not_counted"
  | "recently_received"
  | "no_barcode"
  | "archived"
  | "recent";

export const STOCK_VIEWS: StockView[] = [
  "all",
  "low_stock",
  "out_of_stock",
  "not_counted",
  "recently_received",
  "no_barcode",
  "archived",
  "recent",
];
export const RECENT_LIMIT = 100;

export interface StockFilter {
  view: StockView;
  query: string;
  /** Top-level category chosen in the rail, and an optional sub-category. */
  categoryId?: number | null;
  subCategoryId?: number | null;
}

const idOrder = (a: CatalogProduct, b: CatalogProduct) => {
  const ta = Date.parse(a.createdAt ?? "") || 0;
  const tb = Date.parse(b.createdAt ?? "") || 0;
  return tb - ta || b.product_id - a.product_id;
};

const receivedOrder = (a: CatalogProduct, b: CatalogProduct) => {
  const ta = Date.parse(a.last_received_at ?? "") || 0;
  const tb = Date.parse(b.last_received_at ?? "") || 0;
  return tb - ta || b.product_id - a.product_id;
};

/** Products after the category, view and word filters, and their search scores when words were typed. */
export function filterProducts(
  index: CatalogIndex,
  archived: CatalogProduct[],
  f: StockFilter,
  levelFor?: (productId: number) => StockLevel | undefined,
): { products: CatalogProduct[]; scores?: Map<number, number> } {
  const catId = f.subCategoryId ?? f.categoryId ?? null;
  const ids = catId != null ? subtreeIds(index.ctx, catId) : null;
  const words = f.query.trim();

  let products: CatalogProduct[];
  let scores: Map<number, number> | undefined;
  if (f.view === "archived") {
    products = archived;
    if (words) {
      const lower = words.toLowerCase().split(/\s+/);
      products = products.filter((p) => lower.every((w) => `${p.name} ${p.code} ${p.variant_label ?? ""}`.toLowerCase().includes(w)));
    }
  } else if (words) {
    scores = searchProducts(index, words, { categoryIds: ids });
    products = [...scores.keys()].map((id) => index.byId.get(id)!).filter(Boolean);
  } else {
    products = index.catalog.products;
  }
  if (ids && !(words && f.view !== "archived")) products = products.filter((p) => p.category_id != null && ids.has(p.category_id));
  if (f.view === "no_barcode") products = products.filter((p) => !p.barcodes || p.barcodes.length === 0);
  if (f.view === "low_stock") products = products.filter((p) => isLowStock(p, levelFor?.(p.product_id)));
  if (f.view === "out_of_stock") products = products.filter((p) => isOutOfStock(p, levelFor?.(p.product_id)));
  if (f.view === "not_counted") products = products.filter((p) => isNotCounted(p, levelFor?.(p.product_id)));
  if (f.view === "recently_received") {
    products = products.filter((p) => !!p.last_received_at).sort(receivedOrder).slice(0, RECENT_LIMIT);
  }
  if (f.view === "recent") products = [...products].sort(idOrder).slice(0, RECENT_LIMIT);
  return { products, scores };
}

/** One row per family; best match first when words were typed, else by name (newest first in "recent" / "recently_received"). */
export function buildRows(
  index: CatalogIndex,
  products: CatalogProduct[],
  scores: Map<number, number> | undefined,
  view: StockView,
): ProductGroup[] {
  const groups = groupProducts(products, index.ctx, scores);
  if (scores) return groups.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  if (view === "recent") {
    return groups.sort((a, b) => Math.max(...b.products.map((p) => p.product_id)) - Math.max(...a.products.map((p) => p.product_id)));
  }
  if (view === "recently_received") {
    const maxTime = (g: ProductGroup) => Math.max(...g.products.map((p) => Date.parse(p.last_received_at ?? "") || 0));
    return groups.sort((a, b) => maxTime(b) - maxTime(a) || a.name.localeCompare(b.name));
  }
  return groups.sort((a, b) => a.name.localeCompare(b.name));
}

export interface StockKpis {
  items: number;
  families: number;
  withoutBarcode: number;
  lowStock: number;
  notCounted: number;
  stockValue: number;
}

export function stockKpis(
  products: CatalogProduct[],
  levelFor?: (productId: number) => StockLevel | undefined,
): StockKpis {
  const fam = new Set<number>();
  let withoutBarcode = 0;
  let lowStock = 0;
  let notCounted = 0;
  let stockValue = 0;
  for (const p of products) {
    if (p.family_id != null) fam.add(p.family_id);
    if (!p.barcodes || p.barcodes.length === 0) withoutBarcode += 1;
    if (isTrackableProduct(p)) {
      const lvl = levelFor?.(p.product_id);
      if (isNotCounted(p, lvl)) notCounted += 1;
      if (isLowStock(p, lvl)) lowStock += 1;
      if (lvl && lvl.qty_on_hand > 0 && p.avg_cost != null) {
        stockValue += lvl.qty_on_hand * p.avg_cost;
      }
    }
  }
  return { items: products.length, families: fam.size, withoutBarcode, lowStock, notCounted, stockValue };
}

/** Items per category id, each parent including its children (the rail's counts). */
export function categoryCounts(index: CatalogIndex): Map<number, number> {
  const own = new Map<number, number>();
  for (const p of index.catalog.products) if (p.category_id != null) own.set(p.category_id, (own.get(p.category_id) ?? 0) + 1);
  const out = new Map<number, number>();
  for (const c of index.ctx.categories.values()) {
    let n = 0;
    for (const id of subtreeIds(index.ctx, c.category_id)) n += own.get(id) ?? 0;
    out.set(c.category_id, n);
  }
  return out;
}
