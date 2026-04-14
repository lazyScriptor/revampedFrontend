import { api } from '@/lib/api';
import { Equipment, EquipmentFormData } from '../schemas/equipment.schema';

export interface PaginatedEquipmentResponse {
  equipment: Equipment[];
  total: number;
}

// ✅ Notice we added (page: number, limit: number) here!
export const fetchEquipment = async (page: number, limit: number): Promise<PaginatedEquipmentResponse> => {
  const response = await api.get('/equipment', {
    params: { page, limit }
  });

  // Extract the array and the total count from your Express response
  const equipment = response.data?.equipment || response.data?.data || response.data || [];
  const total = response.data?.total || response.data?.meta?.total || 0;

  return { equipment, total };
};

export const createEquipment = async (data: EquipmentFormData): Promise<Equipment> => {
  const response = await api.post('/equipment', data);
  return response.data;
};

export const deleteEquipment = async (id: number): Promise<void> => {
  await api.delete(`/equipment/${id}`);
};