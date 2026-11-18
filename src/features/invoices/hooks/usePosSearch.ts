import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// --- Custom Hook for Debouncing Keystrokes ---
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

// --- Instant local matching ---
// The server round trip takes about half a second, so the POS first shows matches from customers it
// already has, then swaps in the server's answer. Same rules as the server's customer search
// (revampedBackend_Geargrid/src/utils/customerSearch.js): name, "first last", company, NIC,
// customer ID or phone, with exact ID, then NIC, then phone matches first.

const LOCAL_INDEX_SIZE = 150;
const MAX_LOCAL_RESULTS = 15;

const phoneCore = (value: string) => value.replace(/\D/g, '').replace(/^(?:0094|94|0)/, '');

export function matchCustomersLocally(customers: any[], term: string): any[] {
    const q = term.trim().toLowerCase();
    if (!q) return [];
    const isWholeNumber = /^\d+$/.test(q);
    const nicQuery = q.replace(/\s+/g, '');
    const qPhone = phoneCore(q);
    const ranked: Array<{ c: any; tier: number }> = [];
    for (const c of customers) {
        if (!c || c.customer_delete_status) continue;
        const nic = String(c.nic_number ?? '').replace(/\s+/g, '').toLowerCase();
        const phone = phoneCore(String(c.phone_number ?? ''));
        const first = String(c.first_name ?? '').toLowerCase();
        const last = String(c.last_name ?? '').toLowerCase();
        const company = String(c.company_name ?? '').toLowerCase();
        let tier = -1;
        if (isWholeNumber && Number(q) === Number(c.customer_id)) tier = 0;
        else if (nicQuery.length >= 5 && nic && nic === nicQuery) tier = 1;
        else if (qPhone.length >= 3 && phone.includes(qPhone)) tier = 2;
        else if (
            q.length >= 2 &&
            (first.includes(q) || last.includes(q) || company.includes(q) || `${first} ${last}`.includes(q))
        ) tier = 3;
        else if (nicQuery.length >= 5 && nic.includes(nicQuery)) tier = 3;
        if (tier >= 0) ranked.push({ c, tier });
    }
    ranked.sort((a, b) => a.tier - b.tier);
    return ranked.slice(0, MAX_LOCAL_RESULTS).map((r) => r.c);
}

const fetchCustomers = async (params: Record<string, any>, signal?: AbortSignal) => {
    const response: any = await api.get('/customers', { params, signal });
    return (response?.data?.customers || response?.customers || []) as any[];
};

// --- Customer Search Hook ---
/**
 * POS customer search. `data` is the server's answer for the current text when it has one;
 * until then it shows instant local matches (`isLocal`), so results appear while typing.
 * `isLoading` stays true until the server has answered the current text, so callers that need
 * the definitive answer (such as the phone-contact fallback) still wait for it.
 */
export const usePosCustomerSearch = (searchTerm: string) => {
    const debouncedSearch = useDebounce(searchTerm, 150);
    const typed = searchTerm.trim();
    const debounced = debouncedSearch.trim();

    // Recent customers kept on hand for instant matching; fetched once, refreshed every 5 minutes.
    const index = useQuery({
        queryKey: ['pos-customer-index'],
        queryFn: ({ signal }) => fetchCustomers({ limit: LOCAL_INDEX_SIZE, skip_count: true }, signal),
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });

    const server = useQuery({
        queryKey: ['pos-customer-search', debounced],
        queryFn: ({ signal }) =>
            // `signal` cancels this request when the text changes before it returns.
            fetchCustomers({ limit: 15, skip_count: true, ...(debounced ? { search: debounced } : {}) }, signal),
        staleTime: 5 * 60 * 1000, // Cache results for 5 minutes to keep POS snappy
        gcTime: 15 * 60 * 1000,
        placeholderData: (previous) => previous,
    });

    const serverAnswered = debounced === typed && server.isSuccess && !server.isPlaceholderData;
    const local = useMemo(
        () => (typed ? matchCustomersLocally(index.data ?? [], typed) : []),
        [index.data, typed],
    );
    const useLocal = !serverAnswered && typed.length > 0 && local.length > 0;

    return {
        data: (useLocal ? local : server.data ?? []) as any[],
        /** True until the server has answered the text currently typed. */
        isLoading: !serverAnswered,
        /** True while a request to the server is in flight. */
        isFetching: server.isFetching || debounced !== typed,
        /** True while `data` is instant local matches rather than the server's answer. */
        isLocal: useLocal,
    };
};