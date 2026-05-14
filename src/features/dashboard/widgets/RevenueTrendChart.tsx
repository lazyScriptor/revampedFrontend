import React from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useDashboardKPIs } from '@/features/dashboard/hooks/useDashboardHooks';
import dayjs from 'dayjs';

const RevenueTrendChart: React.FC = () => {
  const { data, isLoading } = useDashboardKPIs();

  const chartData = (data?.revenueTrend ?? []).map((d: { date: string; revenue: number }) => ({
    date: dayjs(d.date).format('MMM D'),
    revenue: parseFloat(d.revenue as unknown as string) || 0,
  }));

  const fmt = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(v);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}
      >
        Revenue Trend (30d)
      </Typography>

      {isLoading ? (
        <Skeleton variant="rectangular" sx={{ flexGrow: 1, borderRadius: 1 }} />
      ) : (
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={fmt}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip
                formatter={(v) => [fmt(Number(v)), 'Revenue']}
                labelStyle={{ fontSize: 11, color: '#0f172a' }}
                contentStyle={{ fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 6, boxShadow: 'none' }}
              />
              <Bar dataKey="revenue" fill="#2563eb" radius={[3, 3, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Box>
  );
};

export default RevenueTrendChart;
