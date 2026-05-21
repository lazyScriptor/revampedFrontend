import { useState, useEffect } from 'react';
import {
    Box, Typography, Chip, Tabs, Tab, TextField, Button, Switch,
    CircularProgress, Tooltip, IconButton, Divider,
    MenuItem, Avatar, Alert,
} from '@mui/material';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import PauseOutlinedIcon from '@mui/icons-material/PauseOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import {
    useTenantDetails, useUpdateTenant, useSuspendTenant, useActivateTenant,
    useMarkTenantOverdue, usePaymentHistory, useTenantUsers, useImpersonate,
    useDeleteTenantUser, useUploadTenantLogo,
} from '../hooks/useSuperAdminHooks';
import RecordPaymentDialog from './RecordPaymentDialog';
import TenantUserDialog from './TenantUserDialog';
import { formatDisplayDate } from '@/lib/dates';

const STATUS_META: Record<string, { color: string; bg: string }> = {
    Active: { color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    Suspended: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
    Overdue: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
};

const DARK_INPUT = {
    '& .MuiOutlinedInput-root': {
        color: '#f1f5f9',
        '& fieldset': { borderColor: '#334155' },
        '&:hover fieldset': { borderColor: '#475569' },
        '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
    },
    '& .MuiInputLabel-root': { color: '#94a3b8' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#3b82f6' },
};

const FEATURE_LABELS: Record<string, { label: string; desc: string }> = {
    continuous_return: { label: 'Continuous Return', desc: 'Allow partial equipment returns on active invoices' },
    accounting_module: { label: 'Accounting Module', desc: 'Enable journal entries and financial reporting' },
    bulk_import: { label: 'Bulk Import', desc: 'Allow CSV import for equipment, customers, and invoices' },
    maintenance_module: { label: 'Maintenance Module', desc: 'Enable equipment defect tracking and repair management' },
};

interface Props {
    tenantId: string;
}

export default function TenantDetailPanel({ tenantId }: Props) {
    const { data, isLoading } = useTenantDetails(tenantId);
    const { data: payments = [] } = usePaymentHistory(tenantId);
    const { data: users = [], isLoading: usersLoading } = useTenantUsers(tenantId);

    const updateMutation = useUpdateTenant();
    const suspendMutation = useSuspendTenant();
    const activateMutation = useActivateTenant();
    const overdueMutation = useMarkTenantOverdue();
    const impersonateMutation = useImpersonate();

    const deleteTenantUser = useDeleteTenantUser();
    const uploadLogo = useUploadTenantLogo();

    const [tab, setTab] = useState(0);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [userDialogOpen, setUserDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [saveOk, setSaveOk] = useState('');

    // --- Form state for each tab ---
    const [infoForm, setInfoForm] = useState({ display_name: '', contact_email: '', contact_phone: '', internal_notes: '' });
    const [configForm, setConfigForm] = useState({
        tier: 'Basic',
        max_users: 25,
        feature_flags: { continuous_return: true, accounting_module: true, bulk_import: true, maintenance_module: true },
        branding: { primaryColor: '#1e40af', secondaryColor: '#0f172a', accentColor: '#3b82f6', logoUrl: '', businessName: '' },
    });
    const [billingForm, setBillingForm] = useState({ monthly_rate: '0', next_billing_date: '' });
    const [corsOrigins, setCorsOrigins] = useState<string[]>([]);
    const [newCorsOrigin, setNewCorsOrigin] = useState('');

    // Defensive parse: backend normalizes JSON columns, but tolerate raw strings just in case
    const parseJson = <T,>(val: unknown, fallback: T): T => {
        if (val == null || val === '') return fallback;
        if (typeof val === 'string') {
            try { return JSON.parse(val) as T; } catch { return fallback; }
        }
        return val as T;
    };

    // Sync from server data
    useEffect(() => {
        if (!data?.tenant) return;
        const t = data.tenant as any;
        setInfoForm({
            display_name: t.display_name || '',
            contact_email: t.contact_email || '',
            contact_phone: t.contact_phone || '',
            internal_notes: t.internal_notes || '',
        });
        setConfigForm({
            tier: t.tier || 'Basic',
            max_users: t.max_users || 25,
            feature_flags: parseJson(t.feature_flags, { continuous_return: true, accounting_module: true, bulk_import: true, maintenance_module: true }),
            branding: parseJson(t.branding, { primaryColor: '#1e40af', secondaryColor: '#0f172a', accentColor: '#3b82f6', logoUrl: '', businessName: '' }),
        });
        setBillingForm({
            monthly_rate: String(t.monthly_rate || '0'),
            next_billing_date: t.next_billing_date || '',
        });
        setCorsOrigins(parseJson<string[]>(t.cors_whitelist, []));
    }, [data]);

    const tenant = data?.tenant as any;

    const handleSave = (updates: Record<string, unknown>, section: string) => {
        updateMutation.mutate({ tenantId, updates }, {
            onSuccess: () => {
                setSaveOk(section);
                setTimeout(() => setSaveOk(''), 3000);
            },
        });
    };

    const handleImpersonate = (userId: number) => {
        impersonateMutation.mutate({ tenantId, targetUserId: userId }, {
            onSuccess: () => { window.location.href = '/dashboard'; },
        });
    };

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <CircularProgress sx={{ color: '#3b82f6' }} />
            </Box>
        );
    }

    if (!tenant) return null;

    const statusMeta = STATUS_META[tenant.subscription_status] || STATUS_META.Active;
    const tenantName = tenant.display_name || tenant.db_name;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Header */}
            <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid #1e293b', bgcolor: '#0f172a', flexShrink: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box>
                        <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 800, lineHeight: 1.2 }}>
                            {tenantName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace' }}>
                            {tenant.db_name}
                        </Typography>
                    </Box>
                    <Chip
                        label={tenant.subscription_status}
                        size="small"
                        sx={{ bgcolor: statusMeta.bg, color: statusMeta.color, fontWeight: 700, fontSize: '0.72rem', height: 24 }}
                    />
                </Box>
                {/* Quick actions */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Tooltip title="Activate tenant">
                        <span>
                            <Button
                                size="small"
                                variant={tenant.subscription_status === 'Active' ? 'contained' : 'outlined'}
                                startIcon={<PlayArrowOutlinedIcon />}
                                disabled={tenant.subscription_status === 'Active' || activateMutation.isPending}
                                onClick={() => activateMutation.mutate(tenantId)}
                                sx={{
                                    borderColor: '#10b981', color: tenant.subscription_status === 'Active' ? '#fff' : '#10b981',
                                    bgcolor: tenant.subscription_status === 'Active' ? '#10b981' : 'transparent',
                                    '&:hover': { bgcolor: '#059669', borderColor: '#059669', color: '#fff' },
                                    fontSize: '0.72rem', fontWeight: 700, height: 28,
                                }}
                            >
                                Activate
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip title="Suspend tenant — blocks all logins">
                        <span>
                            <Button
                                size="small"
                                variant={tenant.subscription_status === 'Suspended' ? 'contained' : 'outlined'}
                                startIcon={<PauseOutlinedIcon />}
                                disabled={tenant.subscription_status === 'Suspended' || suspendMutation.isPending}
                                onClick={() => { if (confirm(`Suspend "${tenantName}"?`)) suspendMutation.mutate(tenantId); }}
                                sx={{
                                    borderColor: '#ef4444', color: tenant.subscription_status === 'Suspended' ? '#fff' : '#ef4444',
                                    bgcolor: tenant.subscription_status === 'Suspended' ? '#ef4444' : 'transparent',
                                    '&:hover': { bgcolor: '#dc2626', borderColor: '#dc2626', color: '#fff' },
                                    fontSize: '0.72rem', fontWeight: 700, height: 28,
                                }}
                            >
                                Suspend
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip title="Mark as overdue — blocks logins until payment">
                        <span>
                            <Button
                                size="small"
                                variant={tenant.subscription_status === 'Overdue' ? 'contained' : 'outlined'}
                                startIcon={<WarningAmberOutlinedIcon />}
                                disabled={tenant.subscription_status === 'Overdue' || overdueMutation.isPending}
                                onClick={() => overdueMutation.mutate(tenantId)}
                                sx={{
                                    borderColor: '#f59e0b', color: tenant.subscription_status === 'Overdue' ? '#fff' : '#f59e0b',
                                    bgcolor: tenant.subscription_status === 'Overdue' ? '#f59e0b' : 'transparent',
                                    '&:hover': { bgcolor: '#d97706', borderColor: '#d97706', color: '#fff' },
                                    fontSize: '0.72rem', fontWeight: 700, height: 28,
                                }}
                            >
                                Mark Overdue
                            </Button>
                        </span>
                    </Tooltip>
                </Box>
            </Box>

            {/* Tabs */}
            <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{
                    flexShrink: 0,
                    borderBottom: '1px solid #1e293b',
                    bgcolor: '#0f172a',
                    '& .MuiTab-root': { color: '#64748b', textTransform: 'none', fontSize: '0.78rem', fontWeight: 600, minHeight: 40, px: 2 },
                    '& .Mui-selected': { color: '#f1f5f9 !important' },
                    '& .MuiTabs-indicator': { bgcolor: '#ef4444', height: 2 },
                }}
            >
                <Tab label="Info" />
                <Tab label="Configuration" />
                <Tab label="Billing" />
                <Tab label="CORS" />
                <Tab label="Users" />
            </Tabs>

            {/* Tab Content */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 3, bgcolor: '#020617' }}>

                {/* ── TAB 0: INFO ─────────────────────────────────── */}
                {tab === 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        {saveOk === 'info' && <Alert severity="success" sx={{ bgcolor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 2 }}>Saved successfully.</Alert>}
                        <Typography variant="overline" sx={{ color: '#64748b', fontSize: '0.65rem', letterSpacing: '0.1em' }}>Identity & Contact</Typography>
                        <TextField size="small" label="Display Name" value={infoForm.display_name} onChange={(e) => setInfoForm(f => ({ ...f, display_name: e.target.value }))} sx={DARK_INPUT} />
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField size="small" label="Contact Email" value={infoForm.contact_email} onChange={(e) => setInfoForm(f => ({ ...f, contact_email: e.target.value }))} sx={DARK_INPUT} />
                            <TextField size="small" label="Contact Phone" value={infoForm.contact_phone} onChange={(e) => setInfoForm(f => ({ ...f, contact_phone: e.target.value }))} sx={DARK_INPUT} />
                        </Box>
                        <Divider sx={{ borderColor: '#1e293b' }} />
                        <Typography variant="overline" sx={{ color: '#64748b', fontSize: '0.65rem', letterSpacing: '0.1em' }}>Internal Notes</Typography>
                        <TextField
                            multiline rows={4} label="Notes (internal only)" value={infoForm.internal_notes}
                            onChange={(e) => setInfoForm(f => ({ ...f, internal_notes: e.target.value }))}
                            sx={DARK_INPUT}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button variant="contained" startIcon={<SaveOutlinedIcon />}
                                onClick={() => handleSave(infoForm, 'info')}
                                disabled={updateMutation.isPending}
                                sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' }, fontWeight: 700 }}>
                                Save Info
                            </Button>
                        </Box>
                    </Box>
                )}

                {/* ── TAB 1: CONFIGURATION ─────────────────────────── */}
                {tab === 1 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        {saveOk === 'config' && <Alert severity="success" sx={{ bgcolor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 2 }}>Saved successfully.</Alert>}

                        <Typography variant="overline" sx={{ color: '#64748b', fontSize: '0.65rem', letterSpacing: '0.1em' }}>Subscription Tier</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField size="small" select label="Tier" value={configForm.tier}
                                onChange={(e) => setConfigForm(f => ({ ...f, tier: e.target.value }))} sx={DARK_INPUT}>
                                {[
                                    { value: 'Basic', color: '#64748b' },
                                    { value: 'Pro', color: '#3b82f6' },
                                    { value: 'Enterprise', color: '#8b5cf6' },
                                ].map(({ value, color }) => (
                                    <MenuItem key={value} value={value} sx={{ color }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                                            {value}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField size="small" type="number" label="Max Users" value={configForm.max_users}
                                onChange={(e) => setConfigForm(f => ({ ...f, max_users: parseInt(e.target.value) || 1 }))} sx={DARK_INPUT} />
                        </Box>

                        <Divider sx={{ borderColor: '#1e293b' }} />
                        <Typography variant="overline" sx={{ color: '#64748b', fontSize: '0.65rem', letterSpacing: '0.1em' }}>Feature Flags</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {Object.entries(FEATURE_LABELS).map(([key, { label, desc }]) => (
                                <Box key={key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, bgcolor: '#0f172a', borderRadius: 1.5, border: '1px solid #1e293b' }}>
                                    <Box>
                                        <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.82rem' }}>{label}</Typography>
                                        <Typography variant="caption" sx={{ color: '#475569' }}>{desc}</Typography>
                                    </Box>
                                    <Switch
                                        checked={!!(configForm.feature_flags as any)[key]}
                                        onChange={(e) => setConfigForm(f => ({ ...f, feature_flags: { ...f.feature_flags, [key]: e.target.checked } }))}
                                        size="small"
                                        sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#10b981' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#10b981' } }}
                                    />
                                </Box>
                            ))}
                        </Box>

                        <Divider sx={{ borderColor: '#1e293b' }} />
                        <Typography variant="overline" sx={{ color: '#64748b', fontSize: '0.65rem', letterSpacing: '0.1em' }}>Branding</Typography>
                        <TextField size="small" label="Business Name" value={(configForm.branding as any).businessName || ''}
                            onChange={(e) => setConfigForm(f => ({ ...f, branding: { ...f.branding, businessName: e.target.value } }))} sx={DARK_INPUT} />

                        {/* Logo upload */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: '#0f172a', borderRadius: 1.5, border: '1px solid #1e293b' }}>
                            <Box
                                sx={{
                                    width: 64, height: 64, borderRadius: 1.5, flexShrink: 0,
                                    bgcolor: '#1e293b', border: '1px solid #334155',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    overflow: 'hidden',
                                }}
                            >
                                {(configForm.branding as any).logoUrl ? (
                                    <Box
                                        component="img"
                                        src={(configForm.branding as any).logoUrl.startsWith('http') || (configForm.branding as any).logoUrl.startsWith('data:')
                                            ? (configForm.branding as any).logoUrl
                                            : `${import.meta.env.VITE_API_URL?.replace(/\/api$/, '')}${(configForm.branding as any).logoUrl}`}
                                        alt="Logo"
                                        sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                    />
                                ) : (
                                    <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.65rem' }}>No logo</Typography>
                                )}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.82rem' }}>Tenant Logo</Typography>
                                <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace', wordBreak: 'break-all', display: 'block', mt: 0.25 }}>
                                    {(configForm.branding as any).logoUrl || 'PNG, JPG, SVG · max 5MB'}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                                <Button
                                    size="small"
                                    component="label"
                                    variant="outlined"
                                    disabled={uploadLogo.isPending}
                                    sx={{ borderColor: '#3b82f6', color: '#3b82f6', '&:hover': { bgcolor: 'rgba(59,130,246,0.1)' }, fontSize: '0.72rem', fontWeight: 700 }}
                                >
                                    {uploadLogo.isPending ? <CircularProgress size={14} color="inherit" /> : 'Upload'}
                                    <input
                                        type="file"
                                        hidden
                                        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            uploadLogo.mutate({ tenantId, file }, {
                                                onSuccess: (resp) => {
                                                    setConfigForm(f => ({ ...f, branding: { ...f.branding, logoUrl: resp.logoUrl } }));
                                                    setSaveOk('config');
                                                    setTimeout(() => setSaveOk(''), 3000);
                                                },
                                            });
                                            e.target.value = '';
                                        }}
                                    />
                                </Button>
                                {(configForm.branding as any).logoUrl && (
                                    <Button
                                        size="small"
                                        onClick={() => setConfigForm(f => ({ ...f, branding: { ...f.branding, logoUrl: '' } }))}
                                        sx={{ color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' }, fontSize: '0.72rem', fontWeight: 700, minWidth: 'auto', px: 1 }}
                                    >
                                        Clear
                                    </Button>
                                )}
                            </Box>
                        </Box>
                        {uploadLogo.isError && (
                            <Alert severity="error" sx={{ fontSize: '0.78rem' }}>
                                {uploadLogo.error instanceof Error ? uploadLogo.error.message : 'Logo upload failed'}
                            </Alert>
                        )}
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                            {(['primaryColor', 'secondaryColor', 'accentColor'] as const).map((key) => (
                                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box
                                        component="input"
                                        type="color"
                                        value={(configForm.branding as any)[key] || '#000000'}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            setConfigForm(f => ({ ...f, branding: { ...f.branding, [key]: e.target.value } }))
                                        }
                                        sx={{ width: 36, height: 36, border: '2px solid #334155', borderRadius: 1, cursor: 'pointer', bgcolor: 'transparent', p: 0 }}
                                    />
                                    <Box>
                                        <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', lineHeight: 1 }}>
                                            {key.replace('Color', '').replace(/([A-Z])/g, ' $1').trim()}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace' }}>
                                            {(configForm.branding as any)[key]}
                                        </Typography>
                                    </Box>
                                </Box>
                            ))}
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button variant="contained" startIcon={<SaveOutlinedIcon />}
                                onClick={() => handleSave({ tier: configForm.tier, max_users: configForm.max_users, feature_flags: configForm.feature_flags, branding: configForm.branding }, 'config')}
                                disabled={updateMutation.isPending}
                                sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' }, fontWeight: 700 }}>
                                Save Configuration
                            </Button>
                        </Box>
                    </Box>
                )}

                {/* ── TAB 2: BILLING ─────────────────────────────── */}
                {tab === 2 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        {saveOk === 'billing' && <Alert severity="success" sx={{ bgcolor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 2 }}>Saved successfully.</Alert>}

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField size="small" type="number" label="Monthly Rate (LKR)" value={billingForm.monthly_rate}
                                onChange={(e) => setBillingForm(f => ({ ...f, monthly_rate: e.target.value }))} sx={DARK_INPUT} />
                            <TextField size="small" type="date" label="Next Billing Date" value={billingForm.next_billing_date}
                                onChange={(e) => setBillingForm(f => ({ ...f, next_billing_date: e.target.value }))}
                                slotProps={{ inputLabel: { shrink: true } }} sx={DARK_INPUT} />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Button variant="outlined" startIcon={<PaymentsOutlinedIcon />}
                                onClick={() => setPaymentDialogOpen(true)}
                                sx={{ borderColor: '#10b981', color: '#10b981', '&:hover': { bgcolor: 'rgba(16,185,129,0.1)' }, fontWeight: 700 }}>
                                Record Payment
                            </Button>
                            <Button variant="contained" startIcon={<SaveOutlinedIcon />}
                                onClick={() => handleSave({ monthly_rate: parseFloat(billingForm.monthly_rate) || 0, next_billing_date: billingForm.next_billing_date || null }, 'billing')}
                                disabled={updateMutation.isPending}
                                sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' }, fontWeight: 700 }}>
                                Save Billing
                            </Button>
                        </Box>

                        <Divider sx={{ borderColor: '#1e293b' }} />
                        <Typography variant="overline" sx={{ color: '#64748b', fontSize: '0.65rem', letterSpacing: '0.1em' }}>
                            Payment History ({(payments as any[]).length})
                        </Typography>

                        {(payments as any[]).length === 0 ? (
                            <Typography variant="body2" sx={{ color: '#475569', textAlign: 'center', py: 3 }}>No payment records.</Typography>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {(payments as any[]).map((p: any) => {
                                    const pMeta = { Paid: { color: '#10b981', bg: 'rgba(16,185,129,0.12)' }, Pending: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }, Overdue: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }, Refunded: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' } }[p.status as string] || { color: '#94a3b8', bg: '#1e293b' };
                                    return (
                                        <Box key={p.sub_id} sx={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', alignItems: 'center', px: 2, py: 1.5, bgcolor: '#0f172a', borderRadius: 1.5, border: '1px solid #1e293b', gap: 1 }}>
                                            <Box>
                                                <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.82rem' }}>{p.plan_name}</Typography>
                                                <Typography variant="caption" sx={{ color: '#475569' }}>{formatDisplayDate(p.createdAt)}</Typography>
                                            </Box>
                                            <Typography variant="body2" sx={{ color: '#f1f5f9', fontWeight: 700 }}>
                                                {p.currency} {Number(p.amount).toLocaleString()}
                                            </Typography>
                                            <Chip label={p.status} size="small" sx={{ bgcolor: pMeta.bg, color: pMeta.color, fontWeight: 700, fontSize: '0.65rem', height: 20, width: 'fit-content' }} />
                                            <Typography variant="caption" sx={{ color: '#475569', fontFamily: 'monospace' }}>{p.reference_number || p.method || '—'}</Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                        )}
                    </Box>
                )}

                {/* ── TAB 3: CORS ──────────────────────────────────── */}
                {tab === 3 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {saveOk === 'cors' && <Alert severity="success" sx={{ bgcolor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 2 }}>Saved successfully.</Alert>}
                        <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.8rem' }}>
                            Tenant-specific CORS origins stored in the tenant record. For the active server whitelist, use the global CORS manager.
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {corsOrigins.length === 0 ? (
                                <Typography variant="body2" sx={{ color: '#475569', textAlign: 'center', py: 2 }}>No origins added.</Typography>
                            ) : (
                                corsOrigins.map((o) => (
                                    <Box key={o} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25, bgcolor: '#0f172a', borderRadius: 1.5, border: '1px solid #1e293b' }}>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#93c5fd', fontSize: '0.82rem' }}>{o}</Typography>
                                        <IconButton size="small" onClick={() => setCorsOrigins(prev => prev.filter(x => x !== o))}
                                            sx={{ color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' }, width: 24, height: 24 }}>
                                            <DeleteOutlinedIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                    </Box>
                                ))
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField size="small" fullWidth placeholder="https://app.example.com"
                                value={newCorsOrigin} onChange={(e) => setNewCorsOrigin(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && newCorsOrigin.trim()) { setCorsOrigins(p => [...p, newCorsOrigin.trim()]); setNewCorsOrigin(''); } }}
                                sx={DARK_INPUT} />
                            <Button variant="outlined" startIcon={<AddIcon />}
                                disabled={!newCorsOrigin.trim()}
                                onClick={() => { if (newCorsOrigin.trim()) { setCorsOrigins(p => [...p, newCorsOrigin.trim()]); setNewCorsOrigin(''); } }}
                                sx={{ borderColor: '#334155', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                Add
                            </Button>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button variant="contained" startIcon={<SaveOutlinedIcon />}
                                onClick={() => handleSave({ cors_whitelist: corsOrigins }, 'cors')}
                                disabled={updateMutation.isPending}
                                sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' }, fontWeight: 700 }}>
                                Save
                            </Button>
                        </Box>
                    </Box>
                )}

                {/* ── TAB 4: USERS ─────────────────────────────────── */}
                {tab === 4 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {/* Header row */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="overline" sx={{ color: '#64748b', fontSize: '0.65rem', letterSpacing: '0.1em' }}>
                                Tenant Users ({(users as any[]).length})
                            </Typography>
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => { setEditingUser(null); setUserDialogOpen(true); }}
                                sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' }, fontWeight: 700, fontSize: '0.72rem', height: 28 }}
                            >
                                New User
                            </Button>
                        </Box>

                        {usersLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={20} sx={{ color: '#3b82f6' }} /></Box>
                        ) : (users as any[]).length === 0 ? (
                            <Typography variant="body2" sx={{ color: '#475569', textAlign: 'center', py: 4 }}>No users in this tenant database.</Typography>
                        ) : (
                            (users as any[]).map((u) => (
                                <Box key={u.user_id} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5, bgcolor: '#0f172a', borderRadius: 1.5, border: '1px solid #1e293b' }}>
                                    <Avatar sx={{ width: 32, height: 32, bgcolor: '#1e293b', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                                        {u.username?.charAt(0)?.toUpperCase()}
                                    </Avatar>
                                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                        <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.82rem' }} noWrap>
                                            {u.first_name || u.last_name ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() : u.username}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.7rem' }} noWrap>
                                            @{u.username} · {u.email}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 140, justifyContent: 'flex-end' }}>
                                        {u.roles.map((r: string) => (
                                            <Chip key={r} label={r} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 600 }} />
                                        ))}
                                    </Box>
                                    <Chip
                                        label={u.status}
                                        size="small"
                                        sx={{ height: 20, fontSize: '0.62rem', bgcolor: u.status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: u.status === 'Active' ? '#10b981' : '#ef4444', fontWeight: 600 }}
                                    />
                                    <Tooltip title={`Impersonate ${u.username} (15 min session)`}>
                                        <IconButton
                                            size="small"
                                            onClick={() => { if (confirm(`Impersonate "${u.username}"? This grants a 15-minute session.`)) handleImpersonate(u.user_id); }}
                                            disabled={impersonateMutation.isPending}
                                            sx={{ color: '#3b82f6', '&:hover': { bgcolor: 'rgba(59,130,246,0.1)' }, width: 28, height: 28 }}
                                        >
                                            <PersonSearchOutlinedIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Edit user">
                                        <IconButton
                                            size="small"
                                            onClick={() => { setEditingUser(u); setUserDialogOpen(true); }}
                                            sx={{ color: '#94a3b8', '&:hover': { bgcolor: 'rgba(148,163,184,0.1)', color: '#f1f5f9' }, width: 28, height: 28 }}
                                        >
                                            <EditOutlinedIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete user">
                                        <IconButton
                                            size="small"
                                            disabled={deleteTenantUser.isPending}
                                            onClick={() => {
                                                if (confirm(`Delete user "${u.username}"? This also removes their global login.`)) {
                                                    deleteTenantUser.mutate({ tenantId, userId: u.user_id });
                                                }
                                            }}
                                            sx={{ color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' }, width: 28, height: 28 }}
                                        >
                                            <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            ))
                        )}
                    </Box>
                )}
            </Box>

            {/* Payment Dialog */}
            <RecordPaymentDialog
                open={paymentDialogOpen}
                onClose={() => setPaymentDialogOpen(false)}
                tenantId={tenantId}
                tenantName={tenantName}
                onSuccess={() => {}}
            />

            {/* User CRUD Dialog */}
            <TenantUserDialog
                open={userDialogOpen}
                onClose={() => { setUserDialogOpen(false); setEditingUser(null); }}
                tenantId={tenantId}
                editUser={editingUser}
            />
        </Box>
    );
}
