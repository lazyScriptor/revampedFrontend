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
  availability?: string;
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
  if (filters.availability && filters.availability !== "all") {
    params.availability = filters.availability;
  }

  const response: any = await api.get('/equipment', { params });

  const body = response?.data ?? response;
  const equipment =
    body?.equipment ||
    body?.data?.equipment ||
    body?.rows ||
    (Array.isArray(body) ? body : []);

  const total = Number(
    body?.totalItems ??
    body?.total ??
    body?.data?.totalItems ??
    body?.data?.total ??
    body?.count ??
    body?.meta?.total ??
    equipment.length
  );

  return { equipment, total };
};

export const createEquipment = async (data: EquipmentFormData): Promise<Equipment> => {
  const response = await api.post('/equipment', data);
  return response.data;
};

export const deleteEquipment = async (id: number): Promise<{ archived: boolean }> => {
  const body: any = await api.delete(`/equipment/${id}`);
  return { archived: !!body?.data?.archived };
};
export const updateEquipment = async ({ id, data }: { id: number; data: Partial<EquipmentFormData> }): Promise<Equipment> => {
  const response = await api.put(`/equipment/${id}`, data);
  return response.data;
};

export interface EquipmentBulkUpdatePayload {
  ids: number[];
  updates: {
    category_id?: number | "";
    warehouse_id?: number | "";
    is_bulk_item?: boolean;
    base_rental_price?: number;
    minimum_rental_days?: number;
    extra_daily_rate?: number;
    price_adjustment?: {
      type: "percentage" | "fixed";
      field?: "both" | "base" | "extra";
      value: number;
    };
  };
}

export const bulkUpdateEquipment = async (
  payload: EquipmentBulkUpdatePayload,
): Promise<{ status: string; message: string; data: { updatedCount: number; ids: number[] } }> => {
  const response = await api.patch("/equipment/bulk", payload);
  return response.data;
};
export interface NextEquipment {
  serial_number: string;
  name_number?: number;
  equipment_name?: string;
  equipment_name_si?: string;
  base_name?: string;
  base_name_si?: string;
  category_id?: number;
  warehouse_id?: number | null;
  base_rental_price?: number | null;
  extra_daily_rate?: number | null;
  minimum_rental_days?: number;
}

/** The next automatic number and, following a picked machine, its next name and usual details. */
export const fetchNextEquipment = async (likeId?: number): Promise<NextEquipment> => {
  const body: any = await api.get('/equipment/next', { params: { like_id: likeId || undefined } });
  return body?.data;
};

export interface BulkRowError {
  row: number;
  field: string;
  code: string;
}
export type BulkSaveResult =
  | { saved: true; rows: { row: number; equipment_id: number; serial_number: string; equipment_name: string }[] }
  | { saved: false; errors: BulkRowError[] };

export const bulkSaveEquipment = async (rows: Record<string, unknown>[]): Promise<BulkSaveResult> => {
  const body: any = await api.post('/equipment/bulk-save', { rows });
  return body?.data;
};
