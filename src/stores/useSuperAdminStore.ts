import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SuperAdmin {
    id: number;
    email: string;
    displayName: string;
}

interface SuperAdminState {
    isAuthenticated: boolean;
    admin: SuperAdmin | null;
    token: string | null;
    setAuth: (admin: SuperAdmin, token?: string | null) => void;
    logout: () => void;
}

export const useSuperAdminStore = create<SuperAdminState>()(
    persist(
        (set) => ({
            isAuthenticated: false,
            admin: null,
            token: null,
            setAuth: (admin, token) =>
                set((state) => ({
                    isAuthenticated: true,
                    admin,
                    token: token !== undefined ? token : state.token,
                })),
            logout: () => {
                // Best-effort clear backend SA cookies
                try {
                    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8086/api';
                    fetch(`${apiUrl}/super-admin/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
                } catch {
                    // ignore
                }
                set({ isAuthenticated: false, admin: null, token: null });
                window.location.href = '/super-admin/login';
            },
        }),
        {
            name: 'geargrid-sa-storage',
        }
    )
);
