import { create } from 'zustand';

interface User {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    tenantDbName: string;
    roles: string[];
}

interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    setAuth: (user: User) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    isAuthenticated: false,
    user: null,
    setAuth: (user) => set({ isAuthenticated: true, user }),
    logout: () => set({ isAuthenticated: false, user: null }),
}));