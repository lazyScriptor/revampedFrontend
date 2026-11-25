import { useMemo } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/useAuthStore";
import { fetchAliases, fetchBrands, fetchCatalogPayload, fetchCategories, flattenCategories } from "../api/catalog.api";
import type { CatalogProduct, LocalCatalog, RetailAlias, RetailBrand, RetailCategory } from "../api/catalog.types";
import { useRetailEnabled } from "../useRetailEnabled";
import { EMPTY_CATALOG, buildIndex, mergeCatalog, patchCatalogProducts, type CatalogIndex } from "./catalogModel";

export const CATALOG_KEY = ["retail", "catalog"] as const;
export const CATEGORIES_KEY = ["retail", "categories"] as const;
export const BRANDS_KEY = ["retail", "brands"] as const;
export const ALIASES_KEY = ["retail", "aliases"] as const;
export const CATALOG_REFRESH_MS = 60_000;

/** What the signed-in user may do in the catalogue (the server checks again on every call). */
export function useRetailPermissions() {
  const retail = useRetailEnabled();
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  return useMemo(
    () => ({
      retail,
      canView: retail && hasPermission("retail:view"),
      canManage: retail && hasPermission("retail:product_manage"),
      canCost: retail && hasPermission("retail:cost_view"),
      canLearnBarcode: retail && (hasPermission("retail:product_manage") || hasPermission("retail:stock_receive")),
      canReceive: retail && hasPermission("retail:stock_receive"),
      canAdjust: retail && hasPermission("retail:stock_adjust"),
      canBackdate: retail && hasPermission("retail:backdate"),
      canSell: retail && hasPermission("retail:sell"),
      canPriceOverride: retail && hasPermission("retail:price_override"),
      canDiscount: retail && hasPermission("retail:discount"),
      canAddUnlisted: retail && hasPermission("retail:add_unlisted"),
      canConfirmUnlisted: retail && hasPermission("retail:confirm_unlisted"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [retail, user, hasPermission],
  );
}

/**
 * The catalogue on this device (plan §7.11): the first load is everything, later loads ask only for
 * what changed since the last answer. It is persisted (meta.persist) so a cold start is instant, and
 * refreshed every 60 s, on window focus and after any catalogue save.
 */
export function useCatalogQuery() {
  const qc = useQueryClient();
  const { canView } = useRetailPermissions();
  return useQuery<LocalCatalog>({
    queryKey: CATALOG_KEY,
    enabled: canView,
    meta: { persist: true },
    staleTime: 30_000,
    refetchInterval: CATALOG_REFRESH_MS,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const prev = qc.getQueryData<LocalCatalog>(CATALOG_KEY);
      const since = prev && Array.isArray(prev.products) ? prev.serverTime : null;
      const payload = await fetchCatalogPayload(since);
      return mergeCatalog(prev && Array.isArray(prev.products) ? prev : undefined, payload, !!since);
    },
  });
}

export const useCategoriesQuery = (enabled = true) => {
  const { canView } = useRetailPermissions();
  return useQuery<RetailCategory[]>({
    queryKey: CATEGORIES_KEY,
    enabled: canView && enabled,
    meta: { persist: true },
    staleTime: 5 * 60_000,
    queryFn: fetchCategories,
  });
};
export const useBrandsQuery = (enabled = true) => {
  const { canView } = useRetailPermissions();
  return useQuery<RetailBrand[]>({ queryKey: BRANDS_KEY, enabled: canView && enabled, meta: { persist: true }, staleTime: 5 * 60_000, queryFn: fetchBrands });
};
export const useAliasesQuery = (enabled = true) => {
  const { canView } = useRetailPermissions();
  return useQuery<RetailAlias[]>({ queryKey: ALIASES_KEY, enabled: canView && enabled, staleTime: 5 * 60_000, queryFn: fetchAliases });
};

export interface RetailCatalogState {
  catalog: LocalCatalog;
  index: CatalogIndex;
  /** True once something (persisted copy or server) has been loaded. */
  ready: boolean;
  isLoading: boolean;
  isError: boolean;
}

/**
 * The catalogue plus its search index. When the catalogue answer carries no categories, brands or
 * shop words, they are loaded from their own endpoints and merged in.
 */
export function useRetailCatalog(): RetailCatalogState {
  const q = useCatalogQuery();
  const data = q.data && Array.isArray(q.data.products) ? q.data : undefined;
  const needCats = !!data && data.categories.length === 0;
  const needBrands = !!data && data.brands.length === 0;
  const needAliases = !!data && data.aliases.length === 0;
  const cats = useCategoriesQuery(needCats);
  const brands = useBrandsQuery(needBrands);
  const aliases = useAliasesQuery(needAliases);

  const catalog = useMemo<LocalCatalog>(() => {
    if (!data) return EMPTY_CATALOG;
    return {
      ...data,
      categories: needCats ? flattenCategories(cats.data ?? []) : data.categories,
      brands: needBrands ? (brands.data ?? []) : data.brands,
      aliases: needAliases ? (aliases.data ?? []) : data.aliases,
    };
  }, [data, needCats, needBrands, needAliases, cats.data, brands.data, aliases.data]);

  const index = useMemo(() => buildIndex(catalog), [catalog]);
  return { catalog, index, ready: !!data, isLoading: q.isLoading, isError: q.isError && !data };
}

/** Refreshes everything the catalogue shows after a save. Delta sync keeps this cheap. */
export function invalidateCatalog(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ["retail", "catalog"] });
  void qc.invalidateQueries({ queryKey: ["retail", "categories"] });
  void qc.invalidateQueries({ queryKey: ["retail", "brands"] });
  void qc.invalidateQueries({ queryKey: ["retail", "aliases"] });
  void qc.invalidateQueries({ queryKey: ["retail", "product"] });
  void qc.invalidateQueries({ queryKey: ["retail", "products"] });
}

/** Puts saved products into the stored catalogue straight away, then lets the delta sync confirm. */
export function patchCatalog(qc: QueryClient, products: CatalogProduct[]) {
  qc.setQueryData<LocalCatalog>(CATALOG_KEY, (prev) => patchCatalogProducts(prev, products));
}
