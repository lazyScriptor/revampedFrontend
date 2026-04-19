import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDebounce } from './usePosSearch'; // Reusing the debounce hook we made earlier

export const usePosEquipmentSearch = (searchTerm: string) => {
    const debouncedSearch = useDebounce(searchTerm, 300);

    return useQuery({
        queryKey: ['pos-equipment-search', debouncedSearch],
        queryFn: async () => {
            if (!debouncedSearch) return [];
            const response = await api.get('/equipment', { params: { search: debouncedSearch, limit: 10 } });
            return response.data?.data?.equipment || response.data?.equipment || [];
        },
        enabled: debouncedSearch.length >= 2,
        staleTime: 1000 * 60,
    });
};