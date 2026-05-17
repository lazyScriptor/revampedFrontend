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
        onSuccess: (_, tenantId) => {
            qc.invalidateQueries({ queryKey: ['sa-tenants'] });
            qc.invalidateQueries({ queryKey: ['sa-dashboard'] });
            qc.invalidateQueries({ queryKey: ['sa-tenant', tenantId] });
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
        onSuccess: (_, tenantId) => {
            qc.invalidateQueries({ queryKey: ['sa-tenants'] });
            qc.invalidateQueries({ queryKey: ['sa-dashboard'] });
            qc.invalidateQueries({ queryKey: ['sa-tenant', tenantId] });
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
        onSuccess: (_, tenantId) => {
            qc.invalidateQueries({ queryKey: ['sa-tenants'] });
            qc.invalidateQueries({ queryKey: ['sa-dashboard'] });
            qc.invalidateQueries({ queryKey: ['sa-tenant', tenantId] });
        },
    });
};

export const useUploadTenantLogo = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ tenantId, file }: { tenantId: string; file: File }) => {
            const formData = new FormData();
            formData.append('logo', file);
            const res = await api.post(`/super-admin/tenants/${tenantId}/logo`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return res.data as { tenant: Record<string, unknown>; logoUrl: string };
        },
        onSuccess: (_, { tenantId }) => {
            qc.invalidateQueries({ queryKey: ['sa-tenant', tenantId] });
            qc.invalidateQueries({ queryKey: ['sa-tenants'] });
        },
    });
};

export const useCreateTenant = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (data: {
            display_name: string;
            contact_email: string;
            admin_username: string;
            admin_password: string;
            db_name_slug: string;
            tier: string;
            monthly_rate: number;
        }) => {
            const res = await api.post('/super-admin/tenants', data);
            return res.data.tenant as Record<string, unknown>;
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
            return res.data.users as Array<{
                user_id: number;
                username: string;
                email: string;
                first_name: string;
                last_name: string;
                status: string;
                is_active: boolean;
                roles: string[];
                role_ids: number[];
            }>;
        },
        enabled: !!tenantId,
    });

export const useTenantRoles = (tenantId: string | null) =>
    useQuery({
        queryKey: ['sa-tenant-roles', tenantId],
        queryFn: async () => {
            const res = await api.get(`/super-admin/tenants/${tenantId}/roles`);
            return res.data.roles as Array<{ role_id: number; role_name: string; hierarchy_level: number }>;
        },
        enabled: !!tenantId,
    });

export const useCreateTenantUser = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ tenantId, data }: { tenantId: string; data: Record<string, unknown> }) => {
            const res = await api.post(`/super-admin/tenants/${tenantId}/users`, data);
            return res.data.user;
        },
        onSuccess: (_, { tenantId }) => {
            qc.invalidateQueries({ queryKey: ['sa-tenant-users', tenantId] });
        },
    });
};

export const useUpdateTenantUser = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ tenantId, userId, data }: { tenantId: string; userId: number; data: Record<string, unknown> }) => {
            const res = await api.patch(`/super-admin/tenants/${tenantId}/users/${userId}`, data);
            return res.data.user;
        },
        onSuccess: (_, { tenantId }) => {
            qc.invalidateQueries({ queryKey: ['sa-tenant-users', tenantId] });
        },
    });
};

export const useDeleteTenantUser = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ tenantId, userId }: { tenantId: string; userId: number }) => {
            await api.delete(`/super-admin/tenants/${tenantId}/users/${userId}`);
        },
        onSuccess: (_, { tenantId }) => {
            qc.invalidateQueries({ queryKey: ['sa-tenant-users', tenantId] });
        },
    });
};

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

// ============================================================================
// CONTACT INQUIRIES
// ============================================================================
export interface InquiryRow {
    inquiry_id: number;
    name: string;
    email: string;
    company: string | null;
    phone?: string | null;
    inquiry_type: 'demo' | 'sales' | 'support' | 'partnership' | 'other';
    status: 'new' | 'contacted' | 'qualified' | 'closed';
    message?: string;
    internal_notes?: string | null;
    source_ip?: string | null;
    user_agent?: string | null;
    referrer?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface InquiryListParams {
    page?: number;
    pageSize?: number;
    status?: string;
    inquiry_type?: string;
    search?: string;
    from_date?: string;
    to_date?: string;
}

const inquiryQS = (p: InquiryListParams) => {
    const qs = new URLSearchParams();
    Object.entries(p).forEach(([k, v]) => {
        if (v !== undefined && v !== '' && v !== null) qs.set(k, String(v));
    });
    const s = qs.toString();
    return s ? `?${s}` : '';
};

export const useInquiries = (params: InquiryListParams = {}) =>
    useQuery({
        queryKey: ['sa-inquiries', params],
        queryFn: async () => {
            const res = await api.get(`/super-admin/inquiries${inquiryQS(params)}`);
            return res.data as {
                rows: InquiryRow[];
                total: number;
                page: number;
                pageSize: number;
                totalPages: number;
            };
        },
        // 30s — inquiries don't change *that* fast, but they're not static either.
        staleTime: 30_000,
    });

export const useInquiryStats = () =>
    useQuery({
        queryKey: ['sa-inquiries-stats'],
        queryFn: async () => {
            const res = await api.get('/super-admin/inquiries/stats');
            return res.data as {
                byStatus: Record<string, number>;
                byType: Record<string, number>;
            };
        },
        staleTime: 30_000,
    });

export const useInquiry = (id: number | null) =>
    useQuery({
        queryKey: ['sa-inquiry', id],
        queryFn: async () => {
            const res = await api.get(`/super-admin/inquiries/${id}`);
            return (res.data as { inquiry: InquiryRow }).inquiry;
        },
        enabled: !!id,
    });

export const useUpdateInquiry = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            ...patch
        }: { id: number } & Partial<Pick<InquiryRow, 'status' | 'internal_notes'>>) => {
            const res = await api.patch(`/super-admin/inquiries/${id}`, patch);
            return (res.data as { inquiry: InquiryRow }).inquiry;
        },
        onSuccess: (inquiry) => {
            qc.invalidateQueries({ queryKey: ['sa-inquiries'] });
            qc.invalidateQueries({ queryKey: ['sa-inquiries-stats'] });
            qc.setQueryData(['sa-inquiry', inquiry.inquiry_id], inquiry);
        },
    });
};

export const useDeleteInquiry = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/super-admin/inquiries/${id}`);
            return id;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['sa-inquiries'] });
            qc.invalidateQueries({ queryKey: ['sa-inquiries-stats'] });
        },
    });
};
