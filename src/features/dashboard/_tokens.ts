// Dashboard widget tokens.
// As of the theme refactor these are kept as **fallback constants** so the
// dashboard widgets keep working even outside a ThemeProvider context (e.g.
// Storybook snapshots). Whenever a new widget is written, prefer reading
// values directly from `useTheme()` and reach for these only when you need a
// stable colour at module load (e.g. for Recharts gradient ids defined at
// import-time).
//
// The values intentionally mirror the GearGrid app theme — refresh both when
// the design system changes.

export const dashboardTokens = {
  color: {
    background: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceMuted: "#F1F5F9",
    border: "#E2E8F0",
    borderStrong: "#CBD5E1",
    foreground: "#0F172A",
    foregroundMuted: "#475569",
    foregroundFaint: "#94A3B8",
    primary: "#F59E0B",         // amber-500 — GearGrid brand
    primaryStrong: "#B45309",
    primarySoft: "#FEF3C7",
    secondary: "#0F172A",
    accent: "#10B981",          // emerald-500
    accentSoft: "#D1FAE5",
    warning: "#F59E0B",
    warningSoft: "#FEF3C7",
    danger: "#EF4444",
    dangerSoft: "#FEE2E2",
    info: "#0EA5E9",
    infoSoft: "#E0F2FE",
    violet: "#8B5CF6",
    violetSoft: "#EDE9FE",
  },
  shadow: {
    none: "none",
    sm: "0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)",
    md: "0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)",
    card: "0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.03)",
    cardHover: "0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)",
    lg: "0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)",
  },
  radius: { sm: "8px", md: "12px", lg: "16px", xl: "20px", pill: "999px" },
  space: { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32 },
  motion: {
    fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
    base: "200ms cubic-bezier(0.4, 0, 0.2, 1)",
    slow: "300ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
} as const;

// Tone presets — used by KPICard for semantic accent + soft chip backings.
export const dashboardTones = {
  primary: { strong: "#F59E0B", soft: "#FEF3C7", on: "#92400E", light: "rgba(245, 158, 11, 0.08)" },
  accent:  { strong: "#10B981", soft: "#D1FAE5", on: "#065F46", light: "rgba(16, 185, 129, 0.08)" },
  violet:  { strong: "#8B5CF6", soft: "#EDE9FE", on: "#5B21B6", light: "rgba(139, 92, 246, 0.08)" },
  warning: { strong: "#F59E0B", soft: "#FEF3C7", on: "#92400E", light: "rgba(245, 158, 11, 0.08)" },
  danger:  { strong: "#EF4444", soft: "#FEE2E2", on: "#991B1B", light: "rgba(239, 68, 68, 0.08)" },
  info:    { strong: "#0EA5E9", soft: "#E0F2FE", on: "#075985", light: "rgba(14, 165, 233, 0.08)" },
  slate:   { strong: "#64748B", soft: "#F1F5F9", on: "#1E293B", light: "rgba(100, 116, 139, 0.08)" },
} as const;

export type DashboardTone = keyof typeof dashboardTones;
