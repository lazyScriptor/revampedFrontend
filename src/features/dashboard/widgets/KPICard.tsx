import React from "react";
import { Box, Typography, Skeleton } from "@mui/material";
import type { SxProps } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import RemoveIcon from "@mui/icons-material/Remove";
import {
  dashboardTokens as t,
  dashboardTones,
  type DashboardTone,
} from "../_tokens";

interface KPICardProps {
  label: string;
  value: string | number | null;
  subLabel?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  loading?: boolean;
  /** Pick a semantic tone — drives accent, soft-chip bg, on-tone fg */
  tone?: DashboardTone;
  /** Optional micro-graphic rendered in the footer (sparkline / progress / etc.) */
  footerSlot?: React.ReactNode;
  /** Back-compat: raw hex still accepted but tone is preferred */
  accentColor?: string;
  sx?: SxProps;
}

const TREND_PALETTE = {
  up:      { fg: dashboardTones.accent.on,  bg: dashboardTones.accent.soft,  ring: dashboardTones.accent.strong },
  down:    { fg: dashboardTones.danger.on,  bg: dashboardTones.danger.soft,  ring: dashboardTones.danger.strong },
  neutral: { fg: dashboardTones.slate.on,   bg: dashboardTones.slate.soft,   ring: dashboardTones.slate.strong },
} as const;

const TrendPill: React.FC<{ trend: "up" | "down" | "neutral"; value: string }> = ({ trend, value }) => {
  const p = TREND_PALETTE[trend];
  const Icon = trend === "up" ? ArrowUpwardIcon : trend === "down" ? ArrowDownwardIcon : RemoveIcon;
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.25,
        bgcolor: p.bg,
        color: p.fg,
        fontSize: "0.7rem",
        fontWeight: 700,
        lineHeight: 1,
        py: 0.4,
        pl: 0.5,
        pr: 0.75,
        borderRadius: t.radius.pill,
        letterSpacing: 0.2,
      }}
    >
      <Icon sx={{ fontSize: 12 }} />
      {value}
    </Box>
  );
};

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  subLabel,
  icon,
  trend,
  trendValue,
  loading = false,
  tone,
  footerSlot,
  accentColor,
  sx,
}) => {
  // tone takes precedence; fall back to accentColor for back-compat with the
  // existing widgets that still pass `accentColor="#xxx"`.
  const palette = tone ? dashboardTones[tone] : null;
  const strong = palette?.strong || accentColor || t.color.primary;
  const soft = palette?.soft || t.color.surfaceMuted;

  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 1.25,
        // Subtle tinted top accent — much more modern than full left border.
        position: "relative",
        px: { xs: 1.75, sm: 2.25 },
        py: 1.75,
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          bgcolor: strong,
          opacity: 0.9,
        },
        ...sx,
      }}
    >
      {/* Header: label + icon chip */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: t.color.foregroundMuted,
            fontWeight: 700,
            fontSize: "0.68rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            lineHeight: 1.4,
            // Keep label on one line at narrow widths but allow wrap on truly tiny
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {label}
        </Typography>

        {icon && (
          <Box
            sx={{
              flexShrink: 0,
              width: 34,
              height: 34,
              borderRadius: t.radius.md,
              bgcolor: soft,
              color: strong,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              "& > *": { fontSize: 18 },
            }}
          >
            {icon}
          </Box>
        )}
      </Box>

      {/* Big value */}
      <Box sx={{ minHeight: 36 }}>
        {loading ? (
          <Skeleton variant="text" width="65%" height={36} />
        ) : (
          <Typography
            sx={{
              fontSize: { xs: "1.5rem", sm: "1.7rem" },
              fontWeight: 800,
              color: t.color.foreground,
              lineHeight: 1.1,
              fontVariantNumeric: "tabular-nums", // numbers don't shift on update
              letterSpacing: "-0.01em",
            }}
          >
            {value ?? "—"}
          </Typography>
        )}
      </Box>

      {/* Footer: trend pill + sublabel, or custom footer slot */}
      <Box sx={{ minHeight: 18, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        {footerSlot ? (
          <Box sx={{ width: "100%" }}>{footerSlot}</Box>
        ) : (
          <>
            {trend && trendValue && <TrendPill trend={trend} value={trendValue} />}
            {subLabel && (
              <Typography
                variant="caption"
                sx={{
                  color: t.color.foregroundFaint,
                  fontWeight: 500,
                  fontSize: "0.72rem",
                  lineHeight: 1.4,
                }}
              >
                {subLabel}
              </Typography>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};
