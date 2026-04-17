import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../api/category.api';

export const useCategoryList = (page: number, limit: number) => {
    return useQuery({
        queryKey: ['categories', page, limit],
        queryFn: () => fetchCategories(page, limit),
        placeholderData: keepPreviousData,
    });
};

export const useCreateCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createCategory,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
    });
};

export const useUpdateCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateCategory,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
    });
};

export const useDeleteCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteCategory,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
    });
};
export const useCategoryOptions = () => {
    return useQuery({
        queryKey: ['category-options'],
        queryFn: async () => {
            const response = await fetchCategories(1, 1000);
            return response.categories;
        },
        staleTime: 1000 * 60 * 5,
    });
};