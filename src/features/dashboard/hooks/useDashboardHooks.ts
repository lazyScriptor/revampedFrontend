import { useQuery, keepPreviousData } from '@tanstack/react-query';
import * as dashboardApi from '@/features/dashboard/api/dashboard.api';
import { useDashboardStore } from '@/stores/useDashboardStore';
import type {
  KPIData,
  UtilizationData,
  ReturnsData,
  MaintenanceQueueData,
  OpenInvoicesData,
  OpenInvoicesView,
  OpenInvoiceAgeDays,
} from '@/features/dashboard/types';

/**
 * Dashboard cards are heavy queries, so they are kept for 30 minutes and saved in the browser
 * (IndexedDB, per shop and user): the dashboard opens instantly, even after a reload.
 * The refresh button next to the date filter shows how old they are and reloads on demand.
 * A save anywhere in the shop marks them out of date (data:changed, see realtimeInvalidation):
 * the money/returns lists then reload quietly, the charts wait for the refresh button.
 */
export const DASHBOARD_CACHE = {
  staleTime: 30 * 60 * 1000,
  gcTime: 24 * 60 * 60 * 1000,
  refetchOnWindowFocus: false,
  meta: { persist: true },
} as const;

export const useDashboardConfig = () => {
  const loadConfig = useDashboardStore((s) => s.loadConfig);
  return useQuery({
    queryKey: ['dashboard', 'config'],
    queryFn: async () => {
      try {
        const data = await dashboardApi.fetchDashboardConfig();
        loadConfig(data);
        return data;
      } catch (err) {
        loadConfig({ layout: [], savedFilters: null, widgetCatalog: [] });
        throw err;
      }
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useDashboardKPIs = () => {
  const filters = useDashboardStore((s) => s.globalFilters);
  return useQuery<KPIData>({
    queryKey: ['dashboard', 'kpis', filters],
    queryFn: () => dashboardApi.fetchKPIs(filters),
    ...DASHBOARD_CACHE,
  });
};

export const useUtilizationSparkline = () => {
  const warehouseId = useDashboardStore((s) => s.globalFilters.warehouseId);
  return useQuery<UtilizationData>({
    queryKey: ['dashboard', 'utilization', warehouseId],
    queryFn: () => dashboardApi.fetchUtilizationSparkline(warehouseId),
    ...DASHBOARD_CACHE,
  });
};

export const useReturnsDueToday = (callFilter?: import('@/features/collections/types').CallFilterKey | null) => {
  const warehouseId = useDashboardStore((s) => s.globalFilters.warehouseId);
  return useQuery<ReturnsData>({
    queryKey: ['dashboard', 'returns-today', warehouseId, callFilter ?? null],
    queryFn: () => dashboardApi.fetchReturnsDueToday(warehouseId, callFilter),
    ...DASHBOARD_CACHE,
  });
};

export const useMaintenanceQueue = () => {
  const warehouseId = useDashboardStore((s) => s.globalFilters.warehouseId);
  return useQuery<MaintenanceQueueData>({
    queryKey: ['dashboard', 'maintenance', warehouseId],
    queryFn: () => dashboardApi.fetchMaintenanceQueue(warehouseId),
    ...DASHBOARD_CACHE,
  });
};

export const useOpenInvoices = (
  view: OpenInvoicesView,
  olderThanDays: OpenInvoiceAgeDays,
  onlyOverdue = false,
  callFilter?: import('@/features/collections/types').CallFilterKey | null,
) => {
  const warehouseId = useDashboardStore((s) => s.globalFilters.warehouseId);
  return useQuery<OpenInvoicesData>({
    queryKey: ['dashboard', 'open-invoices', view, olderThanDays, onlyOverdue ? 1 : 0, warehouseId, callFilter ?? null],
    queryFn: () =>
      dashboardApi.fetchOpenInvoices({
        view,
        olderThanDays,
        onlyOverdue,
        warehouseId,
        ...(callFilter ? { callFilter } : {}),
      }),
    ...DASHBOARD_CACHE,
    placeholderData: keepPreviousData,
  });
};

/** Category revenue, top earners and idle machines for the dashboard's date range and depot. */
export const useEquipmentInsights = () => {
  const { startDate, endDate, warehouseId } = useDashboardStore((s) => s.globalFilters);
  return useQuery({
    queryKey: ['dashboard', 'equipment-insights', startDate, endDate, warehouseId],
    queryFn: () => dashboardApi.fetchEquipmentInsights({ startDate, endDate, warehouseId }),
    ...DASHBOARD_CACHE,
    placeholderData: keepPreviousData,
  });
};
