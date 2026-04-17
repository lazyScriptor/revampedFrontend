import { api } from '@/lib/api';

// 1. Download the CSV Template
export const downloadEquipmentTemplate = async (): Promise<Blob> => {
    const response = await api.get('/equipment/bulk/template', {
        responseType: 'blob'
    });

    // CRITICAL FIX: Check if the interceptor already unwrapped it into a Blob
    return response instanceof Blob ? response : response.data;
};

// 2. Export All Equipment to CSV
export const exportEquipmentData = async (): Promise<Blob> => {
    const response = await api.get('/equipment/bulk/export', {
        responseType: 'blob'
    });

    // Apply the same fix here
    return response instanceof Blob ? response : response.data;
};

// 3. Import Equipment via CSV (Leave this exactly as it was)
export const importEquipmentData = async (file: File): Promise<{ successCount: number; errors: any[] }> => {
    const formData = new FormData();
    formData.append('csv_file', file);

    const response = await api.post('/equipment/bulk/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data; // JSON responses are usually fine with the interceptor
};