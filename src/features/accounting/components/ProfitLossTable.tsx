import { Box, Paper, Typography, Skeleton, Chip, Divider } from '@mui/material';

interface PnLData {
    grossRevenue: number;
    totalRefunds: number;
    netRevenue: number;
    expenses: { category: string; count: string | number; total: string | number }[];
    periodDepreciation: number;
    totalExpenses: number;
    netProfit: number;
    dateRange: { startDate: string; endDate: string };
}

interface Props {
    data?: PnLData;
    isLoading: boolean;
    currency?: string;
}

const fmt = (v: number, currency = 'Rs.') =>
    `${currency} ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const LineItem = ({ label, value, color, bold = false }: { label: string; value: string; color?: string; bold?: boolean }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, px: 1 }}>
        <Typography variant="body2" fontWeight={bold ? 700 : 400} color={bold ? 'text.primary' : 'text.secondary'} sx={{ fontSize: '0.8rem' }}>
            {label}
        </Typography>
        <Typography variant="body2" fontWeight={bold ? 800 : 600} sx={{ fontSize: '0.8rem', color: color || 'text.primary', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
            {value}
        </Typography>
    </Box>
);

export default function ProfitLossTable({ data, isLoading, currency = 'Rs.' }: Props) {
    if (isLoading) {
        return (
            <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: 2.5 }}>
                {[...Array(8)].map((_, i) => <Skeleton key={i} variant="text" height={28} sx={{ mb: 0.5 }} />)}
            </Paper>
        );
    }

    if (!data) {
        return (
            <Paper elevation={0} sx={{ p: 4, border: '1px solid #e2e8f0', borderRadius: 2.5, textAlign: 'center' }}>
                <Typography color="text.secondary">Select a date range and generate the report.</Typography>
            </Paper>
        );
    }

    return (
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2.5, overflow: 'hidden' }}>
            {/* Revenue Section */}
            <Box sx={{ px: 2, py: 1.5, bgcolor: '#f0fdf4', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle2" fontWeight={700} color="#16a34a" sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Revenue
                </Typography>
            </Box>
            <Box sx={{ px: 1, py: 1 }}>
                <LineItem label="Gross Revenue (Payments Received)" value={fmt(data.grossRevenue, currency)} color="#16a34a" />
                <LineItem label="Less: Refunds Issued" value={`(${fmt(data.totalRefunds, currency)})`} color="#dc2626" />
                <Divider sx={{ my: 0.5 }} />
                <LineItem label="Net Revenue" value={fmt(data.netRevenue, currency)} color="#16a34a" bold />
            </Box>

            {/* Expenses Section */}
            <Box sx={{ px: 2, py: 1.5, bgcolor: '#fef2f2', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle2" fontWeight={700} color="#dc2626" sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Operating Expenses
                </Typography>
            </Box>
            <Box sx={{ px: 1, py: 1 }}>
                {data.expenses.map((exp) => (
                    <Box key={exp.category} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, px: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>{exp.category}</Typography>
                            <Chip label={`${exp.count} entries`} size="small" sx={{ fontSize: '0.6rem', height: 18 }} />
                        </Box>
                        <Typography variant="body2" fontWeight={600} color="#dc2626" sx={{ fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums' }}>
                            {fmt(parseFloat(String(exp.total)), currency)}
                        </Typography>
                    </Box>
                ))}
                <Divider sx={{ my: 0.5 }} />
                <LineItem label="Total Operating Expenses" value={fmt(data.totalExpenses, currency)} color="#dc2626" bold />
            </Box>

            {/* Depreciation */}
            <Box sx={{ px: 2, py: 1.5, bgcolor: '#faf5ff', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle2" fontWeight={700} color="#7c3aed" sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Depreciation
                </Typography>
            </Box>
            <Box sx={{ px: 1, py: 1 }}>
                <LineItem label="Equipment Depreciation (Straight-Line / 60 mo.)" value={fmt(data.periodDepreciation, currency)} color="#7c3aed" />
            </Box>

            {/* Net Profit */}
            <Box sx={{
                px: 2, py: 2, bgcolor: data.netProfit >= 0 ? '#f0fdf4' : '#fef2f2',
                borderTop: '2px solid', borderColor: data.netProfit >= 0 ? '#16a34a' : '#dc2626',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <Typography variant="subtitle1" fontWeight={800}>NET PROFIT / (LOSS)</Typography>
                <Typography variant="h6" fontWeight={900} sx={{ color: data.netProfit >= 0 ? '#16a34a' : '#dc2626' }}>
                    {fmt(data.netProfit, currency)}
                </Typography>
            </Box>
        </Paper>
    );
}
