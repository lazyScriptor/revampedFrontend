import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { fetchEquipment, createEquipment, deleteEquipment, updateEquipment } from '../api/equipment.api';

// Hook for fetching data
export const useEquipmentList = (page: number, limit: number) => {
  return useQuery({
    queryKey: ['equipment', page, limit], 
    queryFn: () => fetchEquipment(page, limit),
    placeholderData: keepPreviousData, // Keeps the old rows visible while fetching the next page (amazing UX)
  });
};

// Hook for creating data (with auto-cache invalidation)
export const useCreateEquipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEquipment,
    onSuccess: () => {
      // Instantly tell the app to re-fetch the equipment list so the table updates!
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
};

export const useDeleteEquipment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEquipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
};// Add this below useCreateEquipment
export const useUpdateEquipment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateEquipment,
    onSuccess: () => {
      // Instantly refresh the table when an item is successfully edited
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
};