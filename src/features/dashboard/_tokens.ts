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
    background: "#F7F8FB",
    surface: "#FFFFFF",
    surfaceMuted: "#F1F5F9",
    border: "#E4E8EF",
    borderStrong: "#CBD5E1",
    foreground: "#0F172A",
    foregroundMuted: "#475569",
    foregroundFaint: "#94A3B8",
    primary: "#F59E0B",         // amber-500 — GearGrid brand
    primaryStrong: "#B45309",
    secondary: "#0F172A",
    accent: "#2563EB",
    accentSoft: "#DBEAFE",
    warning: "#D97706",
    warningSoft: "#FEF3C7",
    danger: "#DC2626",
    dangerSoft: "#FEE2E2",
    info: "#0EA5E9",
    infoSoft: "#E0F2FE",
    violet: "#7C3AED",
    violetSoft: "#EDE9FE",
  },
  shadow: {
    none: "none",
    sm: "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)",
    md: "0 4px 12px rgba(15,23,42,0.06), 0 2px 4px rgba(15,23,42,0.04)",
    lg: "0 12px 32px rgba(15,23,42,0.12)",
  },
  radius: { sm: "6px", md: "10px", lg: "14px", pill: "999px" },
  space: { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32 },
  motion: {
    fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
    base: "200ms cubic-bezier(0.4, 0, 0.2, 1)",
    slow: "300ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
} as const;

// Tone presets — used by KPICard for semantic accent + soft chip backings.
// "primary" here is intentionally the brand amber so tone="primary" matches
// the tenant's branding accent.
export const dashboardTones = {
  primary: { strong: "#F59E0B", soft: "#FEF3C7", on: "#92400E" },
  accent:  { strong: "#059669", soft: "#D1FAE5", on: "#064E3B" },
  violet:  { strong: "#7C3AED", soft: "#EDE9FE", on: "#4C1D95" },
  warning: { strong: "#D97706", soft: "#FEF3C7", on: "#78350F" },
  danger:  { strong: "#DC2626", soft: "#FEE2E2", on: "#7F1D1D" },
  info:    { strong: "#0EA5E9", soft: "#E0F2FE", on: "#075985" },
  slate:   { strong: "#475569", soft: "#F1F5F9", on: "#0F172A" },
} as const;

export type DashboardTone = keyof typeof dashboardTones;
