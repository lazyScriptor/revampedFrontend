import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CustomerFormData } from '../schemas/customer.schema';

// --- API Calls ---

// 1. Fetch all with pagination and search
const fetchCustomers = async (page: number, limit: number, search?: string) => {
    const response = await api.get('/customers', { params: { page, limit, search } });
    return {
        customers: response.data?.data?.customers || response.data?.customers || [],
        totalItems: response.data?.data?.totalItems || response.data?.totalItems || 0,
        totalPages: response.data?.data?.totalPages || response.data?.totalPages || 1,
    };
};

// 2. Fetch single customer (with relations)
const fetchCustomerById = async (id: number) => {
    const response = await api.get(`/customers/${id}`);
    return response.data?.data?.customer || response.data?.customer;
};

// 3. Create
const createCustomer = async (data: CustomerFormData) => {
    const response = await api.post('/customers', data);
    return response.data;
};

// 4. Update
const updateCustomer = async ({ id, data }: { id: number; data: Partial<CustomerFormData> }) => {
    const response = await api.patch(`/customers/${id}`, data);
    return response.data;
};

// 5. Delete (Soft Delete based on your backend)
const deleteCustomer = async (id: number) => {
    const response = await api.delete(`/customers/${id}`);
    return response.data;
};


// --- React Query Hooks ---

// Hook for fetching the paginated list (with optional search)
export const useCustomerList = (page: number, limit: number, search?: string) => {
    return useQuery({
        queryKey: ['customers', page, limit, search],
        queryFn: () => fetchCustomers(page, limit, search),
        placeholderData: keepPreviousData,
    });
};

// Hook for fetching a single customer's details (e.g., for editing or viewing profile)
export const useCustomerDetails = (id: number | null) => {
    return useQuery({
        queryKey: ['customer', id],
        queryFn: () => fetchCustomerById(id as number),
        enabled: !!id, // Only run the query if an ID is provided
    });
};

// Hook for creating a new customer
export const useCreateCustomer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createCustomer,
        onSuccess: () => {
            // Invalidate the list so the new customer appears immediately
            queryClient.invalidateQueries({ queryKey: ['customers'] });
        },
    });
};

// Hook for updating an existing customer
export const useUpdateCustomer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateCustomer,
        onSuccess: (_, variables) => {
            // Invalidate both the master list and the specific customer's detail cache
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.invalidateQueries({ queryKey: ['customer', variables.id] });
        },
    });
};

// Hook for soft-deleting a customer
export const useDeleteCustomer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteCustomer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
        },
    });
}