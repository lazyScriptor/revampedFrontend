import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import { createAppTheme } from "@/app/theme";
import { OverlayProvider } from "@/components/overlay";
import { ToastProvider } from "@/components/ui/AppToast";

export { signIn } from "./testUtils";

export const renderCatalogUi = (ui: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const result = render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={createAppTheme()}>
        <ToastProvider>
          <OverlayProvider>{ui}</OverlayProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
  return { client, ...result };
};

export const ALL_RETAIL_PERMISSIONS = [
  "retail:view",
  "retail:product_manage",
  "retail:stock_receive",
  "retail:stock_adjust",
  "retail:backdate",
  "retail:cost_view",
  "retail:sell",
];
