import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CustomerFormData } from '../schemas/customer.schema';

// --- API Calls ---

export interface CustomerFilters {
    search?: string;
    customer_type?: 'Individual' | 'Business' | '';
    status?: 'Active' | 'Blacklisted' | '';
    id_retained?: 'true' | 'false' | '';
    has_parent?: 'true' | 'false' | '';
}

// 1. Fetch all with pagination, search, and faceted filters
const fetchCustomers = async (
    page: number,
    limit: number,
    filters: CustomerFilters = {},
) => {
    const params: Record<string, any> = { page, limit };
    if (filters.search?.trim()) params.search = filters.search.trim();
    if (filters.customer_type) params.customer_type = filters.customer_type;
    if (filters.status) params.status = filters.status;
    if (filters.id_retained) params.id_retained = filters.id_retained;
    if (filters.has_parent) params.has_parent = filters.has_parent;

    const response = await api.get('/customers', { params });
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

// Hook for fetching the paginated list. Accepts either a string (legacy search-only
// call sites) or a CustomerFilters object so existing pages keep working.
export const useCustomerList = (
    page: number,
    limit: number,
    filtersOrSearch?: string | CustomerFilters,
) => {
    const filters: CustomerFilters =
        typeof filtersOrSearch === 'string'
            ? { search: filtersOrSearch }
            : filtersOrSearch ?? {};
    return useQuery({
        queryKey: ['customers', page, limit, filters],
        queryFn: () => fetchCustomers(page, limit, filters),
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

export interface ParentCustomerOption {
    customer_id: number;
    customer_type: 'Individual' | 'Business';
    first_name: string;
    last_name: string;
    company_name?: string | null;
    phone_number?: string;
    nic_number?: string;
    status?: 'Active' | 'Blacklisted';
}

const fetchParentOptions = async (
    excludeId?: number | null,
    search?: string,
): Promise<ParentCustomerOption[]> => {
    const params: Record<string, any> = {};
    if (excludeId) params.exclude = excludeId;
    if (search && search.trim().length > 0) params.search = search.trim();
    const response = await api.get('/customers/parents', { params });
    return response.data?.data?.options || response.data?.options || [];
};

// Real-data dropdown for the parent-customer picker. Excludes the customer
// currently being edited so they can't be their own parent. Pass the live
// search term and the backend does the matching — same pattern as the POS
// customer search, so the dropdown stays responsive on large tenants.
export const useParentCustomerOptions = (
    excludeId?: number | null,
    enabled = true,
    search: string = '',
) => {
    return useQuery({
        queryKey: ['customer-parent-options', excludeId || 'all', search],
        queryFn: () => fetchParentOptions(excludeId, search),
        enabled,
        staleTime: 30_000,
        placeholderData: (prev) => prev,
    });
};