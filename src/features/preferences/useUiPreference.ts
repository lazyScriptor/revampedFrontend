import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRetailEnabled } from "@/features/retail/useRetailEnabled";
import { fetchUiPreferences, putUiPreference } from "@/features/retail/api/preferences.api";

// Keyed by user so a second person signing in on the same browser never sees the first one's settings.
export const uiPrefsKey = (userId: number | string | null | undefined) => ["ui-preferences", userId ?? "anon"] as const;
type PrefMap = Record<string, unknown>;

/** Loads every UI preference of the signed-in user once (after sign-in) and keeps it cached. */
export const useUiPreferencesQuery = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const retail = useRetailEnabled();
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: uiPrefsKey(userId),
    queryFn: fetchUiPreferences,
    enabled: isAuthenticated && retail,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

/**
 * One per-user UI setting (quick pad, density, shortcuts...). Reads from the cached bundle, saves
 * optimistically with PUT /api/me/ui-preferences/:key and rolls back if the server refuses.
 * `reset()` returns the key to its default (stored as null so later default changes still reach the user).
 */
export function useUiPreference<T>(key: string, defaultValue: T) {
  const qc = useQueryClient();
  const retail = useRetailEnabled();
  const userId = useAuthStore((s) => s.user?.id);
  const prefsKey = uiPrefsKey(userId);
  const { data, isSuccess } = useUiPreferencesQuery();

  const stored = data?.[key];
  const value = (stored === undefined || stored === null ? defaultValue : (stored as T)) as T;

  const mutation = useMutation({
    mutationFn: (next: T | null) => putUiPreference(key, next),
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: prefsKey });
      const previous = qc.getQueryData<PrefMap>(prefsKey);
      qc.setQueryData<PrefMap>(prefsKey, { ...(previous ?? {}), [key]: next });
      return { previous };
    },
    onError: (_err, _next, ctx) => {
      if (ctx) qc.setQueryData(prefsKey, ctx.previous);
    },
  });

  const set = useCallback(
    (next: T) => {
      if (!retail) {
        // Nothing to save to: keep it for this session only.
        qc.setQueryData<PrefMap>(prefsKey, { ...(qc.getQueryData<PrefMap>(prefsKey) ?? {}), [key]: next });
        return;
      }
      mutation.mutate(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, retail, qc, prefsKey, mutation.mutate],
  );

  const reset = useCallback(() => {
    if (!retail) {
      qc.setQueryData<PrefMap>(prefsKey, { ...(qc.getQueryData<PrefMap>(prefsKey) ?? {}), [key]: null });
      return;
    }
    mutation.mutate(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, retail, qc, prefsKey, mutation.mutate]);

  return { value, set, reset, isLoaded: isSuccess, isDefault: stored === undefined || stored === null };
}
