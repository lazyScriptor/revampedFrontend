import { z } from 'zod';

// Strict validation for creating/editing equipment
export const equipmentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  sku: z.string().min(1, 'SKU / Serial Number is required'),
  category: z.string().min(1, 'Category is required'),
  status: z.enum(['Available', 'Rented', 'Maintenance', 'Retired']).default('Available'),
  daily_rate: z.coerce.number().min(0, 'Rate cannot be negative'), // Coerce handles string-to-number from forms
  condition: z.enum(['Excellent', 'Good', 'Fair', 'Poor']).default('Excellent'),
  notes: z.string().optional(),
});

export type EquipmentFormData = z.infer<typeof equipmentSchema>;

// The full object as it returns from your database (includes IDs and timestamps)
export interface Equipment extends EquipmentFormData {
  id: number;
  tenant_id: number;
  created_at: string;
  updated_at: string;
}