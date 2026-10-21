import React, { useState } from "react";
import { Box, Button, Collapse, Typography, useTheme, alpha } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import BarChartIcon from "@mui/icons-material/BarChart";
import { useTranslation } from "react-i18next";

interface ResponsiveKpiStripProps {
  children: React.ReactNode;
  columns?: number;
  collapsibleOnMobile?: boolean;
  mobileLabel?: string;
  sx?: any;
}

/**
 * ResponsiveKpiStrip:
 * - Desktop/Tablet (md+): Balanced CSS Grid (e.g. 4 columns).
 * - Mobile (xs): Ultra-compact horizontally scrollable strip (takes ~70px instead of 260px),
 *   with an optional quick toggle to collapse/expand for maximum data table focus.
 */
export function ResponsiveKpiStrip({
  children,
  columns = 4,
  collapsibleOnMobile = true,
  mobileLabel,
  sx = {},
}: ResponsiveKpiStripProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [mobileExpanded, setMobileExpanded] = useState(true);

  return (
    <Box sx={{ flexShrink: 0, width: "100%", ...sx }}>
      {/* Mobile-only toggle header */}
      {collapsibleOnMobile && (
        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            alignItems: "center",
            justifyContent: "space-between",
            mb: mobileExpanded ? 1 : 0.25,
            px: 0.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <BarChartIcon sx={{ fontSize: 16, color: theme.palette.primary.main }} />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: isDark ? "#94a3b8" : "#64748b",
                fontSize: "0.68rem",
              }}
            >
              {mobileLabel ?? t("shared.ResponsiveKpiStrip.overviewMetrics")}
            </Typography>
          </Box>
          <Button
            size="small"
            variant="text"
            onClick={() => setMobileExpanded((prev) => !prev)}
            endIcon={
              mobileExpanded ? (
                <KeyboardArrowUpIcon sx={{ fontSize: "16px !important" }} />
              ) : (
                <KeyboardArrowDownIcon sx={{ fontSize: "16px !important" }} />
              )
            }
            sx={{
              py: 0.25,
              px: 1,
              minHeight: 24,
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "none",
              color: isDark ? "#94a3b8" : "text.secondary",
              "&:hover": {
                bgcolor: isDark ? "rgba(255,255,255,0.06)" : alpha(theme.palette.primary.main, 0.08),
              },
            }}
          >
            {mobileExpanded ? t("common.hide") : t("common.show")}
          </Button>
        </Box>
      )}

      {/* Content wrapper */}
      <Collapse in={mobileExpanded || !collapsibleOnMobile} timeout={200}>
        <Box
          sx={{
            // Mobile: Horizontal scrolling snap container
            display: { xs: "flex", md: "grid" },
            gridTemplateColumns: {
              md: `repeat(${columns}, 1fr)`,
            },
            gap: { xs: 1.25, sm: 1.5, md: 2 },
            overflowX: { xs: "auto", md: "visible" },
            scrollSnapType: { xs: "x mandatory", md: "none" },
            WebkitOverflowScrolling: "touch",
            pb: { xs: 0.5, md: 0 },
            pt: 0.25,
            "&::-webkit-scrollbar": {
              height: 4,
            },
            "&::-webkit-scrollbar-track": {
              background: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              background: isDark ? "#334155" : "#e2e8f0",
              borderRadius: 4,
            },
            "& > *": {
              flex: { xs: "0 0 170px", sm: "0 0 200px", md: "initial" },
              scrollSnapAlign: { xs: "start", md: "unset" },
              minWidth: { xs: 160, md: 0 },
            },
          }}
        >
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}
