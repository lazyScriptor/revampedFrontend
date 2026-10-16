import { Box, Paper, Typography, useTheme } from "@mui/material";
import { motion } from "framer-motion";

interface ReportShellProps {
  title: string;
  subtitle?: string;
  filterSlot?: React.ReactNode;
  actionsSlot?: React.ReactNode;
  children: React.ReactNode;
  fillViewport?: boolean;
}

export function ReportShell({
  title,
  subtitle,
  filterSlot,
  actionsSlot,
  children,
  fillViewport = false,
}: ReportShellProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        height: fillViewport ? "100%" : "auto",
        minHeight: 0,
      }}
    >
      {/* ── Top Header & Actions Bar ──────────────────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 1.5,
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color: isDark ? "#f8fafc" : "#0f172a",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              fontSize: { xs: "1.25rem", sm: "1.5rem" },
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="body2"
              sx={{
                mt: 0.5,
                color: isDark ? "#94a3b8" : "text.secondary",
                fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {actionsSlot && (
          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "center",
              flexWrap: "wrap",
              alignSelf: { xs: "stretch", sm: "auto" },
              justifyContent: { xs: "flex-start", sm: "flex-end" },
              flexShrink: 0,
            }}
          >
            {actionsSlot}
          </Box>
        )}
      </Box>

      {/* ── Filter Strip Container ────────────────────────────────────────── */}
      {filterSlot && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.5, sm: 2 },
            border: "1px solid",
            borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
            borderRadius: 3,
            bgcolor: isDark ? "#1e293b" : "#ffffff",
            flexShrink: 0,
          }}
        >
          {filterSlot}
        </Paper>
      )}

      {/* ── Main Content Body ─────────────────────────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          flex: fillViewport ? 1 : "initial",
          minHeight: 0,
        }}
      >
        {children}
      </Box>
    </motion.div>
  );
}
