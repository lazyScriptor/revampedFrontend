import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { fetchCategories, createCategory, updateCategory, deleteCategory, previewOrganize, applyOrganize } from '../api/category.api';

export const useCategoryList = (page: number, limit: number, search?: string) => {
    return useQuery({
        queryKey: ['categories', page, limit, search],
        queryFn: () => fetchCategories(page, limit, search),
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
            // A sub-category reads "Grinder › 4 inch" so pickers show where it belongs.
            return response.categories
                .map((c) => ({ ...c, category_name: c.parent_name ? `${c.parent_name} › ${c.category_name}` : c.category_name }))
                .sort((a, b) => a.category_name.localeCompare(b.category_name));
        },
        staleTime: 1000 * 60 * 5,
    });
};

export const useOrganizePreview = (enabled: boolean) =>
    useQuery({ queryKey: ['categories-organize-preview'], queryFn: previewOrganize, enabled, gcTime: 0 });

export const useApplyOrganize = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: applyOrganize,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['category-options'] });
            queryClient.invalidateQueries({ queryKey: ['equipment'] });
        },
    });
};
