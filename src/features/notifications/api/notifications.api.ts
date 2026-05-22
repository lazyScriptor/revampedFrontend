import { api } from "@/lib/api";

export interface NotificationRow {
  notification_id: number;
  user_id: number;
  type: "bulk_job" | "info" | "success" | "warning" | "error" | "system";
  category: string | null;
  title: string;
  message: string | null;
  payload: any;
  link: string | null;
  read_at: string | null;
  createdAt: string;
  updatedAt: string;
}

const unwrap = (res: any) => res?.data ?? res;

export const fetchNotifications = async (params?: {
  limit?: number;
  before?: string;
  unread?: boolean;
}): Promise<NotificationRow[]> => {
  const res = await api.get("/notifications", {
    params: {
      limit: params?.limit ?? 30,
      before: params?.before,
      unread: params?.unread ? "true" : undefined,
    },
  });
  return unwrap(res).notifications || [];
};

export const fetchUnreadCount = async (): Promise<number> => {
  const res = await api.get("/notifications/unread-count");
  return unwrap(res).count ?? 0;
};

export const markNotificationRead = async (id: number) => {
  await api.patch(`/notifications/${id}/read`);
};

export const markAllNotificationsRead = async () => {
  await api.post("/notifications/mark-all-read");
};

export const deleteNotificationApi = async (id: number) => {
  await api.delete(`/notifications/${id}`);
};
