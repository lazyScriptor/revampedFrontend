// Dashboard design tokens — derived from ui-ux-pro-max "Data-Dense Dashboard"
// recommendation for GearGrid (operations SaaS for rental equipment).
// Keeping these centralised so every widget pulls from the same palette
// instead of inlining hex values per file.

export const dashboardTokens = {
  // ── Semantic palette ────────────────────────────────────────────────────
  color: {
    background: "#F8FAFC",      // page bg
    surface: "#FFFFFF",         // tile bg
    surfaceMuted: "#F1F5FD",    // subtle tinted bg for icon chips / row hover
    border: "#E4ECFC",          // hairline borders
    borderStrong: "#CBD5E1",    // chart axes, separators
    foreground: "#0F172A",      // primary text
    foregroundMuted: "#475569", // secondary text
    foregroundFaint: "#94A3B8", // tertiary / placeholder

    primary: "#2563EB",         // brand blue — used for primary accents
    primaryStrong: "#1D4ED8",
    secondary: "#3B82F6",       // lighter blue
    accent: "#059669",          // success / positive trend / accent CTA
    accentSoft: "#D1FAE5",      // success badge bg
    warning: "#D97706",
    warningSoft: "#FEF3C7",
    danger: "#DC2626",
    dangerSoft: "#FEE2E2",
    info: "#0EA5E9",
    infoSoft: "#E0F2FE",
    violet: "#7C3AED",          // used by Active Rentals chip
    violetSoft: "#EDE9FE",
  },

  // ── Shadows — refined, layered ───────────────────────────────────────────
  shadow: {
    none: "none",
    sm: "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)",
    md: "0 4px 12px rgba(15,23,42,0.06), 0 2px 4px rgba(15,23,42,0.04)",
    lg: "0 12px 32px rgba(15,23,42,0.12)",
  },

  // ── Radii ────────────────────────────────────────────────────────────────
  radius: {
    sm: "6px",
    md: "10px",
    lg: "14px",
    pill: "999px",
  },

  // ── Spacing — 4pt rhythm ────────────────────────────────────────────────
  space: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },

  // ── Motion ──────────────────────────────────────────────────────────────
  motion: {
    fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
    base: "200ms cubic-bezier(0.4, 0, 0.2, 1)",
    slow: "300ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
} as const;

// Tone presets — gives each KPI widget a coherent accent + soft chip bg.
// Each tone is a paired hex { strong, soft, on } so widgets don't have to
// guess foreground colour.
export const dashboardTones = {
  primary:   { strong: "#2563EB", soft: "#DBEAFE", on: "#1E3A8A" },
  accent:    { strong: "#059669", soft: "#D1FAE5", on: "#064E3B" },
  violet:    { strong: "#7C3AED", soft: "#EDE9FE", on: "#4C1D95" },
  warning:   { strong: "#D97706", soft: "#FEF3C7", on: "#78350F" },
  danger:    { strong: "#DC2626", soft: "#FEE2E2", on: "#7F1D1D" },
  info:      { strong: "#0EA5E9", soft: "#E0F2FE", on: "#075985" },
  slate:     { strong: "#475569", soft: "#F1F5F9", on: "#0F172A" },
} as const;

export type DashboardTone = keyof typeof dashboardTones;
