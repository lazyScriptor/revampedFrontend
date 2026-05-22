import { useMemo } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { useAuthStore } from "@/stores/useAuthStore";
import { createAppTheme, BRAND_DEFAULTS } from "@/app/theme";

// Accepts both snake_case (TenantConfig backend columns) and camelCase
// (master Tenant.branding JSON) so however the SuperAdmin chose to persist
// brand colours the theme picks them up.
const pick = (
  cfg: Record<string, any> | null | undefined,
  ...keys: string[]
): string | undefined => {
  if (!cfg) return undefined;
  for (const k of keys) {
    const v = cfg?.[k];
    if (typeof v === "string" && v.startsWith("#")) return v;
  }
  return undefined;
};

export function DynamicThemeProvider({ children }: { children: React.ReactNode }) {
  const configData = useAuthStore((s) => (s.user as any)?.configData);

  const primary =
    pick(configData, "primary_color", "primaryColor") || BRAND_DEFAULTS.primary;
  const secondary =
    pick(configData, "secondary_color", "secondaryColor") || BRAND_DEFAULTS.secondary;
  const accent =
    pick(configData, "accent_color", "accentColor") || BRAND_DEFAULTS.accent;

  const theme = useMemo(
    () => createAppTheme(primary, secondary, accent),
    [primary, secondary, accent],
  );

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
