import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Box, Typography, Skeleton, Chip } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useDashboardKPIs } from "@/features/dashboard/hooks/useDashboardHooks";
import dayjs from "dayjs";
import { dashboardTokens as dt, dashboardTones } from "../_tokens";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);

const fmtFull = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

const RevenueTrendChart: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useDashboardKPIs();

  const chartData = useMemo(
    () =>
      (data?.revenueTrend ?? []).map((d: { date: string; revenue: number }) => ({
        date: dayjs(d.date).format("MMM D"),
        revenue: parseFloat(d.revenue as unknown as string) || 0,
      })),
    [data],
  );

  const { total, peak, deltaPct } = useMemo(() => {
    if (chartData.length === 0) return { total: 0, peak: 0, deltaPct: null as number | null };
    const total = chartData.reduce((s: number, x: any) => s + x.revenue, 0);
    const peak = Math.max(...chartData.map((x: any) => x.revenue));
    const first = chartData[0]?.revenue || 0;
    const last = chartData[chartData.length - 1]?.revenue || 0;
    const deltaPct = first > 0 ? ((last - first) / first) * 100 : null;
    return { total, peak, deltaPct };
  }, [chartData]);

  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        px: { xs: 1.75, sm: 2 },
        py: 1.5,
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, mb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, minWidth: 0 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: "8px",
              bgcolor: `${dashboardTones.primary.strong}15`,
              color: dashboardTones.primary.strong,
              border: `1px solid ${dashboardTones.primary.strong}25`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              mt: 0.25,
            }}
          >
            <TrendingUpIcon sx={{ fontSize: 16 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                color: dt.color.foregroundMuted,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontSize: "0.68rem",
                lineHeight: 1.3,
                display: "block",
              }}
            >
              {t("dashboard.widgets.revenueTrend", "Revenue Trend")} · {t("dashboard.widgets.lastNDays", { count: 30, defaultValue: "Last 30 Days" })}
            </Typography>
            {!isLoading && (
              <Typography
                sx={{
                  fontSize: { xs: "1.2rem", sm: "1.35rem" },
                  fontWeight: 800,
                  color: dt.color.foreground,
                  lineHeight: 1.15,
                  mt: 0.2,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.02em",
                }}
              >
                {fmtFull(total)}
              </Typography>
            )}
          </Box>
        </Box>

        {!isLoading && deltaPct != null && (
          <Chip
            size="small"
            label={`${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%`}
            sx={{
              fontWeight: 800,
              fontSize: "0.68rem",
              height: 22,
              bgcolor: deltaPct >= 0 ? dashboardTones.accent.soft : dashboardTones.danger.soft,
              color: deltaPct >= 0 ? dashboardTones.accent.on : dashboardTones.danger.on,
              border: 0,
              flexShrink: 0,
            }}
          />
        )}
      </Box>

      {/* Chart */}
      {isLoading ? (
        <Skeleton variant="rectangular" sx={{ flexGrow: 1, borderRadius: dt.radius.md }} />
      ) : (
        <Box sx={{ flexGrow: 1, minHeight: 0, minWidth: 0, width: "100%", height: "100%" }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={150}>
            <BarChart
              data={chartData}
              margin={{ top: 6, right: 6, left: -10, bottom: 0 }}
              barCategoryGap="24%"
            >
              <defs>
                <linearGradient id="revBarFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={dashboardTones.primary.strong} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={dashboardTones.primary.strong} stopOpacity={0.45} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 4" stroke={dt.color.border} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: dt.color.foregroundFaint }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={25}
              />
              <YAxis
                tickFormatter={fmt}
                tick={{ fontSize: 10, fill: dt.color.foregroundFaint }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                cursor={{ fill: `${dashboardTones.primary.strong}12` }}
                formatter={(v) => [fmtFull(Number(v)), "Revenue"]}
                labelStyle={{ fontSize: 11, color: dt.color.foreground, fontWeight: 700 }}
                contentStyle={{
                  fontSize: 11,
                  border: `1px solid ${dt.color.border}`,
                  borderRadius: 8,
                  boxShadow: dt.shadow.md,
                  padding: "6px 10px",
                }}
                itemStyle={{ color: dt.color.foreground, fontWeight: 600 }}
              />
              <Bar dataKey="revenue" fill="url(#revBarFill)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Footer Micro-Stat */}
      {!isLoading && peak > 0 && (
        <Typography
          variant="caption"
          sx={{
            color: dt.color.foregroundFaint,
            fontSize: "0.68rem",
            mt: 0.5,
            fontWeight: 500,
          }}
        >
          {t("dashboard.widgets.peakDay", { value: fmtFull(peak), defaultValue: `Peak day · ${fmtFull(peak)}` })}
        </Typography>
      )}
    </Box>
  );
};

export default RevenueTrendChart;
