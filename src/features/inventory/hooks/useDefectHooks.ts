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

// 3. Assign Technician (Now supports Partial Assignment)
export const useAssignTechnician = () => {
    const queryClient = useQueryClient();
    return useMutation({
        // Add quantity to the mutation signature
        mutationFn: async ({ defectId, technicianId, quantity }: { defectId: number, technicianId: number, quantity: number }) => {
            const response = await api.patch(`/defects/${defectId}/assign`, {
                technician_id: technicianId,
                quantity
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['defects'] });
            queryClient.invalidateQueries({ queryKey: ['technician-roster'] }); // Update workload bars
        },
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
export const useTechnicianRoster = () => {
    return useQuery({
        queryKey: ['technician-roster'],
        queryFn: async () => {
            const response = await api.get('/users/technicians/roster');

            // Step 1: Normalize the response
            const payload = response.data ? response.data : response;

            // Step 2: Catch the array no matter the nesting level
            const rosterData = payload?.data?.roster || payload?.roster || [];

            // Step 3: Ensure it strictly returns an array
            return Array.isArray(rosterData) ? rosterData : [];
        },
    });
};

// 2. Add New Technician
export const useAddTechnician = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (techData: any) => {
            const response = await api.post('/users/technicians', techData);
            return response.data;
        },
        onSuccess: () => {
            // Refresh the roster grid
            queryClient.invalidateQueries({ queryKey: ['technician-roster'] });
            // Refresh the dropdown list in the Maintenance Assignment Modal
            queryClient.invalidateQueries({ queryKey: ['technicians'] });
        },
    });
};
// 3. Update Technician
export const useUpdateTechnician = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: number, data: any }) => {
            const response = await api.patch(`/users/technicians/${id}`, data);
            return response.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['technician-roster'] }),
    });
};

// 4. Toggle Status (Soft Delete)
export const useToggleTechnicianStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, isActive }: { id: number, isActive: boolean }) => {
            // Re-using the general user status toggle route we built earlier!
            const response = await api.patch(`/users/${id}/status`, { isActive });
            return response.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['technician-roster'] }),
    });
};