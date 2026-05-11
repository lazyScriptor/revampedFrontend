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
    setAuth: (admin: SuperAdmin) => void;
    logout: () => void;
}

export const useSuperAdminStore = create<SuperAdminState>()(
    persist(
        (set) => ({
            isAuthenticated: false,
            admin: null,
            setAuth: (admin) => set({ isAuthenticated: true, admin }),
            logout: () => {
                set({ isAuthenticated: false, admin: null });
                window.location.href = '/super-admin/login';
            },
        }),
        {
            name: 'geargrid-sa-storage',
        }
    )
);
