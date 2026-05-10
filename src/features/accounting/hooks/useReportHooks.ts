import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ============================================================================
// DASHBOARD KPIs
// ============================================================================
export const useDashboardKPIs = (startDate?: string, endDate?: string) => {
    return useQuery({
        queryKey: ['report-dashboard', startDate, endDate],
        queryFn: async () => {
            const params: Record<string, string> = {};
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            const response: any = await api.get('/reports/dashboard', { params });
            return response?.data || response;
        },
        staleTime: 1000 * 60 * 2, // 2 min cache — financials should be fresher
    });
};

// ============================================================================
// PROFIT & LOSS
// ============================================================================
export const useProfitLoss = (startDate: string, endDate: string, enabled = true) => {
    return useQuery({
        queryKey: ['report-pnl', startDate, endDate],
        queryFn: async () => {
            const response: any = await api.get('/reports/profit-loss', {
                params: { startDate, endDate },
            });
            return response?.data || response;
        },
        enabled: !!startDate && !!endDate && enabled,
    });
};

// ============================================================================
// ACCOUNTS RECEIVABLE
// ============================================================================
export const useAccountsReceivable = (enabled = true) => {
    return useQuery({
        queryKey: ['report-ar'],
        queryFn: async () => {
            const response: any = await api.get('/reports/accounts-receivable');
            return response?.data || response;
        },
        enabled,
    });
};

// ============================================================================
// EQUIPMENT UTILIZATION
// ============================================================================
export const useEquipmentUtilization = (startDate: string, endDate: string, enabled = true) => {
    return useQuery({
        queryKey: ['report-utilization', startDate, endDate],
        queryFn: async () => {
            const response: any = await api.get('/reports/equipment-utilization', {
                params: { startDate, endDate },
            });
            return response?.data || response;
        },
        enabled: !!startDate && !!endDate && enabled,
    });
};

// ============================================================================
// MAINTENANCE COSTS
// ============================================================================
export const useMaintenanceCosts = (startDate: string, endDate: string, enabled = true) => {
    return useQuery({
        queryKey: ['report-maintenance', startDate, endDate],
        queryFn: async () => {
            const response: any = await api.get('/reports/maintenance-costs', {
                params: { startDate, endDate },
            });
            return response?.data || response;
        },
        enabled: !!startDate && !!endDate && enabled,
    });
};

// ============================================================================
// CASH FLOW
// ============================================================================
export const useCashFlow = (date: string, enabled = true) => {
    return useQuery({
        queryKey: ['report-cashflow', date],
        queryFn: async () => {
            const response: any = await api.get('/reports/cash-flow', {
                params: { date },
            });
            return response?.data || response;
        },
        enabled: !!date && enabled,
    });
};

// ============================================================================
// EXPENSES (CRUD)
// ============================================================================
export const useExpenses = (params: { page?: number; limit?: number; category?: string; startDate?: string; endDate?: string }) => {
    return useQuery({
        queryKey: ['expenses', params],
        queryFn: async () => {
            const response: any = await api.get('/expenses', { params });
            return response?.data || response;
        },
    });
};

// ============================================================================
// DOWNLOAD HELPERS (triggers browser file download)
// ============================================================================
export const downloadReport = async (
    endpoint: string,
    params: Record<string, string>,
    filename: string,
) => {
    const response = await api.get(endpoint, {
        params,
        responseType: 'blob',
    });

    // The api interceptor returns response.data, so `response` IS the blob
    const blob = response instanceof Blob ? response : new Blob([response as any]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};
