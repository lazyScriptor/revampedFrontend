import { useQuery, useMutation, useQueryClient, keepPreviousData, type QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { callContract } from '@/lib/callContract';
import { VaultToggleContract } from '@geargrid/contracts';
import { useDebounce } from './usePosSearch';

// features/invoices/hooks/useInvoiceHooks.ts
export const useInvoiceList = (page: number, limit: number, status?: string, ...billKindRest: [billKind?: string]) => {
    const [billKind] = billKindRest;
    return useQuery({
        // CRITICAL: Add status / billKind to the queryKey so changing tabs triggers a refetch
        queryKey: ['invoices', page, limit, status, billKind],
        placeholderData: keepPreviousData,
        queryFn: async ({ signal }) => {
            // Build the params object. If status/billKind is "All", we just don't send it.
            const params: any = { page, limit };
            if (status && status !== 'All') {
                params.status = status;
            }
            if (billKind && billKind !== 'all' && billKind !== 'All') {
                params.bill_kind = billKind;
            }

            const response: any = await api.get('/invoices', { params, signal });
            return response?.data || response || { invoices: [], totalItems: 0, counts: { all: 0, active: 0, completed: 0 } };
        },
    });
};

// 2. Global Search Hook for POS Pane 1
export const useInvoiceSearch = (searchTerm: string) => {
    const debouncedSearch = useDebounce(searchTerm, 300);
    return useQuery({
        queryKey: ['invoice-search', debouncedSearch],
        staleTime: 30 * 1000,
        queryFn: async ({ signal }) => {
            if (!debouncedSearch) return [];
            const response: any = await api.get('/invoices', { params: { search: debouncedSearch, limit: 10 }, signal });

            // BULLETPROOF: Check multiple levels of the response object
            return response.data?.data?.invoices || response.data?.invoices || response?.invoices || [];
        },
        enabled: debouncedSearch.length >= 1,
    });
};

// 3. Deep Fetch a Single Invoice
/** The same bill as a row of an already-loaded invoice list or search, if any. */
export const findInvoiceInListCache = (queryClient: QueryClient, invoiceId: number | null) => {
    if (!invoiceId) return undefined;
    for (const [, data] of queryClient.getQueriesData<any>({ queryKey: ['invoices'] })) {
        const hit = (data?.invoices || [])?.find?.((inv: any) => inv?.invoice_id === invoiceId);
        if (hit) return hit;
    }
    for (const [, data] of queryClient.getQueriesData<any>({ queryKey: ['invoice-search'] })) {
        const hit = Array.isArray(data) ? data.find((inv: any) => inv?.invoice_id === invoiceId) : undefined;
        if (hit) return hit;
    }
    return undefined;
};

export const fetchInvoiceDetails = async (invoiceId: number, signal?: AbortSignal) => {
    const response: any = await api.get(`/invoices/${invoiceId}`, { signal });
    // BULLETPROOF: Check multiple levels of the response object
    return response.data?.data?.invoice || response.data?.invoice || response?.invoice || null;
};

export const INVOICE_DETAIL_STALE_MS = 2 * 60 * 1000;

export const useInvoiceDetails = (invoiceId: number | null) => {
    const queryClient = useQueryClient();
    return useQuery({
        queryKey: ['invoice', invoiceId],
        // `signal`: switching to another bill cancels this request, so a run of quick clicks
        // doesn't leave the server answering bills nobody is looking at any more.
        queryFn: ({ signal }) => (invoiceId ? fetchInvoiceDetails(invoiceId, signal) : null),
        enabled: !!invoiceId,
        // A bill opened in the last 2 minutes shows at once; saves and data:changed notices
        // refresh it sooner.
        staleTime: INVOICE_DETAIL_STALE_MS,
        // Show the bill's list row straight away while the full copy loads. The caller sees
        // `isPlaceholderData` and keeps actions locked until the real copy arrives.
        placeholderData: () => findInvoiceInListCache(queryClient, invoiceId),
    });
};

/** Start loading a bill before it is clicked (row hover). */
export const prefetchInvoiceDetails = (queryClient: QueryClient, invoiceId: number) =>
    queryClient.prefetchQuery({
        queryKey: ['invoice', invoiceId],
        queryFn: ({ signal }) => fetchInvoiceDetails(invoiceId, signal),
        staleTime: INVOICE_DETAIL_STALE_MS,
    });

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
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'open-invoices'] });
        },
    });
};

// 5. NEW: Continuous Payments
export const useAddPayment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            id: number,
            data: {
                amount: number,
                method: string,
                is_refund: boolean,
                payment_date?: string,
                date_reason?: { key: string; note?: string },
                refund_reason?: { key: string; note?: string },
            }
        }) => {
            const response: any = await api.post(`/invoices/${payload.id}/payments`, payload.data);
            return response?.data || response;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['invoice', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'open-invoices'] });
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
        mutationFn: async (payload: { id: number, data: { transport_fee: number, discount_amount: number, discount_reason?: { key: string; note?: string } } }) => {
            const response = await api.patch(`/invoices/${payload.id}/fees`, payload.data);
            return response.data;
        },
        onSuccess: (_, variables) => {
            // Instantly refresh the right pane when the fee saves!
            queryClient.invalidateQueries({ queryKey: ['invoice', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'open-invoices'] });
        },
    });
};

// Thermal receipt printing lives in its own module (direct agent + dialog fallback)
export { handlePrintInvoice, checkPrintAgent } from "../utils/thermalPrint";
export type { PrintInvoiceOptions, PrintResult } from "../utils/thermalPrint";

// Explicit close: only when every item is back and the money is square (the server enforces it).
export const useCompleteInvoice = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { id: number, release_id_card?: boolean }) => {
            const response: any = await api.post(`/invoices/${payload.id}/complete`, { release_id_card: !!payload.release_id_card });
            return response?.data || response;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['invoice', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['customer-invoices'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'open-invoices'] });
        },
    });
};

// Undo a close (e.g. one done too early) so refunds and discounts can be recorded again.
export const useReopenInvoice = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const response: any = await api.post(`/invoices/${id}/reopen`);
            return response?.data || response;
        },
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['invoice', id] });
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'open-invoices'] });
        },
    });
};
