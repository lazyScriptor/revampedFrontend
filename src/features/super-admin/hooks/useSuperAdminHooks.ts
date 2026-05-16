import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ============================================================================
// DASHBOARD
// ============================================================================
export const usePlatformDashboard = () =>
    useQuery({
        queryKey: ['sa-dashboard'],
        queryFn: async () => {
            const res = await api.get('/super-admin/dashboard');
            return res.data;
        },
    });

// ============================================================================
// TENANTS
// ============================================================================
export const useTenants = () =>
    useQuery({
        queryKey: ['sa-tenants'],
        queryFn: async () => {
            const res = await api.get('/super-admin/tenants');
            return res.data.tenants as Record<string, unknown>[];
        },
    });

export const useTenantDetails = (tenantId: string | null) =>
    useQuery({
        queryKey: ['sa-tenant', tenantId],
        queryFn: async () => {
            const res = await api.get(`/super-admin/tenants/${tenantId}`);
            return res.data as { tenant: Record<string, unknown>; tenantConfig: Record<string, unknown> | null };
        },
        enabled: !!tenantId,
    });

export const useUpdateTenant = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ tenantId, updates }: { tenantId: string; updates: Record<string, unknown> }) => {
            const res = await api.patch(`/super-admin/tenants/${tenantId}`, updates);
            return res.data.tenant;
        },
        onSuccess: (_, { tenantId }) => {
            qc.invalidateQueries({ queryKey: ['sa-tenants'] });
            qc.invalidateQueries({ queryKey: ['sa-tenant', tenantId] });
        },
    });
};

export const useSuspendTenant = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (tenantId: string) => {
            const res = await api.post(`/super-admin/tenants/${tenantId}/suspend`);
            return res.data.tenant;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['sa-tenants'] });
            qc.invalidateQueries({ queryKey: ['sa-dashboard'] });
        },
    });
};

export const useActivateTenant = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (tenantId: string) => {
            const res = await api.post(`/super-admin/tenants/${tenantId}/activate`);
            return res.data.tenant;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['sa-tenants'] });
            qc.invalidateQueries({ queryKey: ['sa-dashboard'] });
        },
    });
};

export const useMarkTenantOverdue = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (tenantId: string) => {
            const res = await api.post(`/super-admin/tenants/${tenantId}/mark-overdue`);
            return res.data.tenant;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['sa-tenants'] });
            qc.invalidateQueries({ queryKey: ['sa-dashboard'] });
        },
    });
};

// ============================================================================
// BILLING / PAYMENTS
// ============================================================================
export const usePaymentHistory = (tenantId: string | null) =>
    useQuery({
        queryKey: ['sa-payments', tenantId],
        queryFn: async () => {
            const res = await api.get(`/super-admin/tenants/${tenantId}/payments`);
            return res.data.payments as Record<string, unknown>[];
        },
        enabled: !!tenantId,
    });

export const useRecordPayment = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ tenantId, data }: { tenantId: string; data: Record<string, unknown> }) => {
            const res = await api.post(`/super-admin/tenants/${tenantId}/payments`, data);
            return res.data.payment;
        },
        onSuccess: (_, { tenantId }) => {
            qc.invalidateQueries({ queryKey: ['sa-payments', tenantId] });
            qc.invalidateQueries({ queryKey: ['sa-tenant', tenantId] });
            qc.invalidateQueries({ queryKey: ['sa-tenants'] });
            qc.invalidateQueries({ queryKey: ['sa-dashboard'] });
        },
    });
};

// ============================================================================
// TENANT USERS
// ============================================================================
export const useTenantUsers = (tenantId: string | null) =>
    useQuery({
        queryKey: ['sa-tenant-users', tenantId],
        queryFn: async () => {
            const res = await api.get(`/super-admin/tenants/${tenantId}/users`);
            return res.data.users as Array<{ user_id: number; username: string; email: string; status: string; roles: string[] }>;
        },
        enabled: !!tenantId,
    });

// ============================================================================
// IMPERSONATION
// ============================================================================
export const useImpersonate = () =>
    useMutation({
        mutationFn: async ({ tenantId, targetUserId }: { tenantId: string; targetUserId: number }) => {
            const res = await api.post(`/super-admin/tenants/${tenantId}/impersonate`, { targetUserId });
            return res.data;
        },
    });

// ============================================================================
// GLOBAL CORS
// ============================================================================
export const useGlobalCors = () =>
    useQuery({
        queryKey: ['sa-cors'],
        queryFn: async () => {
            const res = await api.get('/super-admin/cors');
            return res.data.origins as string[];
        },
    });

export const useUpdateGlobalCors = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (origins: string[]) => {
            const res = await api.patch('/super-admin/cors', { origins });
            return res.data.origins as string[];
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['sa-cors'] });
        },
    });
};

// ============================================================================
// AUDIT LOG
// ============================================================================
export const useAuditLog = (page: number = 1, limit: number = 50) =>
    useQuery({
        queryKey: ['sa-audit-log', page, limit],
        queryFn: async () => {
            const res = await api.get(`/super-admin/audit-log?page=${page}&limit=${limit}`);
            return res.data;
        },
    });
