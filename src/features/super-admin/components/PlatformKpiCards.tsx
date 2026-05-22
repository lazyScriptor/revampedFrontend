import { Box, Typography } from "@mui/material";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";

interface PlatformKpiCardsProps {
  data: {
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;
    totalGlobalUsers: number;
    overdueTenants?: number;
    totalRevenuePaid?: number;
    tierBreakdown: Array<{ tier: string; count: number }>;
  } | null;
  isLoading: boolean;
}

interface KpiSpec {
  key: keyof Omit<NonNullable<PlatformKpiCardsProps["data"]>, "tierBreakdown" | "totalRevenuePaid">;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  accent: string;
  glow: string;
}

const KPIS: KpiSpec[] = [
  {
    key: "totalTenants",
    label: "Total Tenants",
    hint: "All workspaces on the platform",
    icon: <BusinessOutlinedIcon sx={{ fontSize: 22 }} />,
    accent: "#3b82f6",
    glow: "rgba(59,130,246,0.20)",
  },
  {
    key: "activeTenants",
    label: "Active",
    hint: "In good standing",
    icon: <WorkspacePremiumOutlinedIcon sx={{ fontSize: 22 }} />,
    accent: "#10b981",
    glow: "rgba(16,185,129,0.20)",
  },
  {
    key: "suspendedTenants",
    label: "Suspended",
    hint: "Manually paused",
    icon: <BlockOutlinedIcon sx={{ fontSize: 22 }} />,
    accent: "#ef4444",
    glow: "rgba(239,68,68,0.20)",
  },
  {
    key: "totalGlobalUsers",
    label: "Total Users",
    hint: "Across every tenant",
    icon: <PeopleOutlinedIcon sx={{ fontSize: 22 }} />,
    accent: "#8b5cf6",
    glow: "rgba(139,92,246,0.20)",
  },
];

export default function PlatformKpiCards({ data, isLoading }: PlatformKpiCardsProps) {
  const total = data?.totalTenants ?? 0;
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
        gap: 1.5,
      }}
    >
      {KPIS.map((kpi) => {
        const raw = data ? (data[kpi.key] as number | undefined) : undefined;
        const value = isLoading ? "—" : (raw ?? 0).toLocaleString();
        const pct =
          !isLoading && total > 0 && raw !== undefined && kpi.key !== "totalTenants" && kpi.key !== "totalGlobalUsers"
            ? Math.round(((raw as number) / total) * 100)
            : null;

        return (
          <Box
            key={kpi.key}
            sx={{
              position: "relative",
              p: 2.25,
              borderRadius: 2,
              border: "1px solid #1e293b",
              bgcolor: "#0f172a",
              overflow: "hidden",
              transition: "border-color 150ms, transform 150ms",
              "&:hover": {
                borderColor: kpi.accent,
                transform: "translateY(-1px)",
              },
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                width: 3,
                height: "100%",
                bgcolor: kpi.accent,
                opacity: 0.75,
              },
              "&::after": {
                content: '""',
                position: "absolute",
                top: -20,
                right: -20,
                width: 80,
                height: 80,
                borderRadius: "50%",
                bgcolor: kpi.glow,
                filter: "blur(20px)",
                pointerEvents: "none",
              },
            }}
          >
            <Box sx={{ position: "relative", display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: kpi.glow,
                  color: kpi.accent,
                  flexShrink: 0,
                  border: `1px solid ${kpi.accent}33`,
                }}
              >
                {kpi.icon}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#94a3b8",
                    fontSize: "0.66rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    display: "block",
                    lineHeight: 1.2,
                  }}
                >
                  {kpi.label}
                </Typography>
                <Typography
                  sx={{
                    color: "#f1f5f9",
                    fontSize: "1.8rem",
                    fontWeight: 800,
                    lineHeight: 1.1,
                    mt: 0.25,
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {value}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.5 }}>
                  {pct !== null && (
                    <Box
                      sx={{
                        px: 0.75,
                        py: 0.15,
                        borderRadius: 0.75,
                        bgcolor: kpi.glow,
                        color: kpi.accent,
                        fontSize: "0.62rem",
                        fontWeight: 800,
                        border: `1px solid ${kpi.accent}33`,
                      }}
                    >
                      {pct}%
                    </Box>
                  )}
                  {kpi.hint && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#475569",
                        fontSize: "0.62rem",
                        lineHeight: 1.2,
                      }}
                    >
                      {kpi.hint}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
