import { createTheme, alpha } from "@mui/material/styles";

// ─────────────────────────────────────────────────────────────────────────────
// GearGrid theme — built from the landing page's warm-amber brand identity
// (https://github.com/.../newGeargridFrontend) layered onto the ui-ux-pro-max
// "Data-Dense Dashboard" recommendation. Single source of truth for the entire
// app. Every visible component (sidebar, header, dashboard, tables, dialogs,
// forms) inherits radii, shadows, hover states, focus rings, and palette from
// here.
//
// Per-tenant overrides flow in via DynamicThemeProvider: the user's TenantConfig
// supplies `primary_color`, `secondary_color`, etc., and createAppTheme()
// auto-derives light/dark variants and complete component palettes.
// ─────────────────────────────────────────────────────────────────────────────

// Brand defaults — pulled from the GearGrid landing-page palette
//   primary  amber-500   #F59E0B   warm, signature brand colour
//   secondary slate-900   #0F172A   deep neutral for structural elements
//   accent   blue-500    #2563EB   secondary CTA / link colour
export const BRAND_DEFAULTS = {
  primary: "#F59E0B",
  secondary: "#0F172A",
  accent: "#2563EB",
} as const;

// ─── TYPE AUGMENTATION ──────────────────────────────────────────────────────
// Extend MUI's Palette so we can read e.g. `theme.palette.accent.main`,
// `theme.palette.surface.muted`, `theme.palette.brandGradient`.
declare module "@mui/material/styles" {
  interface Palette {
    accent: Palette["primary"];
    surface: {
      base: string;
      paper: string;
      muted: string;
      sunken: string;
    };
    border: {
      subtle: string;
      strong: string;
      focus: string;
    };
    brandGradient: string;
  }
  interface PaletteOptions {
    accent?: PaletteOptions["primary"];
    surface?: Partial<Palette["surface"]>;
    border?: Partial<Palette["border"]>;
    brandGradient?: string;
  }
}

// ─── COLOUR DERIVATION ──────────────────────────────────────────────────────
// MUI's createTheme already derives .light / .dark from .main, but we want
// stronger control over both ends. lighten()/darken() use alpha-mixed white/black
// to keep the hue stable across the ramp (better than HSL rotation for warm
// colours like amber).
const mix = (a: string, b: string, weight: number) => {
  const hexToRgb = (h: string) => {
    const v = h.replace("#", "");
    return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)] as const;
  };
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const w = Math.max(0, Math.min(1, weight));
  const r = Math.round(r1 * (1 - w) + r2 * w);
  const g = Math.round(g1 * (1 - w) + g2 * w);
  const bl = Math.round(b1 * (1 - w) + b2 * w);
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
};
const lighten = (hex: string, w: number) => mix(hex, "#ffffff", w);
const darken = (hex: string, w: number) => mix(hex, "#000000", w);

// WCAG contrast guesser — picks white/black for ON-tone text
const contrastFor = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.replace("#", "").slice(i - 1, i + 1), 16));
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0F172A" : "#FFFFFF";
};

const buildSwatch = (hex: string) => ({
  main: hex,
  light: lighten(hex, 0.32),
  dark: darken(hex, 0.18),
  contrastText: contrastFor(hex),
});

// Status palette stays semantic (red/amber/green/blue) regardless of branding.
// Each tenant gets the SAME status colors so "danger" always reads as danger.
const STATUS = {
  success: { main: "#10B981", light: "#D1FAE5", dark: "#047857", contrastText: "#FFFFFF" },
  warning: { main: "#D97706", light: "#FEF3C7", dark: "#B45309", contrastText: "#FFFFFF" },
  error:   { main: "#DC2626", light: "#FEE2E2", dark: "#991B1B", contrastText: "#FFFFFF" },
  info:    { main: "#0EA5E9", light: "#E0F2FE", dark: "#0369A1", contrastText: "#FFFFFF" },
};

