import { Box, Card, Skeleton, Typography, useTheme } from "@mui/material";

export interface KpiTileProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "default" | "success" | "warning" | "error" | "info";
  loading?: boolean;
  onClick?: () => void;
  active?: boolean;
  badge?: React.ReactNode;
  compact?: boolean;
  sx?: any;
}

const TONES: Record<
  NonNullable<KpiTileProps["tone"]>,
  { bg: string; fg: string; border: string; glow: string }
> = {
  default: {
    bg: "rgba(100, 116, 139, 0.08)",
    fg: "#0f172a",
    border: "#e2e8f0",
    glow: "rgba(100, 116, 139, 0.05)",
  },
  success: {
    bg: "rgba(16, 185, 129, 0.1)",
    fg: "#059669",
    border: "rgba(16, 185, 129, 0.25)",
    glow: "rgba(16, 185, 129, 0.08)",
  },
  warning: {
    bg: "rgba(245, 158, 11, 0.1)",
    fg: "#d97706",
    border: "rgba(245, 158, 11, 0.25)",
    glow: "rgba(245, 158, 11, 0.08)",
  },
  error: {
    bg: "rgba(239, 68, 68, 0.1)",
    fg: "#dc2626",
    border: "rgba(239, 68, 68, 0.25)",
    glow: "rgba(239, 68, 68, 0.08)",
  },
  info: {
    bg: "rgba(14, 165, 233, 0.1)",
    fg: "#0284c7",
    border: "rgba(14, 165, 233, 0.25)",
    glow: "rgba(14, 165, 233, 0.08)",
  },
};

export function KpiTile({
  label,
  value,
  hint,
  icon,
  tone = "default",
  loading,
  onClick,
  active = false,
  badge,
  compact = false,
  sx = {},
}: KpiTileProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const t = TONES[tone];
  const isInteractive = Boolean(onClick);

  return (
    <Card
      elevation={0}
      onClick={onClick}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      sx={{
        p: compact ? { xs: 1.25, sm: 1.75 } : { xs: 1.5, sm: 2.25 },
        bgcolor: active
          ? isDark
            ? alpha(t.fg, 0.14)
            : alpha(t.bg, 0.5)
          : isDark
            ? "#1e293b"
            : "#ffffff",
        border: "1px solid",
        borderColor: active
          ? isDark
            ? t.fg
            : t.fg
          : isDark
            ? "rgba(255, 255, 255, 0.08)"
            : "#e2e8f0",
        borderRadius: 3,
        display: "flex",
        gap: compact ? { xs: 1.25, sm: 1.75 } : { xs: 1.5, sm: 2 },
        alignItems: "center",
        height: "100%",
        minWidth: 0,
        position: "relative",
        overflow: "hidden",
        cursor: isInteractive ? "pointer" : "default",
        boxShadow: active
          ? `0 0 0 2px ${alpha(t.fg, 0.25)}`
          : isDark
            ? "none"
            : "0 1px 3px rgba(15,23,42,0.06)",
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "&:hover": isInteractive
          ? {
              borderColor: isDark ? t.fg : t.fg,
              transform: "translateY(-1px)",
              boxShadow: isDark
                ? `0 4px 20px -2px ${t.glow}`
                : "0 4px 12px rgba(15,23,42,0.08)",
            }
          : undefined,
        ...sx,
      }}
    >
      {icon && (
        <Box
          sx={{
            flexShrink: 0,
            width: compact ? { xs: 34, sm: 42 } : { xs: 38, sm: 48 },
            height: compact ? { xs: 34, sm: 42 } : { xs: 38, sm: 48 },
            borderRadius: 2.5,
            bgcolor: t.bg,
            color: isDark ? (tone === "default" ? "#94a3b8" : t.fg) : t.fg,
            border: `1px solid ${isDark ? t.border : "rgba(0,0,0,0.06)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            "& svg": {
              fontSize: compact
                ? { xs: "1.1rem", sm: "1.35rem" }
                : { xs: "1.25rem", sm: "1.5rem" },
            },
          }}
        >
          {icon}
        </Box>
      )}

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 0.25 }}>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: isDark ? "#94a3b8" : "#64748b",
              fontSize: "0.68rem",
              lineHeight: 1.2,
            }}
            noWrap
          >
            {label}
          </Typography>
          {badge}
        </Box>

        {loading ? (
          <Skeleton
            variant="text"
            width={100}
            height={32}
            sx={{ bgcolor: isDark ? "rgba(255,255,255,0.06)" : undefined }}
          />
        ) : (
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color: isDark
                ? (tone === "default" ? "#f8fafc" : t.fg)
                : (tone === "default" ? "#0f172a" : t.fg),
              lineHeight: 1.15,
              fontSize: compact
                ? { xs: "1.05rem", sm: "1.25rem" }
                : { xs: "1.15rem", sm: "1.45rem" },
              letterSpacing: "-0.02em",
              fontFamily: "'JetBrains Mono', 'Plus Jakarta Sans', sans-serif",
              fontVariantNumeric: "tabular-nums",
            }}
            noWrap
          >
            {value}
          </Typography>
        )}

        {hint && (
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 0.25,
              color: isDark ? "#94a3b8" : "#64748b",
              fontSize: "0.7rem",
              lineHeight: 1.2,
            }}
            noWrap
          >
            {hint}
          </Typography>
        )}
      </Box>
    </Card>
  );
}
