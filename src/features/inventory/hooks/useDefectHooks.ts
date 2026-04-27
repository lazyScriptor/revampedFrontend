import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// 1. Fetch Defects (Enterprise Omni-Catcher)
export const useDefectList = () => {
    return useQuery({
        queryKey: ['defects'],
        queryFn: async () => {
            const response = await api.get('/defects', { params: { limit: 500 } });

            // Step 1: Normalize the response in case an Axios Interceptor already unwrapped it
            const payload = response.data ? response.data : response;

            // Step 2: Check every possible nesting level for the array
            const rawData =
                payload?.data?.logs ||    // Standard: response.data.data.logs
                payload?.logs ||          // Unwrapped: response.data.logs
                payload?.data?.defects || // Fallback names
                payload?.defects ||
                [];

            // Step 3: Ensure it strictly returns an array to prevent UI crashes
            return Array.isArray(rawData) ? rawData : [];
        },
    });
};

// 2. Fetch Technicians (Grabbing from your existing /users route)
export const useTechnicianList = () => {
    return useQuery({
        queryKey: ['technicians'],
        queryFn: async () => {
            try {
                const response = await api.get('/users');
                const users = response.data?.data?.users || [];
                // For now, we return all users. Later you can filter by users.filter(u => u.role === 'Technician')
                return Array.isArray(users) ? users : [];
            } catch (error) {
                return []; // Fallback if route fails
            }
        },
    });
};

// 3. Assign Technician
export const useAssignTechnician = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ defectId, technicianId }: { defectId: number, technicianId: number }) => {
            const response = await api.patch(`/defects/${defectId}/assign`, { technician_id: technicianId });
            return response.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['defects'] }),
    });
};

// 4. Resolve Defect (Now supports Partial Quantities)
export const useResolveDefect = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ defectId, quantity }: { defectId: number, quantity: number }) => {
            const response = await api.patch(`/defects/${defectId}/resolve`, { quantity });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['defects'] });
            queryClient.invalidateQueries({ queryKey: ['equipment'] }); // Refresh inventory counts!
        },
    });
};