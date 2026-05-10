import { Box, Paper, Typography, Skeleton, Chip } from '@mui/material';

interface CashFlowMethod {
    method: string;
    income: number;
    refunds: number;
    net: number;
    transaction_count: number;
}

interface CashFlowData {
    date: string;
    methods: CashFlowMethod[];
    totals: {
        totalIncome: number;
        totalRefunds: number;
        totalNet: number;
        totalTransactions: number;
    };
}

interface Props {
    data?: CashFlowData;
    isLoading: boolean;
    currency?: string;
}

const fmt = (v: number, c = 'Rs.') =>
    `${c} ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const methodColors: Record<string, string> = {
    Cash: '#16a34a',
    Card: '#2563eb',
    'Bank Transfer': '#7c3aed',
    Online: '#0891b2',
};

export default function CashFlowSummary({ data, isLoading, currency = 'Rs.' }: Props) {
    if (isLoading) {
        return (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                {[...Array(4)].map((_, i) => (
                    <Paper key={i} elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: 2.5 }}>
                        <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
                        <Skeleton variant="text" width="80%" height={32} />
                    </Paper>
                ))}
            </Box>
        );
    }

    if (!data || data.methods.length === 0) {
        return (
            <Paper elevation={0} sx={{ p: 4, border: '1px solid #e2e8f0', borderRadius: 2.5, textAlign: 'center' }}>
                <Typography color="text.secondary">No transactions recorded for {data?.date || 'today'}.</Typography>
            </Paper>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Totals row */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
                <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2.5 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.6rem', textTransform: 'uppercase' }}>
                        Total Income
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="#16a34a">{fmt(data.totals.totalIncome, currency)}</Typography>
                </Paper>
                <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2.5 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.6rem', textTransform: 'uppercase' }}>
                        Total Refunds
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="#dc2626">{fmt(data.totals.totalRefunds, currency)}</Typography>
                </Paper>
                <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2.5 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.6rem', textTransform: 'uppercase' }}>
                        Net Cash Flow
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color={data.totals.totalNet >= 0 ? '#16a34a' : '#dc2626'}>
                        {fmt(data.totals.totalNet, currency)}
                    </Typography>
                </Paper>
                <Paper elevation={0} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2.5 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.6rem', textTransform: 'uppercase' }}>
                        Transactions
                    </Typography>
                    <Typography variant="h6" fontWeight={800}>{data.totals.totalTransactions}</Typography>
                </Paper>
            </Box>

            {/* Method breakdown */}
            <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2.5, overflow: 'hidden' }}>
                <Box sx={{
                    display: 'grid', gridTemplateColumns: '1fr 110px 110px 110px 80px',
                    gap: 1, px: 2, py: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0',
                }}>
                    {['Payment Method', 'Income', 'Refunds', 'Net', 'Count'].map((h) => (
                        <Typography key={h} variant="caption" fontWeight={700} color="text.secondary"
                            sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: h !== 'Payment Method' ? 'right' : 'left' }}>
                            {h}
                        </Typography>
                    ))}
                </Box>

                {data.methods.map((m, i) => (
                    <Box key={m.method} sx={{
                        display: 'grid', gridTemplateColumns: '1fr 110px 110px 110px 80px',
                        gap: 1, px: 2, py: 1.25, alignItems: 'center',
                        bgcolor: i % 2 === 0 ? 'white' : '#f8fafc',
                        borderBottom: '1px solid #f1f5f9',
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: methodColors[m.method] || '#64748b' }} />
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{m.method}</Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.78rem', textAlign: 'right', color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
                            {fmt(parseFloat(String(m.income)), currency)}
                        </Typography>
                        <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.78rem', textAlign: 'right', color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                            {fmt(parseFloat(String(m.refunds)), currency)}
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.78rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {fmt(parseFloat(String(m.net)), currency)}
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.78rem', textAlign: 'right' }}>
                            {m.transaction_count}
                        </Typography>
                    </Box>
                ))}
            </Paper>
        </Box>
    );
}
