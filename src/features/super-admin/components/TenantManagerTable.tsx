import { useState } from 'react';
import {
    Box, Paper, Typography, Chip, IconButton, Tooltip, Button,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select,
    FormControl, InputLabel,
} from '@mui/material';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useTenants, useSuspendTenant, useUpdateTenant, useImpersonate } from '../hooks/useSuperAdminHooks';

const statusColors: Record<string, string> = {
    Active: '#10b981',
    Suspended: '#ef4444',
    Overdue: '#f59e0b',
};
const tierColors: Record<string, string> = {
    Basic: '#64748b',
    Pro: '#3b82f6',
    Enterprise: '#8b5cf6',
};

const TenantManagerTable = () => {
    const { data: tenants, isLoading } = useTenants();
    const suspendMutation = useSuspendTenant();
    const updateMutation = useUpdateTenant();
    const impersonateMutation = useImpersonate();

    const [editOpen, setEditOpen] = useState(false);
    const [impersonateOpen, setImpersonateOpen] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<Record<string, unknown> | null>(null);
    const [editForm, setEditForm] = useState({ tier: 'Basic', max_users: 25, subscription_status: 'Active' });
    const [targetUserId, setTargetUserId] = useState('');

    const handleEdit = (tenant: Record<string, unknown>) => {
        setSelectedTenant(tenant);
        setEditForm({
            tier: (tenant.tier as string) || 'Basic',
            max_users: (tenant.max_users as number) || 25,
            subscription_status: (tenant.subscription_status as string) || 'Active',
        });
        setEditOpen(true);
    };

    const handleSaveEdit = () => {
        if (!selectedTenant) return;
        updateMutation.mutate({ tenantId: selectedTenant.tenant_id as string, updates: editForm });
        setEditOpen(false);
    };

    const handleImpersonate = (tenant: Record<string, unknown>) => {
        setSelectedTenant(tenant);
        setTargetUserId('');
        setImpersonateOpen(true);
    };

    const handleExecuteImpersonate = () => {
        if (!selectedTenant || !targetUserId) return;
        impersonateMutation.mutate(
            { tenantId: selectedTenant.tenant_id as string, targetUserId: parseInt(targetUserId) },
            { onSuccess: () => { window.location.href = '/dashboard'; } },
        );
        setImpersonateOpen(false);
    };

    const columns = ['DB Name', 'Status', 'Tier', 'Max Users', 'Users', 'Actions'];

    return (
        <Paper elevation={0} sx={{ border: '1px solid #1e293b', borderRadius: 2, backgroundColor: '#0f172a', overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #1e293b' }}>
                <Typography variant="subtitle2" sx={{ color: '#f1f5f9', fontWeight: 600 }}>Tenant Manager</Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>{tenants?.length || 0} registered tenants</Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 0.5fr 2fr', px: 2, py: 1, borderBottom: '1px solid #1e293b', backgroundColor: 'rgba(30,41,59,0.5)' }}>
                {columns.map((col) => (
                    <Typography key={col} variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{col}</Typography>
                ))}
            </Box>

            {isLoading ? (
                <Box sx={{ p: 4, textAlign: 'center', color: '#64748b' }}>Loading tenants...</Box>
            ) : (
                tenants?.map((tenant: Record<string, unknown>) => (
                    <Box
                        key={tenant.tenant_id as string}
                        sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 0.5fr 2fr', px: 2, py: 1.5, alignItems: 'center', borderBottom: '1px solid #1e293b', '&:hover': { backgroundColor: 'rgba(30,41,59,0.3)' } }}
                    >
                        <Typography variant="body2" sx={{ color: '#e2e8f0', fontSize: '0.8rem', fontFamily: 'monospace' }}>{tenant.db_name as string}</Typography>
                        <Box>
                            <Chip label={tenant.subscription_status as string} size="small" sx={{ backgroundColor: `${statusColors[(tenant.subscription_status as string)] || '#64748b'}20`, color: statusColors[(tenant.subscription_status as string)] || '#64748b', fontSize: '0.65rem', height: 22, fontWeight: 600 }} />
                        </Box>
                        <Box>
                            <Chip label={tenant.tier as string} size="small" variant="outlined" sx={{ borderColor: tierColors[(tenant.tier as string)] || '#64748b', color: tierColors[(tenant.tier as string)] || '#64748b', fontSize: '0.65rem', height: 22 }} />
                        </Box>
                        <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>{tenant.max_users as number}</Typography>
                        <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums' }}>{tenant.userCount as number}</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Impersonate User">
                                <IconButton size="small" onClick={() => handleImpersonate(tenant)} sx={{ color: '#3b82f6', '&:hover': { backgroundColor: 'rgba(59,130,246,0.1)' } }}>
                                    <PersonSearchOutlinedIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Subscription">
                                <IconButton size="small" onClick={() => handleEdit(tenant)} sx={{ color: '#f59e0b', '&:hover': { backgroundColor: 'rgba(245,158,11,0.1)' } }}>
                                    <EditOutlinedIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Suspend Tenant">
                                <IconButton
                                    size="small"
                                    onClick={() => { if (window.confirm(`Suspend "${tenant.db_name}"?`)) suspendMutation.mutate(tenant.tenant_id as string); }}
                                    disabled={(tenant.subscription_status as string) === 'Suspended'}
                                    sx={{ color: '#ef4444', '&:hover': { backgroundColor: 'rgba(239,68,68,0.1)' } }}
                                >
                                    <BlockOutlinedIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                ))
            )}

            <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { backgroundColor: '#1e293b', color: '#f1f5f9' } } }}>
                <DialogTitle sx={{ fontSize: '0.95rem' }}>Edit Tenant: {selectedTenant?.db_name as string}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
                    <FormControl size="small" fullWidth>
                        <InputLabel sx={{ color: '#94a3b8' }}>Status</InputLabel>
                        <Select value={editForm.subscription_status} label="Status" onChange={(e) => setEditForm((f) => ({ ...f, subscription_status: e.target.value }))} sx={{ color: '#f1f5f9', '.MuiOutlinedInput-notchedOutline': { borderColor: '#334155' } }}>
                            <MenuItem value="Active">Active</MenuItem>
                            <MenuItem value="Suspended">Suspended</MenuItem>
                            <MenuItem value="Overdue">Overdue</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" fullWidth>
                        <InputLabel sx={{ color: '#94a3b8' }}>Tier</InputLabel>
                        <Select value={editForm.tier} label="Tier" onChange={(e) => setEditForm((f) => ({ ...f, tier: e.target.value }))} sx={{ color: '#f1f5f9', '.MuiOutlinedInput-notchedOutline': { borderColor: '#334155' } }}>
                            <MenuItem value="Basic">Basic</MenuItem>
                            <MenuItem value="Pro">Pro</MenuItem>
                            <MenuItem value="Enterprise">Enterprise</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField size="small" label="Max Users" type="number" value={editForm.max_users} onChange={(e) => setEditForm((f) => ({ ...f, max_users: parseInt(e.target.value) || 0 }))} sx={{ input: { color: '#f1f5f9' }, label: { color: '#94a3b8' }, '.MuiOutlinedInput-notchedOutline': { borderColor: '#334155' } }} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditOpen(false)} sx={{ color: '#94a3b8' }}>Cancel</Button>
                    <Button onClick={handleSaveEdit} variant="contained" size="small" sx={{ backgroundColor: '#3b82f6' }}>Save</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={impersonateOpen} onClose={() => setImpersonateOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { backgroundColor: '#1e293b', color: '#f1f5f9' } } }}>
                <DialogTitle sx={{ fontSize: '0.95rem' }}>Impersonate User in: {selectedTenant?.db_name as string}</DialogTitle>
                <DialogContent sx={{ pt: '16px !important' }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', mb: 2, display: 'block' }}>Enter the User ID of the tenant user you want to impersonate.</Typography>
                    <TextField size="small" label="Target User ID" type="number" fullWidth value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} sx={{ input: { color: '#f1f5f9' }, label: { color: '#94a3b8' }, '.MuiOutlinedInput-notchedOutline': { borderColor: '#334155' } }} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setImpersonateOpen(false)} sx={{ color: '#94a3b8' }}>Cancel</Button>
                    <Button onClick={handleExecuteImpersonate} variant="contained" size="small" sx={{ backgroundColor: '#ef4444' }}>
                        <PersonSearchOutlinedIcon sx={{ fontSize: 14, mr: 0.5 }} />
                        Impersonate
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default TenantManagerTable;
