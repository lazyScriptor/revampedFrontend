import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useWarehouseOptions, type WarehouseOption } from "@/features/warehouses/hooks/useWarehouseOptions";
import { fetchStockLevels, fetchStockSummary } from "../api/stock.api";
import type { CatalogProduct } from "../api/catalog.types";
import type { LocalStockLevels, StockLevel, StockStatus, StockSummary } from "../api/stock.types";
import { useRetailPermissions } from "../catalog/useRetailCatalog";
import { useRetailSettings } from "../hooks/useRetailSettings";
import { EMPTY_LEVELS, levelKey, mergeStockLevels, statusForProduct } from "./levelsModel";

export const STOCK_LEVELS_KEY = ["retail", "stock", "levels"] as const;
export const STOCK_SUMMARY_KEY = ["retail", "stock", "summary"] as const;
export const LEVELS_REFRESH_MS = 60_000;

export interface StockLevelsState {
  levels: StockLevel[];
  warehouseId: number | null;
  warehouses: WarehouseOption[];
  levelFor: (productId: number, warehouseId?: number | null) => StockLevel | undefined;
  qtyFor: (productId: number, warehouseId?: number | null) => number;
  statusFor: (product: Pick<CatalogProduct, "product_id" | "tracking" | "reorder_level">, warehouseId?: number | null) => StockStatus;
  levelsForProduct: (productId: number) => StockLevel[];
  totalQtyAllLocations: (productId: number) => number;
  ready: boolean;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Persisted, delta-synced stock levels across all shop locations (refreshed every 60 s, on focus,
 * and after every stock mutation).
 */
export function useStockLevels(warehouseIdOverride?: number | null): StockLevelsState {
  const qc = useQueryClient();
  const { canView } = useRetailPermissions();
  const { settings } = useRetailSettings();
  const { data: warehouses = [] } = useWarehouseOptions();

  const q = useQuery<LocalStockLevels>({
    queryKey: STOCK_LEVELS_KEY,
    enabled: canView,
    meta: { persist: true },
    staleTime: 30_000,
    refetchInterval: LEVELS_REFRESH_MS,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const prev = qc.getQueryData<LocalStockLevels>(STOCK_LEVELS_KEY);
      const since = prev && Array.isArray(prev.levels) ? prev.serverTime : null;
      const payload = await fetchStockLevels({ since });
      return mergeStockLevels(prev && Array.isArray(prev.levels) ? prev : undefined, payload, !!since);
    },
  });

  const data = q.data && Array.isArray(q.data.levels) ? q.data : undefined;
  const levels = data?.levels ?? EMPTY_LEVELS.levels;

  const warehouseId = useMemo<number | null>(() => {
    if (warehouseIdOverride != null) return warehouseIdOverride;
    if (settings.defaultWarehouseId != null) {
      if (warehouses.length === 0 || warehouses.some((w) => w.warehouse_id === settings.defaultWarehouseId)) {
        return settings.defaultWarehouseId;
      }
    }
    if (warehouses.length > 0) return warehouses[0].warehouse_id;
    return levels[0]?.warehouse_id ?? null;
  }, [warehouseIdOverride, settings.defaultWarehouseId, warehouses, levels]);

  const byKey = useMemo(() => {
    const m = new Map<string, StockLevel>();
    for (const l of levels) m.set(levelKey(l.product_id, l.warehouse_id), l);
    return m;
  }, [levels]);

  const byProduct = useMemo(() => {
    const m = new Map<number, StockLevel[]>();
    for (const l of levels) {
      const list = m.get(l.product_id);
      if (list) list.push(l);
      else m.set(l.product_id, [l]);
    }
    return m;
  }, [levels]);

  const levelFor = useCallback(
    (productId: number, whId?: number | null): StockLevel | undefined => {
      const target = whId ?? warehouseId;
      if (target != null) return byKey.get(levelKey(productId, target));
      return byProduct.get(productId)?.[0];
    },
    [byKey, byProduct, warehouseId],
  );

  const qtyFor = useCallback(
    (productId: number, whId?: number | null): number => levelFor(productId, whId)?.qty_on_hand ?? 0,
    [levelFor],
  );

  const statusFor = useCallback(
    (product: Pick<CatalogProduct, "product_id" | "tracking" | "reorder_level">, whId?: number | null): StockStatus =>
      statusForProduct(product, levelFor(product.product_id, whId)),
    [levelFor],
  );

  const levelsForProduct = useCallback((productId: number): StockLevel[] => byProduct.get(productId) ?? [], [byProduct]);

  const totalQtyAllLocations = useCallback(
    (productId: number): number => (byProduct.get(productId) ?? []).reduce((sum, l) => sum + l.qty_on_hand, 0),
    [byProduct],
  );

  return {
    levels,
    warehouseId,
    warehouses,
    levelFor,
    qtyFor,
    statusFor,
    levelsForProduct,
    totalQtyAllLocations,
    ready: !!data,
    isLoading: q.isLoading,
    isError: q.isError && !data,
  };
}

export function useStockSummary(warehouseId?: number | null) {
  const { canView } = useRetailPermissions();
  return useQuery<StockSummary>({
    queryKey: [...STOCK_SUMMARY_KEY, warehouseId ?? "all"],
    enabled: canView,
    staleTime: 30_000,
    queryFn: () => fetchStockSummary(warehouseId),
  });
}

/** Refreshes stock levels, summaries, product details, and supplier item caches after any stock action. */
export function invalidateStock(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ["retail", "stock"] });
  void qc.invalidateQueries({ queryKey: ["retail", "finder", "supplier-items"] });
  void qc.invalidateQueries({ queryKey: ["retail", "product"] });
  void qc.invalidateQueries({ queryKey: ["retail", "catalog"] });
  void qc.invalidateQueries({ queryKey: ["retail", "serials"] });
}
