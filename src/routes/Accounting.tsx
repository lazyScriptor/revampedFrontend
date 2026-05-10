import { useState } from 'react';
import {
    Box, Typography, Tabs, Tab, Snackbar, Alert, Paper,
    Button, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem,
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

import KpiCards from '@/features/accounting/components/KpiCards';
import RevenueTrendChart from '@/features/accounting/components/RevenueTrendChart';
import ReportBuilder from '@/features/accounting/components/ReportBuilder';
import ProfitLossTable from '@/features/accounting/components/ProfitLossTable';
import AccountsReceivableTable from '@/features/accounting/components/AccountsReceivableTable';
import UtilizationMatrix from '@/features/accounting/components/UtilizationMatrix';
import CashFlowSummary from '@/features/accounting/components/CashFlowSummary';
import MaintenanceCostChart from '@/features/accounting/components/MaintenanceCostChart';

import {
    useDashboardKPIs, useProfitLoss, useAccountsReceivable,
    useEquipmentUtilization, useMaintenanceCosts, useCashFlow, useExpenses,
} from '@/features/accounting/hooks/useReportHooks';
import { useReportStore } from '@/stores/useReportStore';

const EXPENSE_CATEGORIES = ['Operational', 'Repair', 'Asset Purchase', 'Other'];

export default function AccountingRoute() {
    const { activeTab, setActiveTab, startDate, endDate, cashFlowDate } = useReportStore();
    const queryClient = useQueryClient();
    const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' });
    const showToast = (message: string, severity: 'success' | 'error' | 'warning' = 'success') => setToast({ open: true, message, severity });

    // Data hooks — only fetch for active tab
    const dashboard = useDashboardKPIs(startDate, endDate);
    const pnl = useProfitLoss(startDate, endDate, activeTab === 1);
    const ar = useAccountsReceivable(activeTab === 2);
    const utilization = useEquipmentUtilization(startDate, endDate, activeTab === 3);
    const maintenance = useMaintenanceCosts(startDate, endDate, activeTab === 4);
    const cashFlow = useCashFlow(cashFlowDate, activeTab === 4);
    const expenses = useExpenses({ page: 1, limit: 50, startDate, endDate });

    // Expense dialog state
    const [expenseOpen, setExpenseOpen] = useState(false);
    const [expenseForm, setExpenseForm] = useState({ category: 'Operational', amount: '', date: new Date().toISOString().split('T')[0], description: '' });

    const createExpense = useMutation({
        mutationFn: async (data: any) => api.post('/expenses', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['report-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['report-pnl'] });
            setExpenseOpen(false);
            setExpenseForm({ category: 'Operational', amount: '', date: new Date().toISOString().split('T')[0], description: '' });
            showToast('Expense recorded successfully');
        },
        onError: (err: any) => showToast(err.message || 'Failed to create expense', 'error'),
    });

    const deleteExpense = useMutation({
        mutationFn: async (id: number) => api.delete(`/expenses/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['report-dashboard'] });
            showToast('Expense deleted');
        },
    });

    const handleSendReminder = (invoiceId: number) => {
        showToast(`Reminder queued for INV-${invoiceId} (placeholder)`, 'warning');
    };

    const tabConfig = [
        { label: 'Dashboard' },
        { label: 'Profit & Loss' },
        { label: 'Receivables' },
        { label: 'Utilization' },
        { label: 'Operations' },
        { label: 'Expenses' },
    ];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pb: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">Accounting</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Financial reports, receivables, and business intelligence.
                    </Typography>
                </Box>
            </Box>

            {/* Tabs */}
            <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                    bgcolor: 'white', borderRadius: 2, border: '1px solid #e2e8f0',
                    '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.8rem', minHeight: 44, py: 0 },
                    '& .MuiTabs-indicator': { height: 2.5, borderRadius: '2px 2px 0 0' },
                }}
            >
                {tabConfig.map((t, i) => <Tab key={i} label={t.label} />)}
            </Tabs>

            {/* TAB 0: Dashboard */}
            {activeTab === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <KpiCards data={dashboard.data} isLoading={dashboard.isLoading} />
                    <RevenueTrendChart data={dashboard.data?.revenueTrend} isLoading={dashboard.isLoading} />
                </Box>
            )}

            {/* TAB 1: Profit & Loss */}
            {activeTab === 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <ReportBuilder pdfEndpoint="/reports/profit-loss/pdf" excelEndpoint="/reports/profit-loss/excel" reportName="ProfitLoss" />
                    <ProfitLossTable data={pnl.data} isLoading={pnl.isLoading} />
                </Box>
            )}

            {/* TAB 2: Accounts Receivable */}
            {activeTab === 2 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <ReportBuilder
                        showDateRange={false}
                        pdfEndpoint="/reports/accounts-receivable/pdf"
                        excelEndpoint="/reports/accounts-receivable/excel"
                        reportName="AccountsReceivable"
                    />
                    <AccountsReceivableTable data={ar.data} isLoading={ar.isLoading} onSendReminder={handleSendReminder} />
                </Box>
            )}

            {/* TAB 3: Equipment Utilization */}
            {activeTab === 3 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <ReportBuilder excelEndpoint="/reports/equipment-utilization/excel" reportName="Utilization" />
                    <UtilizationMatrix data={utilization.data} isLoading={utilization.isLoading} />
                </Box>
            )}

            {/* TAB 4: Operations (Maintenance + Cash Flow) */}
            {activeTab === 4 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Maintenance Cost Analysis</Typography>
                        <ReportBuilder reportName="MaintenanceCosts" />
                        <Box sx={{ mt: 2 }}>
                            <MaintenanceCostChart data={maintenance.data} isLoading={maintenance.isLoading} />
                        </Box>
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Daily Cash Flow Reconciliation</Typography>
                        <ReportBuilder showDateRange={false} showCashFlowDate reportName="CashFlow" />
                        <Box sx={{ mt: 2 }}>
                            <CashFlowSummary data={cashFlow.data} isLoading={cashFlow.isLoading} />
                        </Box>
                    </Box>
                </Box>
            )}

            {/* TAB 5: Expenses */}
            {activeTab === 5 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <ReportBuilder reportName="Expenses" />
                        <Button
                            variant="contained" size="small" disableElevation
                            startIcon={<AddOutlinedIcon sx={{ fontSize: 16 }} />}
                            onClick={() => setExpenseOpen(true)}
                            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', ml: 2 }}
                        >
                            Add Expense
                        </Button>
                    </Box>

                    {/* Expense table */}
                    <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2.5, overflow: 'hidden' }}>
                        <Box sx={{
                            display: 'grid', gridTemplateColumns: '100px 1fr 110px 100px 1fr 50px',
                            gap: 1, px: 2, py: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0',
                        }}>
                            {['Date', 'Description', 'Amount', 'Category', 'Recorded By', ''].map((h) => (
                                <Typography key={h} variant="caption" fontWeight={700} color="text.secondary"
                                    sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: h === 'Amount' ? 'right' : 'left' }}>
                                    {h}
                                </Typography>
                            ))}
                        </Box>

                        {expenses.isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <Box key={i} sx={{ px: 2, py: 1 }}>
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        {[80, 200, 80, 80, 120].map((w, j) => <Box key={j}><Typography variant="body2"><Box component="span" sx={{ display: 'inline-block', width: w, height: 14, bgcolor: '#f1f5f9', borderRadius: 1 }} /></Typography></Box>)}
                                    </Box>
                                </Box>
                            ))
                        ) : (
                            (expenses.data?.expenses || []).map((exp: any, i: number) => (
                                <Box key={exp.expense_id} sx={{
                                    display: 'grid', gridTemplateColumns: '100px 1fr 110px 100px 1fr 50px',
                                    gap: 1, px: 2, py: 1, alignItems: 'center',
                                    bgcolor: i % 2 === 0 ? 'white' : '#f8fafc',
                                    borderBottom: '1px solid #f1f5f9',
                                    '&:hover': { bgcolor: '#eff6ff' }, transition: 'background-color 0.15s',
                                }}>
                                    <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>
                                        {new Date(exp.date).toLocaleDateString()}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.78rem' }} noWrap>
                                        {exp.description || '—'}
                                    </Typography>
                                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.78rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#dc2626' }}>
                                        Rs. {parseFloat(exp.amount).toLocaleString()}
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                                        {exp.category}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                        {exp.User?.username || '—'}
                                    </Typography>
                                    <Button size="small" color="error" sx={{ minWidth: 0, p: 0.5 }}
                                        onClick={() => deleteExpense.mutate(exp.expense_id)}>
                                        <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                                    </Button>
                                </Box>
                            ))
                        )}

                        {!expenses.isLoading && (expenses.data?.expenses || []).length === 0 && (
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                <Typography color="text.secondary" variant="body2">No expenses recorded for this period.</Typography>
                            </Box>
                        )}
                    </Paper>
                </Box>
            )}

            {/* Add Expense Dialog */}
            <Dialog open={expenseOpen} onClose={() => setExpenseOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle fontWeight="bold">Record New Expense</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
                    <TextField
                        select label="Category" size="small" fullWidth
                        value={expenseForm.category}
                        onChange={(e) => setExpenseForm((p) => ({ ...p, category: e.target.value }))}
                    >
                        {EXPENSE_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </TextField>
                    <TextField
                        label="Amount" size="small" fullWidth type="number"
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))}
                    />
                    <TextField
                        label="Date" size="small" fullWidth type="date"
                        value={expenseForm.date}
                        onChange={(e) => setExpenseForm((p) => ({ ...p, date: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        label="Description" size="small" fullWidth multiline rows={2}
                        value={expenseForm.description}
                        onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 0 }}>
                    <Button onClick={() => setExpenseOpen(false)} color="inherit">Cancel</Button>
                    <Button
                        variant="contained" disableElevation
                        disabled={!expenseForm.amount || createExpense.isPending}
                        onClick={() => createExpense.mutate({
                            category: expenseForm.category,
                            amount: parseFloat(expenseForm.amount),
                            date: expenseForm.date,
                            description: expenseForm.description,
                        })}
                    >
                        {createExpense.isPending ? 'Saving...' : 'Save Expense'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Toast */}
            <Snackbar
                open={toast.open} autoHideDuration={4000}
                onClose={() => setToast((p) => ({ ...p, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert severity={toast.severity} variant="filled" sx={{ width: '100%', fontWeight: 500, boxShadow: 3 }}>
                    {toast.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
