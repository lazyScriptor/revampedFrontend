import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// We use a separate axios instance for Super Admin endpoints
// since they use a different auth cookie (superAdminToken)
const saApi = api;

// ============================================================================
// DASHBOARD
// ============================================================================
export const usePlatformDashboard = () =>
    useQuery({
        queryKey: ['sa-dashboard'],
        queryFn: async () => {
            const res = await saApi.get('/super-admin/dashboard');
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
            const res = await saApi.get('/super-admin/tenants');
            return res.data.tenants;
        },
    });

export const useTenantDetails = (tenantId: number | null) =>
    useQuery({
        queryKey: ['sa-tenant', tenantId],
        queryFn: async () => {
            const res = await saApi.get(`/super-admin/tenants/${tenantId}`);
            return res.data;
        },
        enabled: !!tenantId,
    });

export const useUpdateTenant = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            tenantId,
            updates,
        }: {
            tenantId: number;
            updates: Record<string, unknown>;
        }) => {
            const res = await saApi.patch(`/super-admin/tenants/${tenantId}`, updates);
            return res.data.tenant;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['sa-tenants'] });
        },
    });
};

export const useSuspendTenant = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (tenantId: number) => {
            const res = await saApi.post(`/super-admin/tenants/${tenantId}/suspend`);
            return res.data.tenant;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['sa-tenants'] });
        },
    });
};

export const useImpersonate = () =>
    useMutation({
        mutationFn: async ({
            tenantId,
            targetUserId,
        }: {
            tenantId: number;
            targetUserId: number;
        }) => {
            const res = await saApi.post(
                `/super-admin/tenants/${tenantId}/impersonate`,
                { targetUserId },
            );
            return res.data;
        },
    });

// ============================================================================
// AUDIT LOG
// ============================================================================
export const useAuditLog = (page: number = 1, limit: number = 50) =>
    useQuery({
        queryKey: ['sa-audit-log', page, limit],
        queryFn: async () => {
            const res = await saApi.get(
                `/super-admin/audit-log?page=${page}&limit=${limit}`,
            );
            return res.data;
        },
    });
