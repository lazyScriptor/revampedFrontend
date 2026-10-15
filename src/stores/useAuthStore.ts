import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { syncLanguageFromAuth } from '@/i18n';

// 1. Updated to match your exact backend payload from the console
interface User {
    id: number;
    email: string;
    username: string;
    warehouseId?: number | null;
    roles: string[];
    permissions: string[];
    configData?: Record<string, unknown> | null;
    // Optional profile mirror — filled by /me hooks after profile edits, so the
    // AppBar avatar/initials reflect the latest values without a hard reload.
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
    job_title?: string | null;
    // Language preference. Backend resolves
    //   user.language → tenant.default_language → "si"
    // and ships this at login. Frontend i18n picks it up in syncLanguageFromAuth.
    language?: string | null;
}

interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    setAuth: (user: User, token?: string | null) => void;
    updateUserPartial: (patch: Partial<User>) => void;
    logout: () => void;
    hasPermission: (code: string) => boolean;
    hasAnyPermission: (...codes: string[]) => boolean;
    hasRole: (role: string) => boolean;
}

// 2. Wrap the store in the `persist` middleware
export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            isAuthenticated: false,
            user: null,
            token: null,
            setAuth: (user, token) => {
                set((state) => ({
                    isAuthenticated: true,
                    user,
                    token: token !== undefined ? token : state.token,
                }));
                // Apply the backend-resolved language to the i18n instance.
                // configData.tenant_default_language is set by authService
                // when there's no user override.
                const tenantDefault =
                    (user.configData as any)?.tenant_default_language ?? null;
                syncLanguageFromAuth(user.language, tenantDefault).catch(() => {});
            },
            updateUserPartial: (patch) => {
                const current = get().user;
                if (!current) return;
                set({ user: { ...current, ...patch } });
                // If the user updated their language preference via /me, mirror it
                // into the active i18n instance immediately.
                if (patch.language) {
                    syncLanguageFromAuth(patch.language, null).catch(() => {});
                }
            },

            logout: () => {
                // Best-effort clear backend cookies
                try {
                    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8086/api';
                    fetch(`${apiUrl}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
                } catch {
                    // ignore
                }

                // 1. Wipe the Zustand state
                set({ isAuthenticated: false, user: null, token: null });

                // 2. Hard redirect to the login page (cleans out the browser memory)
                window.location.href = '/login';
            },

            /**
             * Check if the user has a specific granular permission.
             * Usage: useAuthStore.getState().hasPermission('invoice:field:edit_discount')
             */
            hasPermission: (code: string) => {
                const user = get().user;
                if (!user) return false;
                const roles = user.roles || [];
                if (roles.some((r) => ['admin', 'superadmin', 'super_admin', 'owner'].includes(r.toLowerCase()))) {
                    return true;
                }
                const permissions = user.permissions || [];
                return permissions.includes(code);
            },

            /**
             * Check if the user has ANY of the listed permissions.
             */
            hasAnyPermission: (...codes: string[]) => {
                const user = get().user;
                if (!user) return false;
                const roles = user.roles || [];
                if (roles.some((r) => ['admin', 'superadmin', 'super_admin', 'owner'].includes(r.toLowerCase()))) {
                    return true;
                }
                const permissions = user.permissions || [];
                return codes.some((code) => permissions.includes(code));
            },

            /**
             * Check if the user has a specific role (case-insensitive).
             */
            hasRole: (role: string) => {
                const roles = get().user?.roles || [];
                return roles.some((r) => r.toLowerCase() === role.toLowerCase());
            },
        }),
        {
            // This is the key name it will use in your browser's Local Storage
            name: 'geargrid-auth-storage',
        }
    )
);