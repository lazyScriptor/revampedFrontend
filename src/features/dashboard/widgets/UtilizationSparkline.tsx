import React, { useMemo } from "react";
import { Box, Typography, Skeleton, LinearProgress } from "@mui/material";
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

const UtilizationSparkline: React.FC = () => {
  const { data, isLoading } = useUtilizationSparkline();

  // Format data for the chart, mapping ISO dates to short weekday names (e.g., 'Mon')
  const chartData = useMemo(() => {
    return (data?.sparklineData ?? []).map(
      (d: { date: string; utilization: number }) => ({
        date: dayjs(d.date).format("ddd"),
        utilization: d.utilization,
      }),
    );
  }, [data?.sparklineData]);

  const rate = data?.currentRate ?? 0;
  // Sleek, muted traffic-light colors for enterprise feel
  const rateColor = rate >= 75 ? "#10B981" : rate >= 40 ? "#F59E0B" : "#EF4444";

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        p: 3, // Premium breathing room
        bgcolor: "transparent",
      }}
    >
      {/* 1. Sleek Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          mb: 0.5,
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            color: "text.primary",
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          Fleet Utilization
        </Typography>
        {!isLoading && (
          <Typography
            sx={{
              fontSize: "2rem",
              fontWeight: 700,
              color: rateColor,
              lineHeight: 1,
            }}
          >
            {rate}%
          </Typography>
        )}
      </Box>

      {/* 2. Loading State vs Content */}
      {isLoading ? (
        <>
          <Skeleton variant="text" width="60%" height={24} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" sx={{ flexGrow: 1, borderRadius: 2 }} />
        </>
      ) : (
        <>
          {/* Context Line & Progress Bar */}
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", mb: 2, fontWeight: 500 }}
          >
            {data?.totalOwned ?? 0} total units · 7-day trend
          </Typography>

          <LinearProgress
            variant="determinate"
            value={rate}
            sx={{
              height: 4, // Thinner, sleeker progress bar
              borderRadius: 2,
              mb: 3, // Space before the chart
              bgcolor: "#F1F5F9",
              "& .MuiLinearProgress-bar": {
                bgcolor: rateColor,
                borderRadius: 2,
              },
            }}
          />

          {/* 3. The Fluid Chart Container */}
          <Box sx={{ flexGrow: 1, minHeight: 0, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                    {/* Modern subtle gradient fade */}
                    <stop
                      offset="0%"
                      stopColor={rateColor}
                      stopOpacity={0.25}
                    />
                    <stop offset="100%" stopColor={rateColor} stopOpacity={0} />
                  </linearGradient>
                </defs>

                {/* Clean, minimalist axes */}
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "#64748B", fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                {/* Hidden Y-Axis to give the area chart a defined floor/ceiling without visual clutter */}
                <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />

                <Tooltip
                  formatter={(v) => [`${v}%`, "Utilization"] as [string, string]}
                  contentStyle={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#0F172A",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                  }}
                  cursor={{
                    stroke: "#CBD5E1",
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="utilization"
                  stroke={rateColor}
                  strokeWidth={3} // Bolder line for premium feel
                  fill="url(#utilGrad)"
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0, fill: rateColor }}
                  isAnimationActive={false} // Prevents lag during dashboard drag/drop
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
