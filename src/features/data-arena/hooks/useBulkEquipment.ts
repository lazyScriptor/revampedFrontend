import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importEquipmentData } from '../api/bulkEquipment.api';

export const useImportEquipment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: importEquipmentData,
        onSuccess: () => {
            // Refresh the equipment table anywhere else in the app so new data appears instantly!
            queryClient.invalidateQueries({ queryKey: ['equipment'] });
        },
    });
};

// Utility function to trigger browser downloads for Blobs
export const triggerFileDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
};