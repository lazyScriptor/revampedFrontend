import { api } from '@/lib/api';

export const downloadTemplate = async (entity: string): Promise<Blob> => {
    const response = await api.get(`/${entity}/bulk/template`, { responseType: 'blob' });
    return response instanceof Blob ? response : response.data;
};

export const exportData = async (entity: string): Promise<Blob> => {
    const response = await api.get(`/${entity}/bulk/export`, { responseType: 'blob' });
    return response instanceof Blob ? response : response.data;
};

export const importData = async (entity: string, file: File): Promise<{ successCount: number; errors: any[] }> => {
    const formData = new FormData();
    formData.append('csv_file', file);
    const response = await api.post(`/${entity}/bulk/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};