import { Box, Typography, Skeleton } from '@mui/material';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface TrendPoint {
    date: string;
    revenue: number;
}

interface Props {
    data?: TrendPoint[];
    isLoading: boolean;
    currency?: string;
}

const fmt = (v: number) => `Rs. ${Number(v).toLocaleString()}`;

export default function RevenueTrendChart({ data, isLoading, currency = 'Rs.' }: Props) {
    const chartData = (data || []).map((d) => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: parseFloat(String(d.revenue)) || 0,
    }));

    if (isLoading) {
        return (
            <Box sx={{ p: 3, bgcolor: 'white', border: '1px solid #e2e8f0', borderRadius: 2.5 }}>
                <Skeleton variant="text" width={200} height={24} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
            </Box>
        );
    }

    return (
        <Box sx={{
            p: 3, bgcolor: 'white', border: '1px solid #e2e8f0', borderRadius: 2.5,
            '&:hover': { borderColor: '#cbd5e1' }, transition: 'border-color 0.2s',
        }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary" sx={{ mb: 0.5 }}>
                Revenue Trend
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Last 30 days — daily collection
            </Typography>

            {chartData.length === 0 ? (
                <Box sx={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="text.secondary" variant="body2">No revenue data for this period</Typography>
                </Box>
            ) : (
                <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                            dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }}
                            axisLine={{ stroke: '#e2e8f0' }} tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            axisLine={false} tickLine={false}
                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                            contentStyle={{
                                fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            }}
                            formatter={(value: number) => [fmt(value), 'Revenue']}
                        />
                        <Area
                            type="monotone" dataKey="revenue" stroke="#2563eb"
                            strokeWidth={2} fill="url(#revenueGrad)" dot={false}
                            activeDot={{ r: 4, fill: '#2563eb', stroke: 'white', strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </Box>
    );
}
