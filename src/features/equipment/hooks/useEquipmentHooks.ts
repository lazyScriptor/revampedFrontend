import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  fetchEquipment,
  createEquipment,
  deleteEquipment,
  updateEquipment,
  bulkUpdateEquipment,
  type EquipmentFilters,
} from '../api/equipment.api';

// Hook for fetching data — filters are optional and stable across calls.
export const useEquipmentList = (
  page: number,
  limit: number,
  filters: EquipmentFilters = {},
) => {
  return useQuery({
    queryKey: ['equipment', page, limit, filters],
    queryFn: () => fetchEquipment(page, limit, filters),
    placeholderData: keepPreviousData, // Keeps the old rows visible while fetching the next page (amazing UX)
  });
};

// Hook for creating data (with auto-cache invalidation)
export const useCreateEquipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEquipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-stats'] });
    },
  });
};

export const useDeleteEquipment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEquipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-stats'] });
    },
  });
};

export const useUpdateEquipment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateEquipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-stats'] });
    },
  });
};

export const useBulkUpdateEquipment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkUpdateEquipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-stats'] });
    },
  });
};

export interface EquipmentStats {
  totalModels: number;
  totalUnitsOwned: number;
  availableUnits: number;
  rentedUnits: number;
  maintenanceUnits: number;
}

export const useEquipmentStats = () => {
  return useQuery<EquipmentStats>({
    queryKey: ['equipment-stats'],
    queryFn: async () => {
      const res = await api.get('/equipment/stats');
      return res.data?.data || {
        totalModels: 0,
        totalUnitsOwned: 0,
        availableUnits: 0,
        rentedUnits: 0,
        maintenanceUnits: 0,
      };
    },
    staleTime: 1000 * 30,
  });
};