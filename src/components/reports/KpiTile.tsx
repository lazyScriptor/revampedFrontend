import { Box, Card, Skeleton, Typography } from "@mui/material";

interface KpiTileProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "default" | "success" | "warning" | "error" | "info";
  loading?: boolean;
}

const TONES: Record<NonNullable<KpiTileProps["tone"]>, { bg: string; fg: string; border: string }> = {
  default: { bg: "#f8fafc", fg: "#0f172a", border: "#e2e8f0" },
  success: { bg: "#ecfdf5", fg: "#047857", border: "#a7f3d0" },
  warning: { bg: "#fffbeb", fg: "#b45309", border: "#fde68a" },
  error: { bg: "#fef2f2", fg: "#b91c1c", border: "#fecaca" },
  info: { bg: "#eff6ff", fg: "#1d4ed8", border: "#bfdbfe" },
};

export function KpiTile({ label, value, hint, icon, tone = "default", loading }: KpiTileProps) {
  const t = TONES[tone];
  return (
    <Card
      elevation={0}
      sx={{
        p: 2,
        bgcolor: "white",
        border: "1px solid",
        borderColor: t.border,
        borderRadius: 2.5,
        display: "flex",
        gap: 1.5,
        alignItems: "center",
        height: "100%",
      }}
    >
      {icon && (
        <Box
          sx={{
            flexShrink: 0,
            width: 44,
            height: 44,
            borderRadius: 2,
            bgcolor: t.bg,
            color: t.fg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </Box>
      )}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
          {label}
        </Typography>
        {loading ? (
          <Skeleton variant="text" width={120} height={32} />
        ) : (
          <Typography variant="h5" sx={{ fontWeight: 800, color: t.fg, lineHeight: 1.2 }}>
            {value}
          </Typography>
        )}
        {hint && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
            {hint}
          </Typography>
        )}
      </Box>
    </Card>
  );
}