// Neutral surfaces (background/border/text) stay slate-based regardless of brand
// — keeps the app calm and readable; only accents change per tenant.
const NEUTRAL = {
  text: { primary: "#0F172A", secondary: "#475569", disabled: "#94A3B8" },
  background: { default: "#F7F8FB", paper: "#FFFFFF" },
  surface: {
    base: "#FFFFFF",
    paper: "#FFFFFF",
    muted: "#F1F5F9",   // tinted bg for chips, hover, icon backings
    sunken: "#E2E8F0",
  },
  border: {
    subtle: "#E4E8EF",
    strong: "#CBD5E1",
    focus: "#94A3B8",
  },
  divider: "#E4E8EF",
} as const;

// ─── THE FACTORY ────────────────────────────────────────────────────────────
export interface BrandingInput {
  primary?: string;
  secondary?: string;
  accent?: string;
}

export const createAppTheme = (
  primaryInput?: string,
  secondaryInput?: string,
  accentInput?: string,
) => {
  const primary = primaryInput || BRAND_DEFAULTS.primary;
  const secondary = secondaryInput || BRAND_DEFAULTS.secondary;
  const accent = accentInput || BRAND_DEFAULTS.accent;

  const primarySwatch = buildSwatch(primary);
  const secondarySwatch = buildSwatch(secondary);
  const accentSwatch = buildSwatch(accent);

  return createTheme({
    palette: {
      mode: "light",
      primary: primarySwatch,
      secondary: secondarySwatch,
      accent: accentSwatch,
      success: STATUS.success,
      warning: STATUS.warning,
      error: STATUS.error,
      info: STATUS.info,
      background: NEUTRAL.background,
      text: NEUTRAL.text,
      divider: NEUTRAL.divider,
      surface: NEUTRAL.surface,
      border: NEUTRAL.border,
      brandGradient: `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`,
    },

    // Slightly-curvy default — 10px base; Cards/Dialogs override to 14/16.
    shape: { borderRadius: 10 },

    typography: {
      fontFamily:
        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
      htmlFontSize: 16,
      // Tighter, more confident hierarchy. Numbers use tabular-nums by default.
      h1: { fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15 },
      h2: { fontSize: "1.875rem", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2 },
      h3: { fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.015em", lineHeight: 1.25 },
      h4: { fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.3 },
      h5: { fontSize: "1.0625rem", fontWeight: 700, lineHeight: 1.35 },
      h6: { fontSize: "0.9375rem", fontWeight: 700, lineHeight: 1.4 },
      subtitle1: { fontSize: "0.95rem", fontWeight: 600, lineHeight: 1.4 },
      subtitle2: { fontSize: "0.8rem", fontWeight: 600, lineHeight: 1.4, letterSpacing: "0.02em" },
      body1: { fontSize: "0.9375rem", fontWeight: 400, lineHeight: 1.5 },
      body2: { fontSize: "0.8125rem", fontWeight: 400, lineHeight: 1.55 },
      caption: { fontSize: "0.72rem", fontWeight: 500, lineHeight: 1.45, letterSpacing: "0.01em" },
      overline: {
        fontSize: "0.68rem",
        fontWeight: 800,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        lineHeight: 1.6,
      },
      button: { textTransform: "none", fontWeight: 700, letterSpacing: "0" },
    },

    // Softer, layered shadow scale — overrides the heavy Material default.
    shadows: [
      "none",
      "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.05)",   // 1
      "0 2px 4px rgba(15,23,42,0.05), 0 2px 6px rgba(15,23,42,0.06)",   // 2
      "0 4px 8px rgba(15,23,42,0.06), 0 2px 4px rgba(15,23,42,0.04)",   // 3
      "0 6px 12px rgba(15,23,42,0.07), 0 3px 6px rgba(15,23,42,0.05)",  // 4
      "0 8px 18px rgba(15,23,42,0.08), 0 4px 8px rgba(15,23,42,0.06)",  // 5
      "0 12px 24px rgba(15,23,42,0.10), 0 6px 12px rgba(15,23,42,0.07)",// 6
      "0 16px 32px rgba(15,23,42,0.12), 0 8px 16px rgba(15,23,42,0.08)",// 7
      ...Array(17).fill("0 20px 48px rgba(15,23,42,0.16), 0 10px 20px rgba(15,23,42,0.10)"),
    ] as any,

    transitions: {
      easing: {
        easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
        easeOut: "cubic-bezier(0.2, 0, 0.2, 1)",
        easeIn: "cubic-bezier(0.4, 0, 1, 1)",
        sharp: "cubic-bezier(0.4, 0, 0.6, 1)",
      },
      duration: { shortest: 120, shorter: 150, short: 200, standard: 240, complex: 300, enteringScreen: 220, leavingScreen: 180 },
    },

    components: {
      // ── Global baseline ────────────────────────────────────────────────
      MuiCssBaseline: {
        styleOverrides: (themeParam) => ({
          "html, body, #root": { height: "100%" },
          body: {
            backgroundColor: themeParam.palette.background.default,
            fontFeatureSettings: '"cv11","ss03"',
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
          },
          // Themed slim scrollbars across the app
          "*::-webkit-scrollbar": { width: 8, height: 8 },
          "*::-webkit-scrollbar-track": { background: "transparent" },
          "*::-webkit-scrollbar-thumb": {
            background: themeParam.palette.border.subtle,
            borderRadius: 8,
          },
          "*::-webkit-scrollbar-thumb:hover": { background: themeParam.palette.border.strong },
          // Focus rings — keyboard users get a clear themed ring
          "*:focus-visible": {
            outline: `2px solid ${alpha(themeParam.palette.primary.main, 0.55)}`,
            outlineOffset: 2,
            borderRadius: 6,
          },
        }),
      },

      // ── Surfaces ───────────────────────────────────────────────────────
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundImage: "none",
            borderRadius: 12,
            border: `1px solid ${theme.palette.border.subtle}`,
          }),
          elevation0: ({ theme }) => ({ border: `1px solid ${theme.palette.border.subtle}` }),
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 14,
            border: `1px solid ${theme.palette.border.subtle}`,
            backgroundColor: theme.palette.surface.base,
          }),
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: "default" },
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.surface.base,
            color: theme.palette.text.primary,
            borderBottom: `1px solid ${theme.palette.border.subtle}`,
            boxShadow: "none",
          }),
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: ({ theme }) => ({
            backgroundColor: theme.palette.surface.base,
            borderRight: `1px solid ${theme.palette.border.subtle}`,
          }),
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: ({ theme }) => ({ borderColor: theme.palette.border.subtle }),
        },
      },

      // ── Buttons ────────────────────────────────────────────────────────
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 10,
            fontWeight: 700,
            textTransform: "none",
            paddingInline: 14,
            minHeight: 36,
            boxShadow: "none",
            transition: "background-color 180ms, border-color 180ms, color 180ms, box-shadow 180ms",
            "&:hover": { boxShadow: "none" },
          },
          sizeSmall: { minHeight: 30, paddingInline: 12, fontSize: "0.8125rem" },
          sizeLarge: { minHeight: 44, paddingInline: 18, fontSize: "0.9375rem" },
        },
        variants: [
          {
            props: { variant: "contained", color: "primary" },
            style: ({ theme }: any) => ({
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              "&:hover": { backgroundColor: theme.palette.primary.dark },
            }),
          },
          {
            props: { variant: "outlined", color: "primary" },
            style: ({ theme }: any) => ({
              borderColor: theme.palette.border.strong,
              color: theme.palette.text.primary,
              "&:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.06),
                borderColor: theme.palette.primary.main,
              },
            }),
          },
          {
            props: { variant: "text", color: "primary" },
            style: ({ theme }: any) => ({
              "&:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.08) },
            }),
          },
        ],
      },
      MuiIconButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 10,
            color: theme.palette.text.secondary,
            transition: "background-color 150ms, color 150ms",
            "&:hover": { backgroundColor: alpha(theme.palette.text.primary, 0.06) },
          }),
        },
      },

      // ── Chips ──────────────────────────────────────────────────────────
      MuiChip: {
        defaultProps: { size: "small" },
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 999,
            fontWeight: 700,
            fontSize: "0.72rem",
            height: 22,
            backgroundColor: theme.palette.surface.muted,
            color: theme.palette.text.primary,
          }),
          colorPrimary: ({ theme }) => ({
            backgroundColor: alpha(theme.palette.primary.main, 0.12),
            color: theme.palette.primary.dark,
          }),
          colorSecondary: ({ theme }) => ({
            backgroundColor: alpha(theme.palette.secondary.main, 0.12),
            color: theme.palette.secondary.dark,
          }),
          colorSuccess: ({ theme }) => ({
            backgroundColor: alpha(theme.palette.success.main, 0.14),
            color: theme.palette.success.dark,
          }),
          colorWarning: ({ theme }) => ({
            backgroundColor: alpha(theme.palette.warning.main, 0.16),
            color: theme.palette.warning.dark,
          }),
          colorError: ({ theme }) => ({
            backgroundColor: alpha(theme.palette.error.main, 0.14),
            color: theme.palette.error.dark,
          }),
        },
      },

      // ── Inputs ─────────────────────────────────────────────────────────
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 10,
            backgroundColor: theme.palette.surface.base,
            transition: "border-color 150ms, box-shadow 150ms",
            "& .MuiOutlinedInput-notchedOutline": { borderColor: theme.palette.border.subtle },
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: theme.palette.border.strong },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: theme.palette.primary.main,
              borderWidth: 1.5,
            },
            "&.Mui-focused": {
              boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.16)}`,
            },
          }),
          input: { paddingTop: 10, paddingBottom: 10 },
        },
      },
      MuiInputLabel: {
        styleOverrides: { root: { fontSize: "0.875rem", fontWeight: 500 } },
      },
      MuiFormHelperText: {
        styleOverrides: { root: { fontSize: "0.72rem", marginLeft: 4 } },
      },

      // ── Tabs ───────────────────────────────────────────────────────────
      MuiTab: {
        styleOverrides: {
          root: ({ theme }) => ({
            textTransform: "none",
            fontWeight: 700,
            fontSize: "0.875rem",
            minHeight: 44,
            color: theme.palette.text.secondary,
            "&.Mui-selected": { color: theme.palette.primary.main },
          }),
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: ({ theme }) => ({
            height: 3,
            borderRadius: "3px 3px 0 0",
            backgroundColor: theme.palette.primary.main,
          }),
        },
      },

      // ── Tooltips ───────────────────────────────────────────────────────
      MuiTooltip: {
        styleOverrides: {
          tooltip: ({ theme }) => ({
            backgroundColor: theme.palette.text.primary,
            color: theme.palette.background.paper,
            fontSize: "0.72rem",
            fontWeight: 600,
            paddingInline: 8,
            paddingBlock: 4,
            borderRadius: 6,
            boxShadow: theme.shadows[4],
          }),
          arrow: ({ theme }) => ({ color: theme.palette.text.primary }),
        },
      },

      // ── Menus / Dialogs ────────────────────────────────────────────────
      MuiMenu: {
        styleOverrides: {
          paper: ({ theme }) => ({
            borderRadius: 12,
            border: `1px solid ${theme.palette.border.subtle}`,
            boxShadow: theme.shadows[6],
            marginTop: 4,
          }),
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 8,
            marginInline: 4,
            marginBlock: 1,
            fontSize: "0.875rem",
            minHeight: 36,
            transition: "background-color 120ms",
            "&:hover": { backgroundColor: theme.palette.surface.muted },
            "&.Mui-selected": {
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.dark,
              "&:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.14) },
            },
          }),
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: ({ theme }) => ({
            borderRadius: 16,
            border: `1px solid ${theme.palette.border.subtle}`,
            boxShadow: theme.shadows[7],
          }),
        },
      },
      MuiDialogTitle: {
        styleOverrides: { root: { fontWeight: 800, fontSize: "1.125rem", paddingBottom: 8 } },
      },

      // ── List / Sidebar items ───────────────────────────────────────────
      MuiListItemButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 8,
            paddingInline: 10,
            transition: "background-color 150ms, color 150ms",
            "&:hover": { backgroundColor: theme.palette.surface.muted },
            "&.Mui-selected": {
              backgroundColor: alpha(theme.palette.primary.main, 0.12),
              color: theme.palette.primary.dark,
              "& .MuiListItemIcon-root": { color: theme.palette.primary.main },
              "&:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.16) },
            },
          }),
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: ({ theme }) => ({ minWidth: 36, color: theme.palette.text.secondary }),
        },
      },

      // ── Avatar ─────────────────────────────────────────────────────────
      MuiAvatar: {
        styleOverrides: {
          root: ({ theme }) => ({
            fontWeight: 700,
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
          }),
        },
      },

      // ── LinearProgress ─────────────────────────────────────────────────
      MuiLinearProgress: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 999,
            height: 6,
            backgroundColor: theme.palette.surface.muted,
          }),
          bar: { borderRadius: 999 },
        },
      },

      // ── Switch / Checkbox / Radio — use primary by default ─────────────
      MuiSwitch: {
        styleOverrides: {
          switchBase: ({ theme }) => ({
            "&.Mui-checked": { color: theme.palette.primary.main },
            "&.Mui-checked + .MuiSwitch-track": { backgroundColor: theme.palette.primary.main },
          }),
        },
      },

      // ── Skeleton — uses surface muted, not default grey ───────────────
      MuiSkeleton: {
        styleOverrides: {
          root: ({ theme }) => ({ backgroundColor: alpha(theme.palette.border.subtle, 0.7) }),
        },
      },

      // ── Alert (used by AppToast) ───────────────────────────────────────
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 12, fontWeight: 500 },
        },
        variants: [
          {
            props: { variant: "filled", severity: "success" },
            style: ({ theme }: any) => ({ backgroundColor: theme.palette.success.main }),
          },
          {
            props: { variant: "filled", severity: "error" },
            style: ({ theme }: any) => ({ backgroundColor: theme.palette.error.main }),
          },
          {
            props: { variant: "filled", severity: "warning" },
            style: ({ theme }: any) => ({ backgroundColor: theme.palette.warning.main }),
          },
          {
            props: { variant: "filled", severity: "info" },
            style: ({ theme }: any) => ({ backgroundColor: theme.palette.info.main }),
          },
        ],
      },

      // ── Toggle buttons (used by reports pill strip etc.) ───────────────
      MuiToggleButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            textTransform: "none",
            fontWeight: 700,
            borderRadius: 999,
            border: `1px solid ${theme.palette.border.subtle}`,
            paddingInline: 14,
            color: theme.palette.text.secondary,
            "&:hover": { backgroundColor: theme.palette.surface.muted },
            "&.Mui-selected": {
              backgroundColor: alpha(theme.palette.primary.main, 0.12),
              color: theme.palette.primary.dark,
              borderColor: alpha(theme.palette.primary.main, 0.4),
              "&:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.16) },
            },
          }),
        },
      },

      // ── Badge ──────────────────────────────────────────────────────────
      MuiBadge: {
        styleOverrides: {
          badge: { fontWeight: 800, fontSize: "0.65rem" },
        },
      },
    },
  });
};

export const theme = createAppTheme();
