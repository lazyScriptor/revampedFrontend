import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { OverlayProvider } from "@/components/overlay";
import { useAuthStore } from "@/stores/useAuthStore";

export const signIn = (opts: { retail?: boolean; permissions?: string[]; id?: number; roles?: string[] } = {}) => {
  useAuthStore.setState({
    isAuthenticated: true,
    token: null,
    user: {
      id: opts.id ?? 1,
      email: "a@b.c",
      username: "cashier",
      roles: opts.roles ?? [],
      permissions: opts.permissions ?? [],
      plan: { tier: "pro", features: { retail: opts.retail ?? true }, limits: {} },
    } as any,
  });
};

export const renderWithProviders = (ui: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const result = render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={createTheme()}>
        <OverlayProvider>{ui}</OverlayProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
  return { client, ...result };
};

/** A minimal stand-in for the Socket.IO client. */
export const makeFakeSocket = () => {
  const listeners = new Map<string, Set<(p: any) => void>>();
  return {
    on: (e: string, fn: (p: any) => void) => {
      (listeners.get(e) ?? listeners.set(e, new Set()).get(e)!).add(fn);
    },
    off: (e: string, fn: (p: any) => void) => void listeners.get(e)?.delete(fn),
    emit: (e: string, payload?: any) => listeners.get(e)?.forEach((fn) => fn(payload)),
    count: (e: string) => listeners.get(e)?.size ?? 0,
  };
};
