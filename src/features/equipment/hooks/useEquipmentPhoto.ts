// Equipment photo: upload from this computer, ask the paired phone, reset.
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { connectSocket, getSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/useAuthStore";

export interface PhotoRequest {
  token: string;
  status: "PENDING" | "COMPLETED" | "EXPIRED" | "CANCELLED";
  equipment_id: number;
  image_url: string | null;
  expires_at: string;
  equipment?: {
    equipment_id: number;
    equipment_name: string;
    equipment_name_si?: string | null;
    serial_number?: string | null;
    image_url?: string | null;
  };
}

type Saved = { equipment_id: number; image_url: string | null };

/** Puts the new photo into every cached equipment list straight away, then refetches. */
export const applyImageToCaches = (qc: QueryClient, { equipment_id, image_url }: Saved) => {
  const patch = (rows: any[]) => rows.map((r) => (r?.equipment_id === equipment_id ? { ...r, image_url } : r));
  qc.setQueriesData({ queryKey: ["equipment"] }, (old: any) => {
    if (!old) return old;
    if (Array.isArray(old)) return patch(old);
    for (const key of ["equipment", "rows", "items", "data"]) {
      if (Array.isArray(old[key])) return { ...old, [key]: patch(old[key]) };
    }
    return old;
  });
  qc.invalidateQueries({ queryKey: ["equipment"] });
  qc.invalidateQueries({ queryKey: ["pos-equipment-catalog"] });
};

export const useUploadEquipmentImage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ equipmentId, blob, onProgress, signal }: { equipmentId: number; blob: Blob; onProgress?: (pct: number) => void; signal?: AbortSignal }) => {
      const form = new FormData();
      form.append("image", blob, blob.type === "image/webp" ? "photo.webp" : "photo.jpg");
      return api.post(`/equipment/${equipmentId}/image`, form, {
        signal,
        timeout: 120_000,
        onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
      }) as unknown as Promise<{ data: Saved }>;
    },
    onSuccess: (res) => applyImageToCaches(qc, res.data),
  });
};

export const useResetEquipmentImage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (equipmentId: number) => api.delete(`/equipment/${equipmentId}/image`) as unknown as Promise<{ data: Saved }>,
    onSuccess: (res) => applyImageToCaches(qc, res.data),
  });
};

export const useCreatePhotoRequest = () =>
  useMutation({
    mutationFn: (equipmentId: number) =>
      (api.post(`/equipment/${equipmentId}/photo-requests`) as unknown as Promise<{ data: PhotoRequest }>).then((r) => r.data),
  });

export const useCancelPhotoRequest = () =>
  useMutation({
    mutationFn: (token: string) => api.delete(`/equipment/photo-requests/${encodeURIComponent(token)}`),
  });

/** Polls a phone request while it is open — the fallback when the socket is down. */
export const usePhotoRequestStatus = (token: string | null) =>
  useQuery({
    queryKey: ["photo-request", token],
    queryFn: () =>
      (api.get(`/equipment/photo-requests/${encodeURIComponent(token!)}`) as unknown as Promise<{ data: PhotoRequest }>).then((r) => r.data),
    enabled: !!token,
    refetchInterval: (q) => (q.state.data && q.state.data.status !== "PENDING" ? false : 2500),
    retry: 1,
  });

/**
 * Live updates: refresh any open equipment list when someone changes a photo
 * (this or another counter), and report phone captures for this user.
 */
export const useEquipmentPhotoEvents = (onCaptured?: (p: { token: string; equipment_id: number; image_url: string }) => void) => {
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.token);
  useEffect(() => {
    if (!token) return;
    connectSocket();
    const socket = getSocket();
    const updated = (p: Saved) => p?.equipment_id && applyImageToCaches(qc, p);
    const captured = (p: any) => onCaptured?.(p);
    socket.on("equipment:image-updated", updated);
    socket.on("photo:captured", captured);
    return () => {
      socket.off("equipment:image-updated", updated);
      socket.off("photo:captured", captured);
    };
  }, [qc, token, onCaptured]);
};

// ── phone side (public, device_id-authorised) ──
const devicePath = (deviceId: string) => `/public/devices/${encodeURIComponent(deviceId)}/photo-requests`;

export const useDevicePendingPhotos = (deviceId: string | null, options?: { enabled?: boolean; refetchInterval?: number }) =>
  useQuery({
    queryKey: ["devices", "pending-photos", deviceId],
    queryFn: () => (api.get(devicePath(deviceId!)) as unknown as Promise<{ data: { pending: PhotoRequest[] } }>).then((r) => r.data),
    enabled: !!deviceId && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval ?? 3000,
    retry: 1,
  });

export const useDevicePhotoRequest = (deviceId: string | null, token: string) =>
  useQuery({
    queryKey: ["devices", "photo-request", deviceId, token],
    queryFn: () =>
      (api.get(`${devicePath(deviceId!)}/${encodeURIComponent(token)}`) as unknown as Promise<{ data: PhotoRequest }>).then((r) => r.data),
    enabled: !!deviceId && !!token,
    // notice quickly if the counter cancels while the camera is open
    refetchInterval: (q) => (q.state.data && q.state.data.status !== "PENDING" ? false : 5000),
    retry: 1,
  });

export const submitDevicePhoto = (deviceId: string, token: string, blob: Blob, onProgress?: (pct: number) => void) => {
  const form = new FormData();
  form.append("image", blob, blob.type === "image/webp" ? "photo.webp" : "photo.jpg");
  return api.post(`${devicePath(deviceId)}/${encodeURIComponent(token)}/photo`, form, {
    timeout: 120_000,
    onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
  });
};
