import React from "react";
import { Box, Typography, keyframes, SxProps, Theme } from "@mui/material";

// ─── Keyframe Animations ─────────────────────────────────────────────────────
const rotateClockwise = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const rotateCounterClockwise = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(-360deg); }
`;

const pulseGlow = keyframes`
  0%, 100% { opacity: 0.65; transform: scale(0.95); }
  50% { opacity: 1; transform: scale(1.08); filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.85)); }
`;

const pulseText = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`;

// ─── Size Presets ────────────────────────────────────────────────────────────
export type GearGridLoaderSize = "xs" | "sm" | "md" | "lg" | "xl" | number;

const SIZE_MAP: Record<string, number> = {
  xs: 18,
  sm: 24,
  md: 44,
  lg: 64,
  xl: 88,
};

export interface GearGridLoaderProps {
  size?: GearGridLoaderSize;
  color?: "primary" | "secondary" | "accent" | "white" | "inherit" | string;
  label?: string;
  sublabel?: string;
  fullscreen?: boolean;
  centered?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * Custom GearGrid signature loader component.
 * Features synchronized dual-gear rotational mechanics, coordinate grid lattice,
 * and an ambient pulsing power-core.
 */
export const GearGridLoader: React.FC<GearGridLoaderProps> = ({
  size = "md",
  color = "primary",
  label,
  sublabel,
  fullscreen = false,
  centered = false,
  sx,
}) => {
  const pixelSize = typeof size === "number" ? size : SIZE_MAP[size] || 44;
  const isMicro = pixelSize <= 24;

  // Resolve color palette
  const getColors = () => {
    switch (color) {
      case "white":
        return {
          outer: "#FFFFFF",
          inner: "rgba(255, 255, 255, 0.75)",
          core: "#F59E0B",
          glow: "rgba(255, 255, 255, 0.4)",
        };
      case "secondary":
        return {
          outer: "#0F172A",
          inner: "#334155",
          core: "#F59E0B",
          glow: "rgba(15, 23, 42, 0.25)",
        };
      case "accent":
        return {
          outer: "#2563EB",
          inner: "#60A5FA",
          core: "#F59E0B",
          glow: "rgba(37, 99, 235, 0.35)",
        };
      case "inherit":
        return {
          outer: "currentColor",
          inner: "currentColor",
          core: "currentColor",
          glow: "transparent",
        };
      case "primary":
      default:
        return {
          outer: "#F59E0B",
          inner: "#D97706",
          core: "#FBBF24",
          glow: "rgba(245, 158, 11, 0.45)",
        };
    }
  };

  const colors = getColors();

  const loaderSvg = (
    <Box
      component="svg"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      sx={{
        width: pixelSize,
        height: pixelSize,
        display: "block",
        flexShrink: 0,
        filter: isMicro ? "none" : `drop-shadow(0 2px 8px ${colors.glow})`,
      }}
    >
      <defs>
        <radialGradient id={`gg-core-grad-${pixelSize}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="40%" stopColor={colors.core} />
          <stop offset="100%" stopColor={colors.inner} stopOpacity="0.8" />
        </radialGradient>
        <linearGradient id={`gg-outer-grad-${pixelSize}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.outer} />
          <stop offset="100%" stopColor={colors.inner} />
        </linearGradient>
      </defs>

      {/* ── Outer Primary Gear (Rotates Clockwise: 3.2s) ── */}
      <Box
        component="g"
        sx={{
          transformOrigin: "32px 32px",
          animation: `${rotateClockwise} 3.2s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
        }}
      >
        {/* Gear Rim Body */}
        <circle
          cx="32"
          cy="32"
          r="23"
          stroke={`url(#gg-outer-grad-${pixelSize})`}
          strokeWidth="3.5"
          fill="none"
        />

        {/* 8 Chamfered Industrial Gear Teeth */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <rect
            key={deg}
            x="29"
            y="4.5"
            width="6"
            height="6"
            rx="1.5"
            fill={colors.outer}
            transform={`rotate(${deg} 32 32)`}
          />
        ))}

        {/* Outer Coordinate Compass Pips (Skipped on micro icons for crispness) */}
        {!isMicro &&
          [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((deg) => (
            <circle
              key={deg}
              cx="32"
              cy="9"
              r="1"
              fill={colors.inner}
              transform={`rotate(${deg} 32 32)`}
            />
          ))}
      </Box>

      {/* ── Inner Coordinate Grid & Secondary Ring (Rotates Counter-Clockwise: 2.1s) ── */}
      <Box
        component="g"
        sx={{
          transformOrigin: "32px 32px",
          animation: `${rotateCounterClockwise} 2.1s linear infinite`,
        }}
      >
        {/* Inner Ring */}
        <circle
          cx="32"
          cy="32"
          r="14.5"
          stroke={colors.inner}
          strokeWidth="2"
          strokeDasharray={isMicro ? "none" : "4 2.5"}
          fill="none"
          opacity={0.9}
        />

        {/* 4 Precision Crosshair Rays */}
        {!isMicro && (
          <>
            <line x1="32" y1="18.5" x2="32" y2="23.5" stroke={colors.outer} strokeWidth="2" strokeLinecap="round" />
            <line x1="32" y1="40.5" x2="32" y2="45.5" stroke={colors.outer} strokeWidth="2" strokeLinecap="round" />
            <line x1="18.5" y1="32" x2="23.5" y2="32" stroke={colors.outer} strokeWidth="2" strokeLinecap="round" />
            <line x1="40.5" y1="32" x2="45.5" y2="32" stroke={colors.outer} strokeWidth="2" strokeLinecap="round" />
          </>
        )}

        {/* 4 Inner Teeth on Secondary Ring */}
        {[0, 90, 180, 270].map((deg) => (
          <rect
            key={`in-${deg}`}
            x="30"
            y="15.5"
            width="4"
            height="3"
            rx="0.75"
            fill={colors.inner}
            transform={`rotate(${deg + 22.5} 32 32)`}
          />
        ))}
      </Box>

      {/* ── Center Power Core (Breathing Pulse: 1.6s) ── */}
      <Box
        component="g"
        sx={{
          transformOrigin: "32px 32px",
          animation: `${pulseGlow} 1.6s ease-in-out infinite`,
        }}
      >
        {/* Central Core Outer Glow Ring */}
        <circle cx="32" cy="32" r="7" fill={colors.glow} opacity={0.5} />
        {/* Central Core Hub */}
        <circle
          cx="32"
          cy="32"
          r="5"
          fill={`url(#gg-core-grad-${pixelSize})`}
          stroke="#FFFFFF"
          strokeWidth="0.8"
        />
        {/* Center Grid Diamond Node */}
        <rect
          x="30.5"
          y="30.5"
          width="3"
          height="3"
          fill="#FFFFFF"
          transform="rotate(45 32 32)"
        />
      </Box>
    </Box>
  );

  const content = (
    <Box
      sx={{
        display: "inline-flex",
        flexDirection: label ? "column" : "row",
        alignItems: "center",
        justifyContent: "center",
        gap: label ? 1.5 : 0,
        ...sx,
      }}
    >
      {loaderSvg}

      {label && (
        <Box sx={{ textAlign: "center" }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              fontSize: pixelSize >= 44 ? "0.875rem" : "0.75rem",
              letterSpacing: "0.02em",
              color: color === "white" ? "#FFFFFF" : "text.primary",
              animation: `${pulseText} 2s ease-in-out infinite`,
            }}
          >
            {label}
          </Typography>
          {sublabel && (
            <Typography
              variant="caption"
              sx={{
                display: "block",
                color: color === "white" ? "rgba(255, 255, 255, 0.7)" : "text.secondary",
                fontSize: "0.72rem",
                mt: 0.25,
              }}
            >
              {sublabel}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );

  if (fullscreen) {
    return (
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(15, 23, 42, 0.72)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <Box
          sx={{
            p: 4,
            borderRadius: 4,
            backgroundColor: "rgba(15, 23, 42, 0.85)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(245, 158, 11, 0.15)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {content}
        </Box>
      </Box>
    );
  }

  if (centered) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          py: 4,
        }}
      >
        {content}
      </Box>
    );
  }

  return content;
};

export default GearGridLoader;
