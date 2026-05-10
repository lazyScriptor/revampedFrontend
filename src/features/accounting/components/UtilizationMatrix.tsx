import { Box, Paper, Typography, Skeleton, Chip, LinearProgress } from '@mui/material';

interface UtilizationRow {
    equipment_id: number;
    equipment_name: string;
    serial_number?: string;
    purchase_cost: number;
    total_owned_qty: number;
    available_qty: number;
    rented_qty: number;
    defective_qty: number;
    category_name: string;
    warehouse: string;
    total_revenue: number;
    utilizationPct: number;
    roiPct: number | null;
}

interface Props {
    data?: UtilizationRow[];
    isLoading: boolean;
    currency?: string;
}

const fmt = (v: number, c = 'Rs.') =>
    `${c} ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const getUtilColor = (pct: number) => {
    if (pct >= 70) return '#16a34a';
    if (pct >= 40) return '#eab308';
    return '#dc2626';
};

const getRoiColor = (roi: number | null) => {
    if (roi === null) return '#94a3b8';
    if (roi >= 0) return '#16a34a';
    return '#dc2626';
};

export default function UtilizationMatrix({ data, isLoading, currency = 'Rs.' }: Props) {
    if (isLoading) {
        return (
            <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: 2.5 }}>
                {[...Array(8)].map((_, i) => <Skeleton key={i} variant="text" height={40} sx={{ mb: 0.5 }} />)}
            </Paper>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Paper elevation={0} sx={{ p: 4, border: '1px solid #e2e8f0', borderRadius: 2.5, textAlign: 'center' }}>
                <Typography color="text.secondary">No equipment data for the selected range.</Typography>
            </Paper>
        );
    }

    return (
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2.5, overflow: 'hidden' }}>
            {/* Header */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 90px 90px 100px 150px 80px',
                gap: 1, px: 2, py: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0',
            }}>
                {['Equipment', 'Category', 'Cost', 'Revenue', 'ROI', 'Utilization', 'Status'].map((h) => (
                    <Typography key={h} variant="caption" fontWeight={700} color="text.secondary"
                        sx={{
                            fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                            textAlign: ['Cost', 'Revenue', 'ROI'].includes(h) ? 'right' : 'left',
                        }}>
                        {h}
                    </Typography>
                ))}
            </Box>

            {/* Rows */}
            <Box sx={{ maxHeight: 500, overflowY: 'auto' }}>
                {data.map((row, i) => {
                    const isIdle = row.rented_qty === 0;
                    return (
                        <Box key={row.equipment_id} sx={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 100px 90px 90px 100px 150px 80px',
                            gap: 1, px: 2, py: 1.25, alignItems: 'center',
                            bgcolor: i % 2 === 0 ? 'white' : '#f8fafc',
                            borderBottom: '1px solid #f1f5f9',
                            '&:hover': { bgcolor: '#eff6ff' }, transition: 'background-color 0.15s',
                        }}>
                            <Box>
                                <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.78rem', lineHeight: 1.2 }}>
                                    {row.equipment_name}
                                </Typography>
                                {row.serial_number && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                                        SN: {row.serial_number}
                                    </Typography>
                                )}
                            </Box>

                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                {row.category_name}
                            </Typography>

                            <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.78rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                {fmt(row.purchase_cost, currency)}
                            </Typography>

                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.78rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#16a34a' }}>
                                {fmt(row.total_revenue, currency)}
                            </Typography>

                            <Typography variant="body2" fontWeight={700} sx={{
                                fontSize: '0.78rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                                color: getRoiColor(row.roiPct),
                            }}>
                                {row.roiPct !== null ? `${row.roiPct}%` : 'N/A'}
                            </Typography>

                            {/* Utilization bar */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LinearProgress
                                    variant="determinate"
                                    value={row.utilizationPct}
                                    sx={{
                                        flexGrow: 1, height: 8, borderRadius: 4,
                                        bgcolor: '#f1f5f9',
                                        '& .MuiLinearProgress-bar': {
                                            bgcolor: getUtilColor(row.utilizationPct),
                                            borderRadius: 4,
                                        },
                                    }}
                                />
                                <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.65rem', color: getUtilColor(row.utilizationPct), minWidth: 30 }}>
                                    {row.utilizationPct}%
                                </Typography>
                            </Box>

                            <Chip
                                label={isIdle ? 'Idle' : 'In Use'}
                                size="small"
                                sx={{
                                    fontSize: '0.6rem', fontWeight: 700, height: 20,
                                    bgcolor: isIdle ? '#fef2f2' : '#f0fdf4',
                                    color: isIdle ? '#dc2626' : '#16a34a',
                                    border: `1px solid ${isIdle ? '#fecaca' : '#bbf7d0'}`,
                                }}
                            />
                        </Box>
                    );
                })}
            </Box>
        </Paper>
    );
}
