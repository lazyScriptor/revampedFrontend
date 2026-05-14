import { useQuery } from '@tanstack/react-query';
import * as dashboardApi from '@/features/dashboard/api/dashboard.api';
import { useDashboardStore } from '@/stores/useDashboardStore';
import type { KPIData, UtilizationData, ReturnsData, MaintenanceQueueData } from '@/features/dashboard/types';

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
    staleTime: 1000 * 60 * 5,
  });
};

export const useUtilizationSparkline = () => {
  const warehouseId = useDashboardStore((s) => s.globalFilters.warehouseId);
  return useQuery<UtilizationData>({
    queryKey: ['dashboard', 'utilization', warehouseId],
    queryFn: () => dashboardApi.fetchUtilizationSparkline(warehouseId),
    staleTime: 1000 * 60 * 5,
  });
};

export const useReturnsDueToday = () => {
  const warehouseId = useDashboardStore((s) => s.globalFilters.warehouseId);
  return useQuery<ReturnsData>({
    queryKey: ['dashboard', 'returns-today', warehouseId],
    queryFn: () => dashboardApi.fetchReturnsDueToday(warehouseId),
    staleTime: 1000 * 60 * 5,
  });
};

export const useMaintenanceQueue = () => {
  const warehouseId = useDashboardStore((s) => s.globalFilters.warehouseId);
  return useQuery<MaintenanceQueueData>({
    queryKey: ['dashboard', 'maintenance', warehouseId],
    queryFn: () => dashboardApi.fetchMaintenanceQueue(warehouseId),
    staleTime: 1000 * 60 * 5,
  });
};
