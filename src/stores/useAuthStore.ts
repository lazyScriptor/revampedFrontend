import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 1. Updated to match your exact backend payload from the console
interface User {
    id: number;
    email: string;
    username: string; 
    warehouseId?: number | null;
    roles: string[];
    permissions: string[]; 
}

interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    setAuth: (user: User) => void;
    logout: () => void;
}

// 2. Wrap the store in the `persist` middleware
export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            isAuthenticated: false,
            user: null,
            setAuth: (user) => set({ isAuthenticated: true, user }),
            logout: () => {
                // When logging out, wipe the state
                set({ isAuthenticated: false, user: null });
                // Note: You should also call your backend /logout endpoint here eventually 
                // to clear the HttpOnly cookie!
            },
        }),
        {
            // This is the key name it will use in your browser's Local Storage
            name: 'geargrid-auth-storage', 
        }
    )
);