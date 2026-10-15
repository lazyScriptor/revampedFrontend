import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import {
  CssBaseline,
} from "@mui/material";

import { router } from "@/app/router";
import { queryClient } from "@/app/queryClient";
import { DynamicThemeProvider } from "@/app/DynamicThemeProvider";
import { ToastProvider } from "@/components/ui/AppToast";
import { useAuthStore } from "@/stores/useAuthStore";
import './index.css'; // Make sure Tailwind is imported here!

// Initialize i18next BEFORE the first render so the very first paint already
// has the right pack (en/si). Side-effect import — its default export sets up
// the global i18n instance.
import "@/i18n";
import { syncLanguageFromAuth } from "@/i18n";

// If the user was already authenticated from a previous session (zustand
// persisted), apply their saved language preference right away. Without this,
// a returning user would see the browser-detected default for a frame.
(() => {
  const { user, isAuthenticated, updateUserPartial } = useAuthStore.getState();
  if (user) {
    const tenantDefault = (user.configData as any)?.tenant_default_language ?? null;
    syncLanguageFromAuth(user.language ?? null, tenantDefault).catch(() => {});
  }
  if (isAuthenticated) {
    import("@/lib/api").then(({ api }) => {
      api.get("/me").then((res) => {
        if (res.data?.data?.permissions) {
          updateUserPartial({
            permissions: res.data.data.permissions,
          });
        }
      }).catch(() => {});
    });
  }
})();

// When silent refresh fails (refresh token expired/invalid), log out cleanly.
// The api layer dispatches this; we centralize the response here.
window.addEventListener('auth:unauthorized', () => {
  const { isAuthenticated, logout } = useAuthStore.getState();
  if (isAuthenticated) logout();
});

// Auto-reload on new deployments when an active tab requests a stale code-split chunk
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <DynamicThemeProvider>
        <CssBaseline />
        <ToastProvider>
          <ReactQueryDevtools position="bottom" />
          <RouterProvider router={router} />
        </ToastProvider>
      </DynamicThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
