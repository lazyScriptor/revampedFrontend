import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// 1. Define the shape of your backend's standard error response
interface ApiErrorResponse {
    status: string;
    message: string;
}

//2. Create the custom Axios Instance
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,

    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});
// export const api = axios.create({
//     // Hardcoded for local development
//     baseURL: 'http://localhost:8086/api',

//     // CRITICAL: This tells the browser to automatically include the 
//     // HttpOnly JWT cookie in every single request!
//     withCredentials: true,

//     headers: {
//         'Content-Type': 'application/json',
//         Accept: 'application/json',
//     },
// });

// 3. Request Interceptor
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // You can add logic here if needed before requests are sent out.
        // (We do NOT need to attach tokens here because HttpOnly cookies handle it automatically).
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

        // Try silent refresh exactly once per failed request, and never on auth endpoints
        if (status === 401 && original && !original._retried && !isAuthEndpoint) {
            original._retried = true;

            // A refresh is already in flight — queue this request to replay when it lands
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    refreshWaiters.push((ok) => {
                        if (ok) resolve(api(original));
                        else reject(new Error('Session expired'));
                    });
                });
            }

            isRefreshing = true;
            try {
                await api.post('/auth/refresh');
                flushWaiters(true);
                return api(original);
            } catch {
                flushWaiters(false);
                window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                return Promise.reject(new Error('Session expired'));
            } finally {
                isRefreshing = false;
            }
        }

        // 401 on the auth endpoints themselves (or after refresh) → log out cleanly
        if (status === 401 && !isAuthEndpoint) {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }

        const errorMessage = error.response?.data?.message || 'An unexpected error occurred';
        return Promise.reject(new Error(errorMessage));
    }
);