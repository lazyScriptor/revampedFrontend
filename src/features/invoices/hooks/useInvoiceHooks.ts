import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDebounce } from './usePosSearch';

// 1. Existing List Hook
export const useInvoiceList = (page: number, limit: number) => {
    return useQuery({
        queryKey: ['invoices', page, limit],
        queryFn: async () => {
            const response = await api.get('/invoices', { params: { page, limit } });
            return response?.data || { invoices: [], totalItems: 0 };
        },
    });
};

// 2. Global Search Hook for POS Pane 1
export const useInvoiceSearch = (searchTerm: string) => {
    const debouncedSearch = useDebounce(searchTerm, 300);
    return useQuery({
        queryKey: ['invoice-search', debouncedSearch],
        queryFn: async () => {
            if (!debouncedSearch) return [];
            const response = await api.get('/invoices', { params: { search: debouncedSearch, limit: 10 } });

            // BULLETPROOF: Check multiple levels of the response object
            return response.data?.data?.invoices || response.data?.invoices || [];
        },
        enabled: debouncedSearch.length >= 1,
    });
};

// 3. Deep Fetch a Single Invoice
export const useInvoiceDetails = (invoiceId: number | null) => {
    return useQuery({
        queryKey: ['invoice', invoiceId],
        queryFn: async () => {
            if (!invoiceId) return null;
            const response = await api.get(`/invoices/${invoiceId}`);

            // BULLETPROOF: Check multiple levels of the response object
            return response.data?.data?.invoice || response.data?.invoice || null;
        },
        enabled: !!invoiceId,
    });
};

// 4. Existing Return Hook
export const useProcessReturn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { id: number, data: any }) => {
            const response = await api.post(`/invoices/${payload.id}/return`, payload.data);
            return response.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['invoice', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['equipment'] });
        },
    });
};

// 5. NEW: Continuous Payments
export const useAddPayment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { id: number, data: { amount: number, method: string, is_refund: boolean } }) => {
            const response = await api.post(`/invoices/${payload.id}/payments`, payload.data);
            return response.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['invoice', variables.id] });
        },
    });
};

// 6. NEW: Vault Toggle
export const useToggleVault = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const response = await api.patch(`/invoices/${id}/vault`);
            return response.data;
        },
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['invoice', id] });
            queryClient.invalidateQueries({ queryKey: ['invoice-search'] });
        },
    });
};