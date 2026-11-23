import type { CatalogProduct } from "../api/catalog.types";
import { groupProducts, searchProducts, subtreeIds, type CatalogIndex, type ProductGroup } from "../catalog/catalogModel";

// What the Stock table shows: filters (category, saved view, words) and grouping by family.
// Kept apart from the screen so it can be tested.

export type StockView = "all" | "no_barcode" | "archived" | "recent";
export const STOCK_VIEWS: StockView[] = ["all", "no_barcode", "archived", "recent"];
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

/** Products after the category, view and word filters, and their search scores when words were typed. */
export function filterProducts(
  index: CatalogIndex,
  archived: CatalogProduct[],
  f: StockFilter,
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
  if (f.view === "recent") products = [...products].sort(idOrder).slice(0, RECENT_LIMIT);
  return { products, scores };
}

/** One row per family; best match first when words were typed, else by name (newest first in "recent"). */
export function buildRows(index: CatalogIndex, products: CatalogProduct[], scores: Map<number, number> | undefined, view: StockView): ProductGroup[] {
  const groups = groupProducts(products, index.ctx, scores);
  if (scores) return groups.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  if (view === "recent") return groups.sort((a, b) => Math.max(...b.products.map((p) => p.product_id)) - Math.max(...a.products.map((p) => p.product_id)));
  return groups.sort((a, b) => a.name.localeCompare(b.name));
}

export interface StockKpis {
  items: number;
  families: number;
  withoutBarcode: number;
}

export function stockKpis(products: CatalogProduct[]): StockKpis {
  const fam = new Set<number>();
  let withoutBarcode = 0;
  for (const p of products) {
    if (p.family_id != null) fam.add(p.family_id);
    if (!p.barcodes || p.barcodes.length === 0) withoutBarcode += 1;
  }
  return { items: products.length, families: fam.size, withoutBarcode };
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
