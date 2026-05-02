import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importData } from '../api/bulk.api';

// Shared utility to force the browser to download a Blob as a file
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

// Generic hook that can invalidate ANY query key based on what we are importing
export const useBulkImport = (entity: string, queryKeyToInvalidate: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (file: File) => importData(entity, file),
        onSuccess: () => {
            // Instantly refresh the tables across the app!
            queryClient.invalidateQueries({ queryKey: [queryKeyToInvalidate] });
        },
    });
};