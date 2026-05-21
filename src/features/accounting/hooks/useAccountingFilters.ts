import { useState, useCallback } from "react";
import { todayLocalStr, addDaysLocal } from "@/lib/dates";

export interface AccountingFilters {
  dateFrom: string;
  dateTo: string;
  status: string[];
  search: string;
  minAmount: string;
  maxAmount: string;
  category: string;
  method: string;
  warehouseId: string;
  type: string; // for journal: 'all' | 'income' | 'expense'
  page: number;
  pageSize: number;
  sortField: string;
  sortOrder: "asc" | "desc";
}

const DEFAULT_FILTERS: AccountingFilters = {
  dateFrom: addDaysLocal(todayLocalStr(), -30),
  dateTo: todayLocalStr(),
  status: [],
  search: "",
  minAmount: "",
  maxAmount: "",
  category: "",
  method: "",
  warehouseId: "",
  type: "",
  page: 1,
  pageSize: 50,
  sortField: "",
  sortOrder: "desc",
};

export function useAccountingFilters(overrides?: Partial<AccountingFilters>) {
  const [filters, setFilters] = useState<AccountingFilters>({
    ...DEFAULT_FILTERS,
    ...overrides,
  });

  const updateFilter = useCallback(
    <K extends keyof AccountingFilters>(key: K, value: AccountingFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value, page: key === "page" ? (value as number) : 1 }));
    },
    []
  );

  const updateMultiple = useCallback(
    (updates: Partial<AccountingFilters>) => {
      setFilters((prev) => ({ ...prev, ...updates, page: 1 }));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS, ...overrides });
  }, [overrides]);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setFilters((prev) => ({ ...prev, pageSize, page: 1 }));
  }, []);

  const setSorting = useCallback((field: string, order: "asc" | "desc") => {
    setFilters((prev) => ({ ...prev, sortField: field, sortOrder: order }));
  }, []);

  /** Build query params object for API calls */
  const toQueryParams = useCallback(() => {
    const params: Record<string, string> = {};
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.status.length > 0) params.status = filters.status.join(",");
    if (filters.search) params.search = filters.search;
    if (filters.minAmount) params.minAmount = filters.minAmount;
    if (filters.maxAmount) params.maxAmount = filters.maxAmount;
    if (filters.category) params.category = filters.category;
    if (filters.method) params.method = filters.method;
    if (filters.warehouseId) params.warehouse_id = filters.warehouseId;
    if (filters.type) params.type = filters.type;
    params.page = String(filters.page);
    params.pageSize = String(filters.pageSize);
    if (filters.sortField) params.sortField = filters.sortField;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;
    return params;
  }, [filters]);

  return {
    filters,
    updateFilter,
    updateMultiple,
    resetFilters,
    setPage,
    setPageSize,
    setSorting,
    toQueryParams,
  };
}
