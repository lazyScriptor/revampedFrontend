import { Box, Skeleton, Typography } from "@mui/material";
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
  color = "#2563eb",
  yFormatter,
  emptyLabel = "No data for this period",
}: TrendChartProps) {
  if (loading) {
    return <Skeleton variant="rectangular" height={height} sx={{ borderRadius: 2 }} />;
  }
  if (!data || data.length === 0) {
    return (
      <Box
        sx={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px dashed #e2e8f0",
          borderRadius: 2,
          color: "text.secondary",
        }}
      >
        <Typography variant="body2">{emptyLabel}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#64748b" }} />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={yFormatter} />
          <Tooltip formatter={(v) => (yFormatter ? yFormatter(Number(v)) : String(v))} />
          <Area type="monotone" dataKey={yKey} stroke={color} fill="url(#trendGradient)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}
