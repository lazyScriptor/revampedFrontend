import { Box, Paper, Typography, Skeleton } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

interface DefectCategory {
    category_name: string;
    category_id: number;
    defect_count: number;
    total_defective_units: number;
    total_repaired_units: number;
}

interface MaintenanceData {
    defectsByCategory: DefectCategory[];
    totalRepairCost: number;
    repairExpenseCount: number;
}

interface Props {
    data?: MaintenanceData;
    isLoading: boolean;
    currency?: string;
}

const COLORS = ['#dc2626', '#ea580c', '#eab308', '#16a34a', '#2563eb', '#7c3aed', '#ec4899'];

const fmt = (v: number, c = 'Rs.') =>
    `${c} ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

export default function MaintenanceCostChart({ data, isLoading, currency = 'Rs.' }: Props) {
    if (isLoading) {
        return (
            <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: 2.5 }}>
                <Skeleton variant="text" width={200} height={24} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
            </Paper>
        );
    }

    if (!data || data.defectsByCategory.length === 0) {
        return (
            <Paper elevation={0} sx={{ p: 4, border: '1px solid #e2e8f0', borderRadius: 2.5, textAlign: 'center' }}>
                <Typography color="text.secondary">No defect data for the selected period.</Typography>
            </Paper>
        );
    }

    const chartData = data.defectsByCategory.map((d) => ({
        name: d.category_name,
        defects: parseInt(String(d.defect_count)),
        units: parseInt(String(d.total_defective_units)),
        repaired: parseInt(String(d.total_repaired_units)),
    }));

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Summary cards */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Paper elevation={0} sx={{ px: 2.5, py: 1.5, border: '1px solid #e2e8f0', borderRadius: 2, flex: '1 1 180px' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.6rem', textTransform: 'uppercase' }}>
                        Total Repair Expenses
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="#dc2626">{fmt(data.totalRepairCost, currency)}</Typography>
                    <Typography variant="caption" color="text.secondary">{data.repairExpenseCount} expense records</Typography>
                </Paper>
                <Paper elevation={0} sx={{ px: 2.5, py: 1.5, border: '1px solid #e2e8f0', borderRadius: 2, flex: '1 1 180px' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.6rem', textTransform: 'uppercase' }}>
                        Categories Affected
                    </Typography>
                    <Typography variant="h6" fontWeight={800}>{data.defectsByCategory.length}</Typography>
                </Paper>
            </Box>

            {/* Bar chart */}
            <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
                    Defects by Equipment Category
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <Tooltip
                            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number, name: string) => {
                                const labels: Record<string, string> = { defects: 'Defect Reports', units: 'Total Units', repaired: 'Repaired' };
                                return [value, labels[name] || name];
                            }}
                        />
                        <Bar dataKey="defects" name="defects" radius={[4, 4, 0, 0]}>
                            {chartData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </Paper>
        </Box>
    );
}
