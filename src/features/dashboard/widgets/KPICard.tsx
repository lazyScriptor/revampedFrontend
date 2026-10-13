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
        gap: 0.3,
        bgcolor: p.bg,
        color: p.fg,
        fontSize: "0.68rem",
        fontWeight: 800,
        lineHeight: 1,
        py: 0.35,
        pl: 0.5,
        pr: 0.75,
        borderRadius: t.radius.pill,
        border: `1px solid ${p.ring}30`,
        letterSpacing: 0.2,
        flexShrink: 0,
      }}
    >
      <Icon sx={{ fontSize: 11 }} />
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
        gap: { xs: 1, sm: 1.25 },
        position: "relative",
        px: { xs: 1.5, sm: 2 },
        py: { xs: 1.5, sm: 1.75 },
        overflow: "hidden",
        background: `linear-gradient(145deg, #FFFFFF 0%, ${strong}05 100%)`,
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${strong} 0%, ${strong}55 100%)`,
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
            fontSize: { xs: "0.64rem", sm: "0.68rem" },
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            lineHeight: 1.35,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            flex: 1,
          }}
        >
          {label}
        </Typography>

        {icon && (
          <Box
            sx={{
              flexShrink: 0,
              width: { xs: 30, sm: 34 },
              height: { xs: 30, sm: 34 },
              borderRadius: "10px",
              background: `linear-gradient(135deg, ${soft} 0%, ${strong}18 100%)`,
              border: `1px solid ${strong}28`,
              color: strong,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 2px 6px ${strong}12`,
              "& > *": { fontSize: { xs: 16, sm: 18 } },
            }}
          >
            {icon}
          </Box>
        )}
      </Box>

      {/* Primary Value */}
      <Box sx={{ minHeight: { xs: 28, sm: 34 }, display: "flex", alignItems: "center" }}>
        {loading ? (
          <Skeleton variant="text" width="70%" height={34} />
        ) : (
          <Typography
            sx={{
              fontSize: { xs: "1.3rem", sm: "1.55rem", md: "1.75rem" },
              fontWeight: 800,
              color: t.color.foreground,
              lineHeight: 1.1,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {value ?? "—"}
          </Typography>
        )}
      </Box>

      {/* Footer: Trend Pill / SubLabel / Slot */}
      <Box
        sx={{
          minHeight: 18,
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          flexWrap: "nowrap",
          overflow: "hidden",
        }}
      >
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
                  fontSize: { xs: "0.68rem", sm: "0.72rem" },
                  lineHeight: 1.3,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
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
