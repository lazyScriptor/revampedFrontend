import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSuperAdminStore } from '@/stores/useSuperAdminStore';
import i18n from "@/i18n";

// 1. Define the shape of your backend's standard error response
interface ApiErrorResponse {
    status: string;
    message: string;
}

// 2. Create the custom Axios Instance
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,

    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

// 3. Request Interceptor: Attach Authorization Bearer header alongside cookies for dual-layer resilience
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const isSaEndpoint = config.url?.includes('/super-admin');
        const token = isSaEndpoint
            ? (useSuperAdminStore.getState().token || useAuthStore.getState().token)
            : (useAuthStore.getState().token || useSuperAdminStore.getState().token);

        if (token && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

// ──────────────────────────────────────────────────────────────────────────
// Silent token refresh
// On 401, hit /auth/refresh once. If it succeeds, replay the original request
// and any concurrent requests that piled up while the refresh was in flight.
// If it fails, dispatch auth:unauthorized so the app can log the user out.
// ──────────────────────────────────────────────────────────────────────────

type RetryableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

let isRefreshing = false;
let refreshWaiters: Array<(ok: boolean) => void> = [];

const flushWaiters = (ok: boolean) => {
    refreshWaiters.forEach((cb) => cb(ok));
    refreshWaiters = [];
};

// Endpoints we must NOT try to refresh on — they're the auth surface itself
const AUTH_BYPASS = ['/auth/login', '/auth/refresh', '/auth/logout', '/super-admin/login'];

// Endpoints where a 401 should NOT force the user out. These are background/peripheral
// features (notifications bell, bulk-job poller) whose failures must never break the
// session — a brief auth glitch on /notifications shouldn't kick the user back to login.
const LOGOUT_BYPASS = ['/notifications', '/bulk-jobs'];

api.interceptors.response.use(
    (response: AxiosResponse) => {
        // Backend wraps everything in { status, data }. Unwrap so hooks get the body.
        return response.data;
    },
    async (error: AxiosError<ApiErrorResponse>) => {
        const original = error.config as RetryableConfig | undefined;
        const status = error.response?.status;
        const url = original?.url || '';
        const isAuthEndpoint = AUTH_BYPASS.some((p) => url.includes(p));
        const isLogoutBypass = LOGOUT_BYPASS.some((p) => url.includes(p));

        // Try silent refresh exactly once per failed request, and never on auth endpoints
        if (status === 401 && original && !original._retried && !isAuthEndpoint && !isLogoutBypass) {
            original._retried = true;

            // A refresh is already in flight — queue this request to replay when it lands
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    refreshWaiters.push((ok) => {
                        if (ok) resolve(api(original));
                        else reject(new Error(i18n.t('errors.sessionExpired')));
                    });
                });
            }

            isRefreshing = true;
            try {
                const refreshRes: any = await api.post('/auth/refresh');
                const newToken = refreshRes?.token || refreshRes?.accessToken || refreshRes?.data?.token;
                if (newToken) {
                    const currentUser = useAuthStore.getState().user;
                    if (currentUser) {
                        useAuthStore.getState().setAuth(currentUser, newToken);
                    }
                    if (original.headers) {
                        original.headers.Authorization = `Bearer ${newToken}`;
                    }
                }
                flushWaiters(true);
                return api(original);
            } catch {
                flushWaiters(false);
                window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                return Promise.reject(new Error(i18n.t('errors.sessionExpired')));
            } finally {
                isRefreshing = false;
            }
        }

        // 401 on the auth endpoints themselves (or after refresh) → log out cleanly.
        // Skip for peripheral features (notifications, bulk-jobs) so a transient
        // failure there can never bounce the user back to the login screen.
        if (status === 401 && !isAuthEndpoint && !isLogoutBypass) {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }

        const errorMessage = error.response?.data?.message || i18n.t('errors.unexpected');
        // Keep the HTTP status (undefined = no response, e.g. offline) so callers can react to it.
        return Promise.reject(Object.assign(new Error(errorMessage), { status }));
    }
);