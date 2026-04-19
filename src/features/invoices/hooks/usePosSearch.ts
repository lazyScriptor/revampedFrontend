import { useState, useEffect } from 'react';
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

// --- Customer Search Hook ---
export const usePosCustomerSearch = (searchTerm: string) => {
    const debouncedSearch = useDebounce(searchTerm, 300); // Wait 300ms before firing API

    return useQuery({
        queryKey: ['pos-customer-search', debouncedSearch],
        queryFn: async () => {
            if (!debouncedSearch) return [];
            // Assuming your backend has or will have a search parameter like ?search= or ?q=
            const response = await api.get('/customers', { params: { search: debouncedSearch, limit: 10 } });
            return response.data?.data?.customers || response.data?.customers || [];
        },
        enabled: debouncedSearch.length >= 2, // Only search if they typed at least 2 characters
        staleTime: 1000 * 60, // Cache results for a minute to keep the POS snappy
    });
};