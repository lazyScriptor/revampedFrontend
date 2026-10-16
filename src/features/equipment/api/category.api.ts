import { api } from '@/lib/api';
import { Category, CategoryFormData } from '../schemas/category.schema';

export interface PaginatedCategoryResponse {
    categories: Category[];
    total: number;
}

export const fetchCategories = async (
  page: number,
  limit: number,
  search?: string
): Promise<PaginatedCategoryResponse> => {
  const response = await api.get('/categories', {
    params: {
      page,
      limit,
      search: search || undefined,
    },
  });

  // Safely extract data based on Express backend's structure
  const categories =
    response.data?.categories ||
    response.data?.data?.categories ||
    response.data?.data ||
    response.data ||
    [];
  const total =
    response.data?.totalItems ??
    response.data?.data?.totalItems ??
    response.data?.total ??
    response.data?.meta?.total ??
    categories.length;

  return { categories, total };
};

export const createCategory = async (data: CategoryFormData): Promise<Category> => {
    const response = await api.post('/categories', data);
    return response.data;
};

export const updateCategory = async ({ id, data }: { id: number; data: Partial<CategoryFormData> }): Promise<Category> => {
    const response = await api.put(`/categories/${id}`, data);
    return response.data;
};

export const deleteCategory = async (id: number): Promise<void> => {
    await api.delete(`/categories/${id}`);
};