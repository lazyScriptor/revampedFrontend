import type { CatalogProduct, LocalCatalog } from "../api/catalog.types";
import type { StockLevel } from "../api/stock.types";
import { buildCtx, subtreeIds } from "../catalog/catalogModel";
import { isNotCounted, isTrackableProduct } from "./levelsModel";

export type CountMode = "count" | "opening";

export interface CountScope {
  mode: CountMode;
  categoryId: number | null;
  familyId: number | null;
}

export function filterCountProducts(
  catalog: LocalCatalog,
  levelFor: (productId: number) => StockLevel | undefined,
  scope: CountScope,
): CatalogProduct[] {
  const ctx = buildCtx(catalog);
  const catIds = scope.categoryId != null ? subtreeIds(ctx, scope.categoryId) : null;
  return catalog.products
    .filter((p) => {
      if (!isTrackableProduct(p)) return false;
      if (scope.mode === "opening" && !isNotCounted(p, levelFor(p.product_id))) return false;
      if (scope.familyId != null) return p.family_id === scope.familyId;
      if (catIds) return p.category_id != null && catIds.has(p.category_id);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface CountDiffRow {
  product: CatalogProduct;
  systemQty: number;
  countedQty: number;
  diff: number;
  unitCost: number | null;
  valueImpact: number | null;
}

export interface CountReview {
  enteredLines: CountDiffRow[];
  differences: CountDiffRow[];
  unchangedCount: number;
}

export function computeCountReview(
  products: CatalogProduct[],
  counts: Record<number, string>,
  costs: Record<number, string>,
  levelFor: (productId: number) => StockLevel | undefined,
): CountReview {
  const enteredLines: CountDiffRow[] = [];
  for (const product of products) {
    const raw = (counts[product.product_id] ?? "").trim();
    if (raw === "") continue;
    const countedQty = Number(raw);
    if (!Number.isFinite(countedQty) || countedQty < 0) continue;

    const systemQty = levelFor(product.product_id)?.qty_on_hand ?? 0;
    const diff = Math.round((countedQty - systemQty) * 1000) / 1000;

    const rawCost = (costs[product.product_id] ?? "").trim();
    const parsedCost = rawCost !== "" && Number.isFinite(Number(rawCost)) && Number(rawCost) >= 0 ? Number(rawCost) : null;
    const avgCost = product.avg_cost ?? null;
    const costForImpact = parsedCost ?? avgCost;
    const valueImpact = costForImpact !== null && costForImpact !== undefined ? Math.round(diff * costForImpact * 100) / 100 : null;

    enteredLines.push({
      product,
      systemQty,
      countedQty: Math.round(countedQty * 1000) / 1000,
      diff,
      unitCost: parsedCost,
      valueImpact,
    });
  }

  const differences = enteredLines.filter((r) => r.diff !== 0);
  const unchangedCount = enteredLines.length - differences.length;
  return { enteredLines, differences, unchangedCount };
}
