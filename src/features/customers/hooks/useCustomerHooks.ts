import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Customer } from '../schemas/customer.schema';

// --- API Calls ---
const fetchCustomers = async (page: number, limit: number) => {
    const response = await api.get('/customers', { params: { page, limit } });
    return {
        customers: response.data?.data?.customers || response.data?.customers || [],
        total: response.data?.data?.total || response.data?.total || 0,
    };
};

const deleteCustomer = async (id: number) => {
    await api.delete(`/customers/${id}`);
};

// --- React Query Hooks ---
export const useCustomerList = (page: number, limit: number) => {
    return useQuery({
        queryKey: ['customers', page, limit],
        queryFn: () => fetchCustomers(page, limit),
        placeholderData: keepPreviousData,
    });
};

export const useDeleteCustomer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteCustomer,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
    });
};