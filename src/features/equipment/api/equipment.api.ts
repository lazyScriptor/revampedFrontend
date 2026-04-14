import { api } from '@/lib/api';
import { Equipment, EquipmentFormData } from '../schemas/equipment.schema';

export interface PaginatedEquipmentResponse {
  equipment: Equipment[];
  total: number;
}

export const fetchEquipment = async (page: number, limit: number): Promise<PaginatedEquipmentResponse> => {
  const response = await api.get('/equipment', {
    params: { page, limit }
  });

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