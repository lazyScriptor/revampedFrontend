import { z } from 'zod';

export const equipmentSchema = z.object({
  // --- General Info ---
  equipment_name: z.string().min(2, 'Name must be at least 2 characters'),
  serial_number: z.string().min(1, 'SKU / Serial Number is required'),
  category_id: z.coerce.number().min(1, 'Category is required'),
  warehouse_id: z.coerce.number().min(1, 'Warehouse location is required'),
  image_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),

  // --- Pricing & Rental Scenarios ---
  base_rental_price: z.coerce.number().min(0, 'Rate cannot be negative'),
  extra_daily_rate: z.coerce.number().min(0).optional(),
  minimum_rental_days: z.coerce.number().min(1, 'Must be at least 1 day').default(1),
  purchase_cost: z.coerce.number().min(0).optional(),

  // --- Inventory & Warranty ---
  is_bulk_item: z.boolean().default(false),
  total_owned_qty: z.coerce.number().min(1, 'Must own at least 1').default(1),
  rented_qty: z.coerce.number().min(0).default(0),
  defective_qty: z.coerce.number().min(0).default(0),
  available_qty: z.coerce.number().min(0).default(0),
  warranty_period_months: z.coerce.number().min(0).optional(),
  end_of_warranty_date: z.string().optional().or(z.literal('')),
});

export type EquipmentFormData = z.infer<typeof equipmentSchema>;

// The backend response model
export interface Equipment {
  equipment_id: number;
  equipment_name: string;
  serial_number: string;
  category_id: number;
  warehouse_id: number;
  base_rental_price: string; // Backend returns decimals as strings usually
  extra_daily_rate?: string;
  minimum_rental_days: number;
  purchase_cost?: string;
  total_owned_qty: number;
  rented_qty: number;
  defective_qty: number;
  available_qty: number;
  is_bulk_item: boolean;
  warranty_period_months?: number;
  end_of_warranty_date?: string;
  image_url?: string;
  createdAt: string;
  EquipmentCategory?: { category_name: string };
  Warehouse?: { location_name: string };
}