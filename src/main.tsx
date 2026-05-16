import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRootRoute } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import {
  CssBaseline,
} from "@mui/material";

import { router } from "@/app/router";
import { queryClient } from "@/app/queryClient";
import { DynamicThemeProvider } from "@/app/DynamicThemeProvider";
import { ToastProvider } from "@/components/ui/AppToast";
import './index.css'; // Make sure Tailwind is imported here!

ReactDOM.createRoot(document.getElementById("root")).render(
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
