import { api } from "@/lib/api";

export interface MyProfile {
  user_id: number;
  warehouse_id: number | null;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  nic_no: string;
  phone_number: string | null;
  address_line1: string | null;
  address_line2: string | null;
  is_active: boolean;
  avatar_url: string | null;
  job_title: string | null;
  bio: string | null;
  language: string;
  timezone: string | null;
  date_format: string;
  time_format: "12h" | "24h";
  notification_prefs: Record<string, any> | null;
  last_login_at: string | null;
  last_login_ip: string | null;
  password_changed_at: string | null;
  Roles?: Array<{ role_id: number; role_name: string; hierarchy_level: number }>;
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = (res: any) => res?.data ?? res;

export const fetchMyProfile = async (): Promise<MyProfile> => {
  const res = await api.get("/me");
  return unwrap(res).profile;
};

export type ProfileUpdatePayload = Partial<
  Pick<
    MyProfile,
    | "first_name"
    | "last_name"
    | "phone_number"
    | "address_line1"
    | "address_line2"
    | "job_title"
    | "bio"
  >
>;

export const updateMyProfile = async (payload: ProfileUpdatePayload): Promise<MyProfile> => {
  const res = await api.patch("/me", payload);
  return unwrap(res).profile;
};

export type PreferencesPayload = Partial<
  Pick<
    MyProfile,
    "language" | "timezone" | "date_format" | "time_format" | "notification_prefs"
  >
>;

export const updateMyPreferences = async (payload: PreferencesPayload): Promise<MyProfile> => {
  const res = await api.patch("/me/preferences", payload);
  return unwrap(res).profile;
};

export const changeMyPassword = async (payload: {
  currentPassword: string;
  newPassword: string;
}) => {
  await api.post("/me/change-password", payload);
};

export const uploadMyAvatar = async (file: File): Promise<MyProfile> => {
  const form = new FormData();
  form.append("avatar", file);
  const res = await api.post("/me/avatar", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrap(res).profile;
};

export const deleteMyAvatar = async (): Promise<MyProfile> => {
  const res = await api.delete("/me/avatar");
  return unwrap(res).profile;
};

export const fetchMyActivity = async (limit = 25) => {
  const res = await api.get("/me/activity", { params: { limit } });
  return unwrap(res) as {
    notifications: any[];
    bulk_jobs: any[];
  };
};

export const fetchMyRecentWork = async (limit = 10) => {
  const res = await api.get("/me/recent-work", { params: { limit } });
  return unwrap(res) as {
    recent_invoices: any[];
    recent_payments: any[];
  };
};

export const resolveAvatarUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  const origin = apiUrl?.replace(/\/api\/?$/, "") || "";
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
};
