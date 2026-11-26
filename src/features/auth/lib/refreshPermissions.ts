import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Re-reads the signed-in user's permissions from the server.
 *
 * Permissions are saved at login, so a permission added by a release (e.g. `activity:view`)
 * is missing for anyone who signed in before it. This refreshes them without a new login.
 *
 * `GET /api/me` answers `{ status, data: { profile: { permissions } } }`; `api.ts` already
 * unwraps the axios `response.data`, so the list sits at `res.data.profile.permissions`.
 */
let inFlight: Promise<string[] | null> | null = null;

export const pickPermissions = (res: any): string[] | null => {
  const list = res?.data?.profile?.permissions ?? res?.profile?.permissions ?? res?.data?.permissions ?? null;
  return Array.isArray(list) ? list : null;
};

export const refreshPermissions = (): Promise<string[] | null> => {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const { api } = await import("@/lib/api");
      const permissions = pickPermissions(await api.get("/me"));
      if (permissions) useAuthStore.getState().updateUserPartial({ permissions });
      return permissions;
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
};
