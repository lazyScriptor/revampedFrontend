import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Box, Typography, Skeleton, LinearProgress, Chip } from "@mui/material";
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import { useUtilizationSparkline } from "@/features/dashboard/hooks/useDashboardHooks";
import dayjs from "dayjs";
import { dashboardTokens as dt, dashboardTones } from "../_tokens";

const UtilizationSparkline: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useUtilizationSparkline();

  const chartData = useMemo(() => {
    return (data?.sparklineData ?? []).map(
      (d: { date: string; utilization: number }) => ({
        date: dayjs(d.date).format("ddd"),
        utilization: d.utilization,
      }),
    );
  }, [data?.sparklineData]);

  const rate = data?.currentRate ?? 0;

  // Tone-driven, semantic — same scale as before but pulls from the shared palette.
  const tone =
    rate >= 75 ? dashboardTones.accent :
    rate >= 40 ? dashboardTones.warning :
    dashboardTones.danger;

  const gradientId = "utilGrad";

  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        px: 2,
        py: 1.75,
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 0.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              color: dt.color.foregroundMuted,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontSize: "0.68rem",
              lineHeight: 1.4,
            }}
          >
            {t("dashboard.widgets.fleetUtilization")}
          </Typography>
          {!isLoading && (
            <Typography
              variant="caption"
              sx={{ display: "block", color: dt.color.foregroundFaint, fontWeight: 500, fontSize: "0.72rem", mt: 0.25 }}
            >
              {t("dashboard.widgets.totalUnits", { count: data?.totalOwned ?? 0 })} · {t("dashboard.widgets.sevenDayTrend")}
            </Typography>
          )}
        </Box>

        {!isLoading && (
          <Box sx={{ textAlign: "right", flexShrink: 0 }}>
            <Typography
              sx={{
                fontSize: { xs: "1.6rem", sm: "1.8rem" },
                fontWeight: 800,
                color: tone.strong,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.02em",
              }}
            >
              {rate}%
            </Typography>
            <Chip
              size="small"
              label={rate >= 75 ? "Healthy" : rate >= 40 ? "Watch" : "Low"}
              sx={{
                mt: 0.5,
                height: 18,
                fontSize: "0.65rem",
                fontWeight: 800,
                bgcolor: tone.soft,
                color: tone.on,
                border: 0,
              }}
            />
          </Box>
        )}
      </Box>

      {isLoading ? (
        <>
          <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1.5 }} />
          <Skeleton variant="rounded" sx={{ flexGrow: 1, borderRadius: 2 }} />
        </>
      ) : (
        <>
          {/* Slim progress bar mirrors the headline number */}
          <LinearProgress
            variant="determinate"
            value={rate}
            sx={{
              height: 5,
              borderRadius: 99,
              mt: 1.25,
              mb: 1.75,
              bgcolor: dt.color.surfaceMuted,
              "& .MuiLinearProgress-bar": {
                bgcolor: tone.strong,
                borderRadius: 99,
              },
            }}
          />

          {/* Area sparkline */}
          <Box sx={{ flexGrow: 1, minHeight: 0, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={tone.strong} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={tone.strong} stopOpacity={0} />
                  </linearGradient>
                </defs>

                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: dt.color.foregroundFaint, fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                  dy={6}
                />
                <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />

                <Tooltip
                  formatter={(v) => [`${v}%`, "Utilization"] as [string, string]}
                  contentStyle={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: dt.color.foreground,
                    border: `1px solid ${dt.color.border}`,
                    borderRadius: 8,
                    boxShadow: dt.shadow.md,
                    padding: "6px 10px",
                  }}
                  cursor={{
                    stroke: dt.color.borderStrong,
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="utilization"
                  stroke={tone.strong}
                  strokeWidth={2.5}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff", fill: tone.strong }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </>
      )}
    </Box>
  );
};

export default UtilizationSparkline;
