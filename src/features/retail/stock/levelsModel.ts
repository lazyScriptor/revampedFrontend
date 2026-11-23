import type { CatalogProduct } from "../api/catalog.types";
import type { LocalStockLevels, StockLevel, StockLevelsPayload, StockStatus } from "../api/stock.types";

// Pure helpers for the client-side stock levels cache and status calculation.
// Kept free of React/API dependencies so tests can exercise every rule directly.

export const EMPTY_LEVELS: LocalStockLevels = { serverTime: null, levels: [] };

export const levelKey = (productId: number, warehouseId: number) => `${productId}:${warehouseId}`;

/**
 * Merges a GET /retail/stock/levels response into the cached levels map.
 * When `wasDelta` is true, upserts changed rows by (product_id, warehouse_id) onto `prev`.
 */
export function mergeStockLevels(
  prev: LocalStockLevels | undefined,
  payload: StockLevelsPayload,
  wasDelta: boolean,
): LocalStockLevels {
  const base = wasDelta && prev ? prev.levels : [];
  const map = new Map<string, StockLevel>();
  for (const l of base) map.set(levelKey(l.product_id, l.warehouse_id), l);
  for (const l of payload.levels) map.set(levelKey(l.product_id, l.warehouse_id), l);
  return {
    serverTime: payload.server_time ?? prev?.serverTime ?? null,
    levels: [...map.values()],
  };
}

export const isTrackableProduct = (product: Pick<CatalogProduct, "tracking"> | null | undefined): boolean =>
  product?.tracking !== "untracked" && product?.tracking !== "service";

export const effectiveReorderLevel = (
  product: Pick<CatalogProduct, "reorder_level"> | null | undefined,
  level: StockLevel | null | undefined,
): number | null => {
  if (level?.reorder_level !== null && level?.reorder_level !== undefined) return level.reorder_level;
  if (product?.reorder_level !== null && product?.reorder_level !== undefined) return product.reorder_level;
  return null;
};

/**
 * Status rules (plan §5.6 & §7.0):
 * - untracked/service -> "untracked"
 * - counted_at == null (or missing level row) -> "not_counted" (grey)
 * - qty <= 0 -> "out" (red)
 * - qty <= effective reorder_level -> "low" (amber)
 * - otherwise -> "in_stock" (green)
 */
export function statusForProduct(
  product: Pick<CatalogProduct, "tracking" | "reorder_level"> | null | undefined,
  level: StockLevel | null | undefined,
): StockStatus {
  if (!isTrackableProduct(product)) return "untracked";
  if (!level || level.counted_at == null) return "not_counted";
  if (level.qty_on_hand <= 0) return "out";
  const threshold = effectiveReorderLevel(product, level);
  if (threshold !== null && level.qty_on_hand <= threshold) return "low";
  return "in_stock";
}

export function isLowStock(
  product: Pick<CatalogProduct, "tracking" | "reorder_level"> | null | undefined,
  level: StockLevel | null | undefined,
): boolean {
  if (!isTrackableProduct(product) || !level || level.counted_at == null) return false;
  const threshold = effectiveReorderLevel(product, level);
  return threshold !== null && level.qty_on_hand <= threshold;
}

export function isOutOfStock(
  product: Pick<CatalogProduct, "tracking"> | null | undefined,
  level: StockLevel | null | undefined,
): boolean {
  if (!isTrackableProduct(product) || !level || level.counted_at == null) return false;
  return level.qty_on_hand <= 0;
}

export function isNotCounted(
  product: Pick<CatalogProduct, "tracking"> | null | undefined,
  level: StockLevel | null | undefined,
): boolean {
  if (!isTrackableProduct(product)) return false;
  return !level || level.counted_at == null;
}

export interface GroupStockSummary {
  status: StockStatus;
  totalQty: number;
  countedCount: number;
  inStockCount: number;
  lowCount: number;
  outCount: number;
  notCountedCount: number;
}

export function groupStockSummary(
  products: CatalogProduct[],
  getLevel: (productId: number) => StockLevel | undefined,
): GroupStockSummary {
  let totalQty = 0;
  let trackableCount = 0;
  let countedCount = 0;
  let inStockCount = 0;
  let lowCount = 0;
  let outCount = 0;
  let notCountedCount = 0;

  for (const p of products) {
    if (!isTrackableProduct(p)) continue;
    trackableCount += 1;
    const lvl = getLevel(p.product_id);
    if (lvl) totalQty += lvl.qty_on_hand;
    const st = statusForProduct(p, lvl);
    if (st === "not_counted") {
      notCountedCount += 1;
    } else {
      countedCount += 1;
      if (st === "out") outCount += 1;
      else if (st === "low") lowCount += 1;
      else if (st === "in_stock") inStockCount += 1;
    }
  }

  let status: StockStatus;
  if (trackableCount === 0) status = "untracked";
  else if (countedCount === 0) status = "not_counted";
  else if (outCount === countedCount || totalQty <= 0) status = "out";
  else if (outCount > 0 || lowCount > 0) status = "low";
  else status = "in_stock";

  return { status, totalQty, countedCount, inStockCount, lowCount, outCount, notCountedCount };
}
