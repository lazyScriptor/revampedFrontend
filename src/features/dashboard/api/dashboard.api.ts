import { api } from '@/lib/api';
import type { GlobalFilters } from '@/features/dashboard/types';

export const fetchDashboardConfig = async () => {
  // Cache-busting param prevents 304 stale responses after a preference reset
  const res: any = await api.get(`/dashboard/config?_t=${Date.now()}`);
  return res?.data ?? res;
};

export const resetDashboardPreference = async () => {
  await api.delete('/dashboard/preferences');
};

export const fetchKPIs = async (filters: Partial<GlobalFilters>) => {
  const res: any = await api.get('/dashboard/kpis', { params: filters });
  return res?.data ?? res;
};

export const fetchUtilizationSparkline = async (warehouseId: number | null) => {
  const res: any = await api.get('/dashboard/utilization-sparkline', {
    params: warehouseId ? { warehouseId } : {},
  });
  return res?.data ?? res;
};

export const fetchReturnsDueToday = async (warehouseId: number | null, callFilter?: string | null) => {
  const params: Record<string, any> = {};
  if (warehouseId) params.warehouseId = warehouseId;
  if (callFilter) params.callFilter = callFilter;
  const res: any = await api.get('/dashboard/returns-today', { params });
  return res?.data ?? res;
};

export const fetchMaintenanceQueue = async (warehouseId: number | null) => {
  const res: any = await api.get('/dashboard/maintenance-queue', {
    params: warehouseId ? { warehouseId } : {},
  });
  return res?.data ?? res;
};

export const fetchOpenInvoices = async (params: {
  view: 'money' | 'returns';
  olderThanDays: number;
  onlyOverdue?: boolean;
  warehouseId?: number | null;
  limit?: number;
  callFilter?: string | null;
}) => {
  const res: any = await api.get('/dashboard/open-invoices', {
    params: {
      view: params.view,
      olderThanDays: params.olderThanDays,
      onlyOverdue: params.onlyOverdue ? 1 : 0,
      ...(params.warehouseId ? { warehouseId: params.warehouseId } : {}),
      ...(params.limit ? { limit: params.limit } : {}),
      ...(params.callFilter ? { callFilter: params.callFilter } : {}),
    },
  });
  return res?.data ?? res;
};

export const fetchTemplates = async () => {
  const res: any = await api.get('/dashboard/templates');
  return res?.data ?? res;
};

export const saveTemplate = async (payload: {
  template_id?: number;
  template_name: string;
  role_id: number | null;
  layout_json: object[];
}) => {
  const res: any = payload.template_id
    ? await api.patch('/dashboard/templates', payload)
    : await api.post('/dashboard/templates', payload);
  return res?.data ?? res;
};

export const deleteTemplate = async (id: number) => {
  await api.delete(`/dashboard/templates/${id}`);
};

export const fetchEquipmentInsights = async (filters: { startDate?: string; endDate?: string; warehouseId?: number | null }) => {
  const res: any = await api.get('/dashboard/equipment-insights', {
    params: { startDate: filters.startDate, endDate: filters.endDate, ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}) },
  });
  return (res?.data ?? res) as import('@/features/reports/equipment/performance.types').EquipmentPerformance;
};
