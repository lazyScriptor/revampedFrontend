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
  const u = useAuthStore.getState().user;
  if (u) {
    const tenantDefault = (u.configData as any)?.tenant_default_language ?? null;
    syncLanguageFromAuth(u.language ?? null, tenantDefault).catch(() => {});
  }
})();

// When silent refresh fails (refresh token expired/invalid), log out cleanly.
// The api layer dispatches this; we centralize the response here.
window.addEventListener('auth:unauthorized', () => {
  const { isAuthenticated, logout } = useAuthStore.getState();
  if (isAuthenticated) logout();
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
