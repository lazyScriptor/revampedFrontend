import { Box, Paper, Typography, Chip, Skeleton, IconButton, Tooltip } from '@mui/material';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';

interface ARRow {
    invoice_id: number;
    total_amount: number;
    advance_paid: number;
    total_paid: number;
    outstanding: number;
    days_overdue: number;
    customer_id: number;
    first_name: string;
    last_name: string;
    company_name: string;
    customer_type: string;
    phone_number: string;
}

interface Bucket {
    label: string;
    rows: ARRow[];
    total: number;
}

interface ARData {
    buckets: { current: Bucket; thirtyToSixty: Bucket; sixtyToNinety: Bucket; overNinety: Bucket };
    grandTotal: number;
    totalInvoices: number;
    allRows: ARRow[];
}

interface Props {
    data?: ARData;
    isLoading: boolean;
    currency?: string;
    onSendReminder?: (invoiceId: number) => void;
}

const fmt = (v: number, c = 'Rs.') =>
    `${c} ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getBadgeColor = (days: number): 'success' | 'warning' | 'error' | 'default' => {
    if (days <= 30) return 'success';
    if (days <= 60) return 'warning';
    return 'error';
};

export default function AccountsReceivableTable({ data, isLoading, currency = 'Rs.', onSendReminder }: Props) {
    if (isLoading) {
        return (
            <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: 2.5 }}>
                {[...Array(6)].map((_, i) => <Skeleton key={i} variant="text" height={36} sx={{ mb: 0.5 }} />)}
            </Paper>
        );
    }

    if (!data || data.totalInvoices === 0) {
        return (
            <Paper elevation={0} sx={{ p: 4, border: '1px solid #e2e8f0', borderRadius: 2.5, textAlign: 'center' }}>
                <Typography color="text.secondary">No outstanding receivables 🎉</Typography>
            </Paper>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Summary bar */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {Object.values(data.buckets).map((bucket) => (
                    <Paper key={bucket.label} elevation={0} sx={{
                        px: 2, py: 1.5, border: '1px solid #e2e8f0', borderRadius: 2, flex: '1 1 120px', minWidth: 120,
                    }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.6rem', textTransform: 'uppercase' }}>
                            {bucket.label}
                        </Typography>
                        <Typography variant="subtitle2" fontWeight={800} color={bucket.rows.length > 0 ? '#dc2626' : 'text.secondary'}>
                            {fmt(bucket.total, currency)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{bucket.rows.length} invoices</Typography>
                    </Paper>
                ))}
            </Box>

            {/* Table */}
            <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2.5, overflow: 'hidden' }}>
                {/* Header */}
                <Box sx={{
                    display: 'grid', gridTemplateColumns: '80px 1fr 100px 100px 110px 80px 50px',
                    gap: 1, px: 2, py: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0',
                }}>
                    {['Invoice', 'Customer', 'Total', 'Paid', 'Outstanding', 'Age', ''].map((h) => (
                        <Typography key={h} variant="caption" fontWeight={700} color="text.secondary"
                            sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: h === 'Total' || h === 'Paid' || h === 'Outstanding' ? 'right' : 'left' }}>
                            {h}
                        </Typography>
                    ))}
                </Box>

                {/* Rows */}
                {data.allRows.map((row, i) => (
                    <Box key={row.invoice_id} sx={{
                        display: 'grid', gridTemplateColumns: '80px 1fr 100px 100px 110px 80px 50px',
                        gap: 1, px: 2, py: 1, alignItems: 'center',
                        bgcolor: i % 2 === 0 ? 'white' : '#f8fafc',
                        borderBottom: '1px solid #f1f5f9',
                        '&:hover': { bgcolor: '#eff6ff' }, transition: 'background-color 0.15s',
                    }}>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.78rem' }}>
                            INV-{row.invoice_id}
                        </Typography>
                        <Box>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.78rem', lineHeight: 1.2 }}>
                                {row.customer_type === 'Business' ? row.company_name : `${row.first_name} ${row.last_name}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                {row.phone_number}
                            </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.78rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {fmt(row.total_amount, currency)}
                        </Typography>
                        <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.78rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#16a34a' }}>
                            {fmt(row.total_paid, currency)}
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.78rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#dc2626' }}>
                            {fmt(row.outstanding, currency)}
                        </Typography>
                        <Chip
                            label={`${row.days_overdue}d`}
                            color={getBadgeColor(row.days_overdue)}
                            size="small"
                            sx={{ fontSize: '0.65rem', fontWeight: 700, height: 22 }}
                        />
                        <Tooltip title="Send Reminder" arrow>
                            <IconButton size="small" onClick={() => onSendReminder?.(row.invoice_id)}
                                sx={{ color: '#64748b', '&:hover': { color: '#2563eb' } }}>
                                <NotificationsActiveOutlinedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                ))}

                {/* Grand Total */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1.5, bgcolor: '#fef2f2', borderTop: '2px solid #dc2626' }}>
                    <Typography variant="subtitle2" fontWeight={800}>Grand Total Outstanding</Typography>
                    <Typography variant="subtitle2" fontWeight={800} color="#dc2626">{fmt(data.grandTotal, currency)}</Typography>
                </Box>
            </Paper>
        </Box>
    );
}
