import { z } from 'zod';

export const categorySchema = z.object({
  category_name: z.string().min(2, 'Category name must be at least 2 characters'),
  description: z.string().optional().or(z.literal('')),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

export interface Category {
  category_id: number;
  category_name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  // Optional: If your backend returns the count of equipment in this category
  equipment_count?: number; 
}