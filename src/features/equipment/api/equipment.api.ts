import { api } from '@/lib/api';
import { Equipment, EquipmentFormData } from '../schemas/equipment.schema';

export interface PaginatedEquipmentResponse {
  equipment: Equipment[];
  total: number;
}

export interface EquipmentFilters {
  search?: string;
  category_id?: number | "";
  warehouse_id?: number | "";
}

export const fetchEquipment = async (
  page: number,
  limit: number,
  filters: EquipmentFilters = {},
): Promise<PaginatedEquipmentResponse> => {
  const params: Record<string, any> = { page, limit };
  if (filters.search?.trim()) params.search = filters.search.trim();
  if (filters.category_id) params.category_id = filters.category_id;
  if (filters.warehouse_id) params.warehouse_id = filters.warehouse_id;

  const response = await api.get('/equipment', { params });

  const equipment = response.data?.equipment || response.data?.data || response.data || [];

  // ✅ FIX: Added `|| equipment.length` at the end.
  // If the backend doesn't send a total, it will just count the items currently returned!
  const total = response.data?.total || response.data?.meta?.total || equipment.length;

  return { equipment, total };
};

export const createEquipment = async (data: EquipmentFormData): Promise<Equipment> => {
  const response = await api.post('/equipment', data);
  return response.data;
};

export const deleteEquipment = async (id: number): Promise<void> => {
  await api.delete(`/equipment/${id}`);
};
// Add this below your createEquipment function
export const updateEquipment = async ({ id, data }: { id: number; data: Partial<EquipmentFormData> }): Promise<Equipment> => {
  const response = await api.put(`/equipment/${id}`, data); // Change to .patch if your backend uses PATCH
  console.log("response", response)
  return response.data;
};