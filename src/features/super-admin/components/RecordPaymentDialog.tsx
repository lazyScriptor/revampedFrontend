import { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, TextField, Button, MenuItem, CircularProgress,
} from '@mui/material';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import { useRecordPayment } from '../hooks/useSuperAdminHooks';

interface Props {
    open: boolean;
    onClose: () => void;
    tenantId: string;
    tenantName: string;
    onSuccess: () => void;
}

const DARK_INPUT_SX = {
    input: { color: '#f1f5f9' },
    textarea: { color: '#f1f5f9' },
    label: { color: '#94a3b8' },
    '.MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#475569' },
    '.MuiSelect-icon': { color: '#94a3b8' },
};

const INITIAL = {
    plan_name: 'Monthly',
    amount: '',
    currency: 'LKR',
    status: 'Paid',
    billing_period_start: '',
    billing_period_end: '',
    method: 'Bank Transfer',
    reference_number: '',
    notes: '',
};

export default function RecordPaymentDialog({ open, onClose, tenantId, tenantName, onSuccess }: Props) {
    const [form, setForm] = useState(INITIAL);
    const mutation = useRecordPayment();

    const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

    const handleSubmit = () => {
        mutation.mutate(
            {
                tenantId,
                data: { ...form, amount: parseFloat(form.amount) || 0 },
            },
            {
                onSuccess: () => {
                    setForm(INITIAL);
                    onSuccess();
                    onClose();
                },
            },
        );
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            slotProps={{ paper: { sx: { backgroundColor: '#1e293b', color: '#f1f5f9', borderRadius: 3 } } }}
        >
            <DialogTitle sx={{ borderBottom: '1px solid #334155', pb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 34, height: 34, borderRadius: 1.5, bgcolor: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <PaymentsOutlinedIcon sx={{ color: '#10b981', fontSize: 18 }} />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 }}>Record Payment</Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>{tenantName}</Typography>
                    </Box>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ pt: '20px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField
                        size="small" label="Plan Name" value={form.plan_name}
                        onChange={(e) => set('plan_name', e.target.value)} sx={DARK_INPUT_SX}
                    />
                    <TextField
                        size="small" label="Amount" type="number" value={form.amount}
                        onChange={(e) => set('amount', e.target.value)} sx={DARK_INPUT_SX}
                    />
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField
                        size="small" select label="Currency" value={form.currency}
                        onChange={(e) => set('currency', e.target.value)} sx={DARK_INPUT_SX}
                    >
                        {['LKR', 'USD', 'EUR'].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </TextField>
                    <TextField
                        size="small" select label="Status" value={form.status}
                        onChange={(e) => set('status', e.target.value)} sx={DARK_INPUT_SX}
                    >
                        {['Paid', 'Pending', 'Overdue', 'Refunded'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </TextField>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField
                        size="small" label="Period Start" type="date" value={form.billing_period_start}
                        onChange={(e) => set('billing_period_start', e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }} sx={DARK_INPUT_SX}
                    />
                    <TextField
                        size="small" label="Period End" type="date" value={form.billing_period_end}
                        onChange={(e) => set('billing_period_end', e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }} sx={DARK_INPUT_SX}
                    />
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField
                        size="small" select label="Method" value={form.method}
                        onChange={(e) => set('method', e.target.value)} sx={DARK_INPUT_SX}
                    >
                        {['Bank Transfer', 'Cash', 'Card', 'Cheque', 'Online'].map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                    </TextField>
                    <TextField
                        size="small" label="Reference No." value={form.reference_number}
                        onChange={(e) => set('reference_number', e.target.value)} sx={DARK_INPUT_SX}
                    />
                </Box>
                <TextField
                    size="small" label="Notes" multiline rows={2} value={form.notes}
                    onChange={(e) => set('notes', e.target.value)} sx={DARK_INPUT_SX}
                />
            </DialogContent>

            <DialogActions sx={{ p: 2.5, borderTop: '1px solid #334155', gap: 1 }}>
                <Button onClick={onClose} disabled={mutation.isPending} sx={{ color: '#94a3b8' }}>Cancel</Button>
                <Button
                    variant="contained" onClick={handleSubmit}
                    disabled={mutation.isPending || !form.amount}
                    sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' }, fontWeight: 700 }}
                >
                    {mutation.isPending ? <CircularProgress size={16} /> : 'Record Payment'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
