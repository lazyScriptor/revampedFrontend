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
    const debouncedSearch = useDebounce(searchTerm, 200); // Wait 200ms for snappy response

    return useQuery({
        queryKey: ['pos-customer-search', debouncedSearch],
        queryFn: async () => {
            const trimmed = debouncedSearch.trim();
            const params: Record<string, any> = {
                limit: 15,
                skip_count: true,
            };
            if (trimmed.length > 0) {
                params.search = trimmed;
            }
            const response: any = await api.get('/customers', { params });
            return response?.data?.customers || response?.customers || [];
        },
        staleTime: 5 * 60 * 1000, // Cache results for 5 minutes to keep POS snappy
        gcTime: 15 * 60 * 1000,
    });
};