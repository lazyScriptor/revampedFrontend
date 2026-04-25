import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const useInvoiceList = (page: number, limit: number) => {
    return useQuery({
        queryKey: ['invoices', page, limit],
        queryFn: async () => {
            const response = await api.get('/invoices', { params: { page, limit } });
            return response?.data || { invoices: [], totalItems: 0 };
        },
    });
};

export const useProcessReturn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { id: number, data: any }) => {
            const response = await api.post(`/invoices/${payload.id}/return`, payload.data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['equipment'] }); // Refresh inventory counts!
        },
    });
};