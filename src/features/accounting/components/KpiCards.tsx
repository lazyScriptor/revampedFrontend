import { Box, Paper, Typography, Skeleton } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SavingsIcon from '@mui/icons-material/Savings';

interface KpiData {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    outstandingDebt: number;
}

interface KpiCardsProps {
    data?: KpiData;
    isLoading: boolean;
    currency?: string;
}

const fmt = (v: number, currency = 'Rs.') =>
    `${currency} ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const cards = [
    {
        key: 'totalRevenue' as keyof KpiData,
        label: 'Total Revenue',
        icon: <AccountBalanceWalletIcon sx={{ fontSize: 18 }} />,
        color: '#16a34a',
        bgColor: '#f0fdf4',
    },
    {
        key: 'totalExpenses' as keyof KpiData,
        label: 'Total Expenses',
        icon: <ReceiptLongIcon sx={{ fontSize: 18 }} />,
        color: '#dc2626',
        bgColor: '#fef2f2',
    },
    {
        key: 'netProfit' as keyof KpiData,
        label: 'Net Profit',
        icon: <SavingsIcon sx={{ fontSize: 18 }} />,
        color: '#7c3aed',
        bgColor: '#faf5ff',
        dynamic: true,
    },
    {
        key: 'outstandingDebt' as keyof KpiData,
        label: 'Outstanding Debt',
        icon: <WarningAmberIcon sx={{ fontSize: 18 }} />,
        color: '#ea580c',
        bgColor: '#fff7ed',
    },
];

export default function KpiCards({ data, isLoading, currency = 'Rs.' }: KpiCardsProps) {
    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
            {cards.map((card) => {
                const value = data?.[card.key] ?? 0;
                const dynamicColor = card.dynamic ? (value >= 0 ? '#16a34a' : '#dc2626') : card.color;
                const dynamicBg = card.dynamic ? (value >= 0 ? '#f0fdf4' : '#fef2f2') : card.bgColor;

                return (
                    <Paper
                        key={card.key}
                        elevation={0}
                        sx={{
                            p: 2.5,
                            border: '1px solid #e2e8f0',
                            borderRadius: 2.5,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                            transition: 'all 0.2s',
                            '&:hover': { borderColor: dynamicColor, boxShadow: `0 0 0 1px ${dynamicColor}20` },
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>
                                {card.label}
                            </Typography>
                            <Box sx={{
                                width: 32, height: 32, borderRadius: 1.5,
                                bgcolor: dynamicBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: dynamicColor,
                            }}>
                                {card.dynamic ? (value >= 0 ? <TrendingUpIcon sx={{ fontSize: 18 }} /> : <TrendingDownIcon sx={{ fontSize: 18 }} />) : card.icon}
                            </Box>
                        </Box>
                        {isLoading ? (
                            <Skeleton variant="text" width="70%" height={36} />
                        ) : (
                            <Typography variant="h5" fontWeight={800} sx={{ color: dynamicColor, lineHeight: 1.2 }}>
                                {fmt(value, currency)}
                            </Typography>
                        )}
                    </Paper>
                );
            })}
        </Box>
    );
}
