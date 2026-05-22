import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchMyProfile,
  updateMyProfile,
  updateMyPreferences,
  changeMyPassword,
  uploadMyAvatar,
  deleteMyAvatar,
  fetchMyActivity,
  fetchMyRecentWork,
  ProfileUpdatePayload,
  PreferencesPayload,
} from "../api/me.api";
import { useAuthStore } from "@/stores/useAuthStore";

const ME_KEY = ["me"] as const;

export const useMyProfile = () =>
  useQuery({
    queryKey: ME_KEY,
    queryFn: fetchMyProfile,
    staleTime: 5 * 60 * 1000,
  });

// Sync slim fields from the fresh /me response into the auth store so
// downstream code (AppBar, permission guards) sees the latest values.
const syncAuthStore = (profile: any) => {
  const updateUserPartial = useAuthStore.getState().updateUserPartial;
  if (!updateUserPartial) return;
  updateUserPartial({
    username: profile.username,
    email: profile.email,
    permissions: profile.permissions || useAuthStore.getState().user?.permissions || [],
  });
};

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProfileUpdatePayload) => updateMyProfile(payload),
    onSuccess: (profile) => {
      qc.setQueryData(ME_KEY, profile);
      syncAuthStore(profile);
    },
  });
};

export const useUpdatePreferences = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PreferencesPayload) => updateMyPreferences(payload),
    onSuccess: (profile) => {
      qc.setQueryData(ME_KEY, profile);
      syncAuthStore(profile);
    },
  });
};

export const useChangePassword = () =>
  useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      changeMyPassword(payload),
  });

export const useUploadAvatar = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadMyAvatar(file),
    onSuccess: (profile) => {
      qc.setQueryData(ME_KEY, profile);
      syncAuthStore(profile);
    },
  });
};

export const useDeleteAvatar = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteMyAvatar(),
    onSuccess: (profile) => {
      qc.setQueryData(ME_KEY, profile);
      syncAuthStore(profile);
    },
  });
};

export const useMyActivity = (limit = 25) =>
  useQuery({
    queryKey: ["me", "activity", limit],
    queryFn: () => fetchMyActivity(limit),
    staleTime: 60_000,
  });

export const useMyRecentWork = (limit = 10) =>
  useQuery({
    queryKey: ["me", "recent-work", limit],
    queryFn: () => fetchMyRecentWork(limit),
    staleTime: 60_000,
  });
