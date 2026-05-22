import { Box, Typography, useTheme } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { ReactNode } from "react";

/**
 * ListPageShell — full-viewport scaffold for list/table pages.
 *
 * Layout:
 *   [ Header (title + actions) ]   ← fixed top
 *   [ Filter / KPI strip ]         ← optional, fixed
 *   [ Table content ]              ← flex-grow; internal scroll
 *
 * Designed for pairing with `<StatTable height="fill" />` so the grid
 * fills the remaining viewport height instead of expanding the whole page.
 */
export function ListPageShell({
  title,
  subtitle,
  icon,
  actions,
  filters,
  kpis,
  children,
  containerSx,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  filters?: ReactNode;
  kpis?: ReactNode;
  children: ReactNode;
  containerSx?: SxProps<Theme>;
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: { xs: "auto", md: "calc(100vh - 96px)" },
        minHeight: { xs: "calc(100vh - 96px)", md: "auto" },
        gap: { xs: 1.5, md: 2 },
        ...(containerSx as any),
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "flex-start" },
          justifyContent: "space-between",
          gap: 2,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
          {icon && (
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h4" sx={{ lineHeight: 1.1 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>

        {actions && (
          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexShrink: 0,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {actions}
          </Box>
        )}
      </Box>

      {/* KPI strip */}
      {kpis && <Box sx={{ flexShrink: 0 }}>{kpis}</Box>}

      {/* Filter strip */}
      {filters && (
        <Box
          sx={{
            flexShrink: 0,
            p: 1.5,
            bgcolor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.border.subtle}`,
            borderRadius: 2.5,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
          }}
        >
          {filters}
        </Box>
      )}

      {/* Table — fills remaining space */}
      <Box
        sx={{
          flex: 1,
          minHeight: { xs: 480, md: 0 },
          display: "flex",
          flexDirection: "column",
          border: `1px solid ${theme.palette.border.subtle}`,
          borderRadius: 2.5,
          overflow: "hidden",
          bgcolor: theme.palette.background.paper,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
