import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Button, TextField, Typography, CircularProgress,
    MenuItem, Alert, Switch, FormControlLabel,
} from '@mui/material';
import { useCreateTenantUser, useUpdateTenantUser, useTenantRoles } from '@/features/super-admin/hooks/useSuperAdminHooks';

interface FormValues {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    role_id: string;
    is_active: boolean;
}

interface ExistingUser {
    user_id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    role_ids: number[];
}

interface Props {
    open: boolean;
    onClose: () => void;
    tenantId: string;
    editUser?: ExistingUser | null;
}

const darkField = {
    '& .MuiOutlinedInput-root': {
        color: '#f1f5f9',
        '& fieldset': { borderColor: '#334155' },
        '&:hover fieldset': { borderColor: '#475569' },
        '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
    },
    '& .MuiInputLabel-root': { color: '#94a3b8' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#3b82f6' },
    '& .MuiFormHelperText-root': { color: '#ef4444' },
};

export default function TenantUserDialog({ open, onClose, tenantId, editUser }: Props) {
    const isEdit = !!editUser;
    const { data: roles = [] } = useTenantRoles(tenantId);

    const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
        defaultValues: { username: '', email: '', first_name: '', last_name: '', password: '', role_id: '', is_active: true },
    });

    useEffect(() => {
        if (open) {
            if (isEdit && editUser) {
                reset({
                    username: editUser.username,
                    email: editUser.email,
                    first_name: editUser.first_name,
                    last_name: editUser.last_name,
                    password: '',
                    role_id: editUser.role_ids?.[0]?.toString() || '',
                    is_active: editUser.is_active,
                });
            } else {
                reset({ username: '', email: '', first_name: '', last_name: '', password: '', role_id: '', is_active: true });
            }
        }
    }, [open, editUser, isEdit, reset]);

    const createMutation = useCreateTenantUser();
    const updateMutation = useUpdateTenantUser();
    const activeMutation = isEdit ? updateMutation : createMutation;

    const onSubmit = (values: FormValues) => {
        if (isEdit && editUser) {
            const payload: Record<string, unknown> = {
                username: values.username,
                email: values.email,
                first_name: values.first_name,
                last_name: values.last_name,
                is_active: values.is_active,
                role_id: values.role_id ? parseInt(values.role_id) : undefined,
            };
            if (values.password) payload.password = values.password;

            updateMutation.mutate(
                { tenantId, userId: editUser.user_id, data: payload },
                { onSuccess: () => { reset(); onClose(); } },
            );
        } else {
            createMutation.mutate(
                {
                    tenantId,
                    data: {
                        username: values.username,
                        email: values.email,
                        first_name: values.first_name,
                        last_name: values.last_name,
                        password: values.password,
                        role_id: values.role_id ? parseInt(values.role_id) : undefined,
                    },
                },
                { onSuccess: () => { reset(); onClose(); } },
            );
        }
    };

    const handleClose = () => {
        if (activeMutation.isPending) return;
        reset();
        createMutation.reset();
        updateMutation.reset();
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            slotProps={{ paper: { sx: { bgcolor: '#0f172a', border: '1px solid #1e293b', backgroundImage: 'none' } } }}
        >
            <DialogTitle sx={{ color: '#f1f5f9', fontWeight: 700, pb: 0.5 }}>
                {isEdit ? 'Edit User' : 'Create New User'}
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 400 }}>
                    {isEdit ? 'Update account details and role assignment.' : 'Creates a new login account in this tenant.'}
                </Typography>
            </DialogTitle>

            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                    {activeMutation.isError && (
                        <Alert severity="error" sx={{ fontSize: '0.78rem' }}>
                            {activeMutation.error instanceof Error ? activeMutation.error.message : 'Operation failed'}
                        </Alert>
                    )}

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <TextField
                            label="First Name" size="small" required
                            {...register('first_name', { required: 'Required' })}
                            error={!!errors.first_name} helperText={errors.first_name?.message}
                            sx={darkField}
                        />
                        <TextField
                            label="Last Name" size="small" required
                            {...register('last_name', { required: 'Required' })}
                            error={!!errors.last_name} helperText={errors.last_name?.message}
                            sx={darkField}
                        />
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <TextField
                            label="Username" size="small" required
                            {...register('username', { required: 'Required' })}
                            error={!!errors.username} helperText={errors.username?.message}
                            sx={darkField}
                        />
                        <TextField
                            label="Email" size="small" type="email" required
                            {...register('email', {
                                required: 'Required',
                                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
                            })}
                            error={!!errors.email} helperText={errors.email?.message}
                            sx={darkField}
                        />
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <TextField
                            label={isEdit ? 'New Password (leave blank to keep)' : 'Password'}
                            size="small"
                            type="password"
                            {...register('password', isEdit ? {} : { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })}
                            error={!!errors.password} helperText={errors.password?.message}
                            sx={darkField}
                        />
                        <Controller
                            name="role_id"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    select label="Role" size="small" sx={darkField}
                                    slotProps={{
                                        select: {
                                            MenuProps: { slotProps: { paper: { sx: { bgcolor: '#1e293b', color: '#f1f5f9' } } } },
                                        },
                                    }}
                                >
                                    <MenuItem value="" sx={{ color: '#64748b' }}>— No Role —</MenuItem>
                                    {roles.map((r) => (
                                        <MenuItem key={r.role_id} value={r.role_id.toString()} sx={{ color: '#f1f5f9' }}>
                                            {r.role_name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />
                    </Box>

                    {isEdit && (
                        <Controller
                            name="is_active"
                            control={control}
                            render={({ field }) => (
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={field.value}
                                            onChange={(e) => field.onChange(e.target.checked)}
                                            sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#10b981' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#10b981' } }}
                                        />
                                    }
                                    label={<Typography variant="body2" sx={{ color: '#e2e8f0' }}>Account Active</Typography>}
                                />
                            )}
                        />
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button
                        onClick={handleClose}
                        disabled={activeMutation.isPending}
                        sx={{ color: '#64748b', '&:hover': { bgcolor: 'rgba(100,116,139,0.1)' } }}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={activeMutation.isPending}
                        sx={{ bgcolor: '#3b82f6', fontWeight: 700, '&:hover': { bgcolor: '#2563eb' }, minWidth: 120 }}
                    >
                        {activeMutation.isPending ? (
                            <CircularProgress size={18} color="inherit" />
                        ) : isEdit ? 'Save Changes' : 'Create User'}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
}
