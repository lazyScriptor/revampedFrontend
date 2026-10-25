import { useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDebounce } from "./usePosSearch";

export const CATALOG_PAGE_SIZE = 24;

// The slice of an EQUIPMENT row the POS catalog reads.
export interface CatalogEquipment {
  equipment_id: number;
  equipment_name: string;
  equipment_name_si?: string | null;
  serial_number?: string | null;
  image_url?: string | null;
  category_id?: number | null;
  EquipmentCategory?: { category_name?: string } | null;
  available_qty: number;
  is_bulk_item: boolean;
  base_rental_price: number | string;
  minimum_rental_days: number | string;
  extra_daily_rate: number | string;
}

export const dedupeById = <T extends { equipment_id: number }>(rows: T[]): T[] => {
  const seen = new Set<number>();
  return rows.filter((r) => (seen.has(r.equipment_id) ? false : (seen.add(r.equipment_id), true)));
};

interface CatalogOptions {
  search: string;
  categoryId: number | null;
  inStockOnly: boolean;
  enabled: boolean;
}

// Browse-and-search feed for the POS equipment catalog. Works with an empty
// search (plain browsing, newest first) and pages 24 at a time. "In stock only"
// is ignored while searching, so a machine someone asks for by name always shows
// up — greyed out as unavailable — instead of silently vanishing.
export const usePosEquipmentCatalog = ({ search, categoryId, inStockOnly, enabled }: CatalogOptions) => {
  const typed = search.trim();
  const debounced = useDebounce(typed, 250);
  const stockFilter = inStockOnly && debounced.length === 0;

  const query = useInfiniteQuery({
    queryKey: ["pos-equipment-catalog", { search: debounced, categoryId, stockFilter }],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const body: any = await api.get("/equipment", {
        params: {
          page: pageParam,
          limit: CATALOG_PAGE_SIZE,
          search: debounced || undefined,
          category_id: categoryId ?? undefined,
          availability: stockFilter ? "in_stock" : undefined,
        },
      });
      const data = body?.data ?? body ?? {};
      return {
        equipment: (data.equipment ?? []) as CatalogEquipment[],
        currentPage: Number(data.currentPage) || pageParam,
        totalPages: Number(data.totalPages) || 1,
        total: Number(data.total) || 0,
      };
    },
    getNextPageParam: (last) => (last.currentPage < last.totalPages ? last.currentPage + 1 : undefined),
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 30 * 1000,
  });

  // A machine must never show twice. Pages are fetched separately, so if the list shifts
  // between requests (a dispatch, an edit, an import) one machine can land on two pages.
  const items = dedupeById(query.data?.pages.flatMap((p) => p.equipment) ?? []);
  return {
    ...query,
    items,
    total: query.data?.pages[0]?.total ?? 0,
    // true while the typed text has not been sent to the server yet
    isSettling: typed !== debounced,
  };
};
