import { Box, Skeleton, Typography, useTheme } from "@mui/material";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface TrendChartProps {
  data: Array<Record<string, any>>;
  xKey: string;
  yKey: string;
  loading?: boolean;
  height?: number;
  color?: string;
  yFormatter?: (v: number) => string;
  emptyLabel?: string;
}

export function TrendChart({
  data,
  xKey,
  yKey,
  loading,
  height = 240,
  color = "#f59e0b",
  yFormatter,
  emptyLabel = "No data for this period",
}: TrendChartProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  if (loading) {
    return (
      <Skeleton
        variant="rectangular"
        height={height}
        sx={{
          borderRadius: 3,
          bgcolor: isDark ? "rgba(255, 255, 255, 0.06)" : undefined,
        }}
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <Box
        sx={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px dashed",
          borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "#e2e8f0",
          borderRadius: 3,
          color: isDark ? "#94a3b8" : "text.secondary",
          bgcolor: isDark ? "rgba(15, 23, 42, 0.4)" : "#f8fafc",
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {emptyLabel}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0"}
            vertical={false}
          />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" }}
            axisLine={{ stroke: isDark ? "#334155" : "#e2e8f0" }}
            tickLine={false}
          />
          <YAxis
            tick={{
              fontSize: 11,
              fill: isDark ? "#94a3b8" : "#64748b",
              fontFamily: "'JetBrains Mono', monospace",
            }}
            tickFormatter={yFormatter}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "#1e293b" : "#ffffff",
              border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
              borderRadius: "10px",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
              color: isDark ? "#f8fafc" : "#0f172a",
              fontSize: "0.8rem",
              fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
            }}
            formatter={(v: any) => [
              yFormatter ? yFormatter(Number(v)) : String(v),
              "Value",
            ]}
          />
          <Area
            type="monotone"
            dataKey={yKey}
            stroke={color}
            fill="url(#trendGradient)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: color, strokeWidth: 1, stroke: "#ffffff" }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "#ffffff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}
