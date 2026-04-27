import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const useDefectList = () => {
    return useQuery({
        queryKey: ['defects'],
        queryFn: async () => {
            const response = await api.get('/defects');

            console.log("RAW DEFECTS API RESPONSE:", response.data);

            const rawData = response.data?.data?.logs
                || response.data?.data?.defects
                || response.data?.logs
                || response.data?.data;

            return Array.isArray(rawData) ? rawData : [];
        },
    });
};

export const useRepairDefect = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (defectId: number) => {
            // Assuming your route is router.patch('/:id/resolve', markResolved)
            const response = await api.patch(`/defects/${defectId}/resolve`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['defects'] });
            queryClient.invalidateQueries({ queryKey: ['equipment'] });
        },
    });
};