import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Box, Typography, Skeleton, Chip } from "@mui/material";
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
        px: 2,
        py: 1.75,
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, mb: 1.25 }}>
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
            {t("dashboard.widgets.revenueTrend")} · {t("dashboard.widgets.lastNDays", { count: 30 })}
          </Typography>
          {!isLoading && (
            <Typography
              sx={{
                fontSize: "1.25rem",
                fontWeight: 800,
                color: dt.color.foreground,
                lineHeight: 1.2,
                mt: 0.25,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.01em",
              }}
            >
              {fmtFull(total)}
            </Typography>
          )}
        </Box>

        {!isLoading && deltaPct != null && (
          <Chip
            size="small"
            label={`${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%`}
            sx={{
              fontWeight: 800,
              fontSize: "0.7rem",
              height: 22,
              bgcolor: deltaPct >= 0 ? dashboardTones.accent.soft : dashboardTones.danger.soft,
              color: deltaPct >= 0 ? dashboardTones.accent.on : dashboardTones.danger.on,
              border: 0,
            }}
          />
        )}
      </Box>

      {/* Chart */}
      {isLoading ? (
        <Skeleton variant="rectangular" sx={{ flexGrow: 1, borderRadius: 1 }} />
      ) : (
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              barCategoryGap="28%"
            >
              <defs>
                <linearGradient id="revBarFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={dashboardTones.primary.strong} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={dashboardTones.primary.strong} stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 4" stroke={dt.color.border} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: dt.color.foregroundFaint }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={20}
              />
              <YAxis
                tickFormatter={fmt}
                tick={{ fontSize: 10, fill: dt.color.foregroundFaint }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip
                cursor={{ fill: dashboardTones.primary.soft, opacity: 0.4 }}
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

      {/* Footer micro-stat */}
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
          {t("dashboard.widgets.peakDay", { value: fmtFull(peak) })}
        </Typography>
      )}
    </Box>
  );
};

export default RevenueTrendChart;
