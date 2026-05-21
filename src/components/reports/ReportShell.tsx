import { Box, Paper, Typography } from "@mui/material";

interface ReportShellProps {
  title: string;
  subtitle?: string;
  filterSlot?: React.ReactNode;
  actionsSlot?: React.ReactNode;
  children: React.ReactNode;
}

// Page-level shell every Reports surface drops into. Owns title + subtitle +
// the filter strip and the export button slot. Body content is the caller's
// responsibility — usually KPI tiles + a StatTable / TrendChart.
export function ReportShell({ title, subtitle, filterSlot, actionsSlot, children }: ReportShellProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 1.5,
          alignItems: { md: "flex-end" },
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {actionsSlot && (
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            {actionsSlot}
          </Box>
        )}
      </Box>

      {filterSlot && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            border: "1px solid #e2e8f0",
            borderRadius: 2.5,
            bgcolor: "white",
          }}
        >
          {filterSlot}
        </Paper>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>{children}</Box>
    </Box>
  );
}
