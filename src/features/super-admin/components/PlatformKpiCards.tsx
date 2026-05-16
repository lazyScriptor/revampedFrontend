import { Box, Paper, Typography } from '@mui/material';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';

interface PlatformKpiCardsProps {
    data: {
        totalTenants: number;
        activeTenants: number;
        suspendedTenants: number;
        totalGlobalUsers: number;
        overdueTenants?: number;
        totalRevenuePaid?: number;
        tierBreakdown: Array<{ tier: string; count: number }>;
    } | null;
    isLoading: boolean;
}

const kpiConfig = [
    {
        key: 'totalTenants',
        label: 'Total Tenants',
        icon: <BusinessOutlinedIcon sx={{ fontSize: 20 }} />,
        color: '#3b82f6',
        bg: 'rgba(59,130,246,0.08)',
    },
    {
        key: 'activeTenants',
        label: 'Active',
        icon: <WorkspacePremiumOutlinedIcon sx={{ fontSize: 20 }} />,
        color: '#10b981',
        bg: 'rgba(16,185,129,0.08)',
    },
    {
        key: 'suspendedTenants',
        label: 'Suspended',
        icon: <BlockOutlinedIcon sx={{ fontSize: 20 }} />,
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.08)',
    },
    {
        key: 'totalGlobalUsers',
        label: 'Total Users',
        icon: <PeopleOutlinedIcon sx={{ fontSize: 20 }} />,
        color: '#8b5cf6',
        bg: 'rgba(139,92,246,0.08)',
    },
];

export default function PlatformKpiCards({ data, isLoading }: PlatformKpiCardsProps) {
    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
            {kpiConfig.map((kpi) => (
                <Paper
                    key={kpi.key}
                    elevation={0}
                    sx={{
                        p: 2.5,
                        border: '1px solid #1e293b',
                        borderRadius: 2,
                        backgroundColor: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                    }}
                >
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: kpi.bg,
                            color: kpi.color,
                        }}
                    >
                        {kpi.icon}
                    </Box>
                    <Box>
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {kpi.label}
                        </Typography>
                        <Typography variant="h5" sx={{ color: '#f1f5f9', fontWeight: 700, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
                            {isLoading ? '—' : data ? (data as Record<string, unknown>)[kpi.key]?.toString() ?? '0' : '0'}
                        </Typography>
                    </Box>
                </Paper>
            ))}
        </Box>
    );
}
