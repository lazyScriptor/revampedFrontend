import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface WarehouseOption {
    warehouse_id: number;
    location_name: string;
}

export const useWarehouseOptions = () => {
    return useQuery({
        queryKey: ['warehouse-options'],
        queryFn: async (): Promise<WarehouseOption[]> => {
            const response = await api.get('/warehouses', { params: { limit: 1000 } });
            // Safely extract the array based on your backend structure
            return response.data?.warehouses || response.data?.data || response.data || [];
        },
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });
};

/** A shop with exactly one location has nothing to choose, so location choices stay out of its way. */
export const useSingleLocation = () => {
    const { data: locations = [] } = useWarehouseOptions();
    return { single: locations.length === 1, only: locations.length === 1 ? locations[0] : null };
};
