import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { callContract } from '@/lib/callContract';
import { VaultToggleContract } from '@geargrid/contracts';
import { useDebounce } from './usePosSearch';

// features/invoices/hooks/useInvoiceHooks.ts
export const useInvoiceList = (page: number, limit: number, status?: string) => {
    return useQuery({
        // CRITICAL: Add status to the queryKey so changing tabs triggers a refetch
        queryKey: ['invoices', page, limit, status],
        queryFn: async () => {
            // Build the params object. If status is "All", we just don't send it.
            const params: any = { page, limit };
            if (status && status !== 'All') {
                params.status = status;
            }

            const response: any = await api.get('/invoices', { params });
            return response?.data || response || { invoices: [], totalItems: 0, counts: { all: 0, active: 0, completed: 0 } };
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
            const response: any = await api.get('/invoices', { params: { search: debouncedSearch, limit: 10 } });

            // BULLETPROOF: Check multiple levels of the response object
            return response.data?.data?.invoices || response.data?.invoices || response?.invoices || [];
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
            const response: any = await api.get(`/invoices/${invoiceId}`);

            // BULLETPROOF: Check multiple levels of the response object
            return response.data?.data?.invoice || response.data?.invoice || response?.invoice || null;
        },
        enabled: !!invoiceId,
    });
};

// 4. Existing Return Hook
export const useProcessReturn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { id: number, data: any }) => {
            const response: any = await api.post(`/invoices/${payload.id}/return`, payload.data);
            return response?.data || response;
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
            const response: any = await api.post(`/invoices/${payload.id}/payments`, payload.data);
            return response?.data || response;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['invoice', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
        },
    });
};

// 6. NEW: Vault Toggle with Instant Optimistic Cache Updates
// Governed by @geargrid/contracts: VaultToggleContract (vendored copy under
// revampedFrontend/vendor/@geargrid/contracts/). `data` is typed as
// { is_id_retained_currently: boolean, id_card_status: 0|1 } and
// runtime-validated — a backend shape drift here throws loudly instead of
// silently falling through to zeros (killing the Trap 15 class).
export const useToggleVault = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) =>
            callContract(VaultToggleContract, { params: { id } }),
        onMutate: async (id: number) => {
            // Cancel outgoing refetches so they don't overwrite our optimistic update
            await queryClient.cancelQueries({ queryKey: ['invoice', id] });

            // Snapshot the previous invoice detail value
            const previousInvoice = queryClient.getQueryData(['invoice', id]);

            // Optimistically update the detail cache immediately (< 16ms feedback)
            queryClient.setQueryData(['invoice', id], (old: any) => {
                if (!old) return old;
                const nextStatus = old.id_card_status ? 0 : 1;
                return {
                    ...old,
                    id_card_status: nextStatus,
                    Customer: old.Customer
                        ? { ...old.Customer, is_id_retained_currently: Boolean(nextStatus) }
                        : old.Customer,
                };
            });

            return { previousInvoice };
        },
        onError: (_err, id, context) => {
            if (context?.previousInvoice) {
                queryClient.setQueryData(['invoice', id], context.previousInvoice);
            }
        },
        onSettled: (_, __, id) => {
            // Re-sync all affected queries with server state
            queryClient.invalidateQueries({ queryKey: ['invoice', id] });
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['invoice-search'] });
            queryClient.invalidateQueries({ queryKey: ['customers'] });
        },
    });
};

// 7. NEW: Update Dynamic Fees
export const useUpdateFees = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { id: number, data: { transport_fee: number, discount_amount: number } }) => {
            const response = await api.patch(`/invoices/${payload.id}/fees`, payload.data);
            return response.data;
        },
        onSuccess: (_, variables) => {
            // Instantly refresh the right pane when the fee saves!
            queryClient.invalidateQueries({ queryKey: ['invoice', variables.id] });
        },
    });
};

// Thermal receipt printing lives in its own module (direct agent + dialog fallback)
export { handlePrintInvoice, checkPrintAgent } from "../utils/thermalPrint";
export type { PrintInvoiceOptions, PrintResult } from "../utils/thermalPrint";
