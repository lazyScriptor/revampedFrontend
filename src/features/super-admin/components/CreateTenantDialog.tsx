import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Button, TextField, Typography, CircularProgress,
    MenuItem, Alert, InputAdornment,
} from '@mui/material';
import { useCreateTenant } from '@/features/super-admin/hooks/useSuperAdminHooks';

interface FormValues {
    display_name: string;
    contact_email: string;
    admin_username: string;
    admin_password: string;
    db_name_slug: string;
    tier: string;
    monthly_rate: string;
}

const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30);

const darkField = {
    input: { color: '#f1f5f9' },
    label: { color: '#64748b' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#475569' },
    '& .MuiFormHelperText-root': { color: '#ef4444' },
};

interface Props {
    open: boolean;
    onClose: () => void;
    onCreated: (tenantId: string) => void;
}

export default function CreateTenantDialog({ open, onClose, onCreated }: Props) {
    const { register, handleSubmit, watch, setValue, control, reset, formState: { errors } } = useForm<FormValues>({
        defaultValues: { tier: 'Basic', monthly_rate: '0' },
    });

    const displayName = watch('display_name');

    useEffect(() => {
        if (displayName) {
            setValue('db_name_slug', slugify(displayName), { shouldValidate: false });
        }
    }, [displayName, setValue]);

    const createMutation = useCreateTenant();

    const onSubmit = (values: FormValues) => {
        createMutation.mutate(
            {
                display_name: values.display_name,
                contact_email: values.contact_email,
                admin_username: values.admin_username,
                admin_password: values.admin_password,
                db_name_slug: values.db_name_slug,
                tier: values.tier,
                monthly_rate: parseFloat(values.monthly_rate) || 0,
            },
            {
                onSuccess: (tenant: Record<string, unknown>) => {
                    reset();
                    onCreated(tenant.tenant_id as string);
                },
            },
        );
    };

    const handleClose = () => {
        if (createMutation.isPending) return;
        reset();
        createMutation.reset();
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        bgcolor: '#0f172a',
                        border: '1px solid #1e293b',
                        backgroundImage: 'none',
                    },
                },
            }}
        >
            <DialogTitle sx={{ color: '#f1f5f9', fontWeight: 700, pb: 0.5 }}>
                Create New Tenant
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 400 }}>
                    Provisions a new database, admin user, roles, and permissions automatically.
                </Typography>
            </DialogTitle>

            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                    {createMutation.isError && (
                        <Alert severity="error" sx={{ fontSize: '0.78rem' }}>
                            {createMutation.error instanceof Error
                                ? createMutation.error.message
                                : 'Failed to create tenant'}
                        </Alert>
                    )}

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <TextField
                            label="Display Name"
                            size="small"
                            fullWidth
                            required
                            {...register('display_name', { required: 'Required' })}
                            error={!!errors.display_name}
                            helperText={errors.display_name?.message}
                            sx={darkField}
                        />
                        <TextField
                            label="Contact Email"
                            size="small"
                            fullWidth
                            required
                            type="email"
                            {...register('contact_email', {
                                required: 'Required',
                                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
                            })}
                            error={!!errors.contact_email}
                            helperText={errors.contact_email?.message}
                            sx={darkField}
                        />
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <TextField
                            label="Admin Username"
                            size="small"
                            fullWidth
                            required
                            {...register('admin_username', { required: 'Required' })}
                            error={!!errors.admin_username}
                            helperText={errors.admin_username?.message}
                            sx={darkField}
                        />
                        <TextField
                            label="Admin Password"
                            size="small"
                            fullWidth
                            required
                            type="password"
                            {...register('admin_password', {
                                required: 'Required',
                                minLength: { value: 8, message: 'Min 8 characters' },
                            })}
                            error={!!errors.admin_password}
                            helperText={errors.admin_password?.message}
                            sx={darkField}
                        />
                    </Box>

                    <TextField
                        label="Database Slug"
                        size="small"
                        fullWidth
                        required
                        {...register('db_name_slug', {
                            required: 'Required',
                            pattern: { value: /^[a-z0-9_]+$/, message: 'Only lowercase letters, numbers, underscores' },
                        })}
                        error={!!errors.db_name_slug}
                        helperText={errors.db_name_slug?.message ?? 'Final DB name: geargrid_{slug}_{timestamp}'}
                        sx={darkField}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Typography variant="caption" sx={{ color: '#475569', fontFamily: 'monospace' }}>geargrid_</Typography>
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <Controller
                            name="tier"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    select
                                    label="Tier"
                                    size="small"
                                    fullWidth
                                    sx={darkField}
                                    slotProps={{
                                        select: {
                                            MenuProps: {
                                                slotProps: {
                                                    paper: {
                                                        sx: { bgcolor: '#1e293b', color: '#f1f5f9' },
                                                    },
                                                },
                                            },
                                        },
                                    }}
                                >
                                    {['Basic', 'Pro', 'Enterprise'].map((t) => (
                                        <MenuItem key={t} value={t} sx={{ color: '#f1f5f9' }}>{t}</MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />
                        <TextField
                            label="Monthly Rate"
                            size="small"
                            fullWidth
                            type="number"
                            {...register('monthly_rate')}
                            sx={darkField}
                            slotProps={{
                                input: {
                                    startAdornment: <InputAdornment position="start"><Typography variant="caption" sx={{ color: '#475569' }}>LKR</Typography></InputAdornment>,
                                },
                            }}
                        />
                    </Box>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button
                        onClick={handleClose}
                        disabled={createMutation.isPending}
                        sx={{ color: '#64748b', '&:hover': { bgcolor: 'rgba(100,116,139,0.1)' } }}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={createMutation.isPending}
                        sx={{
                            bgcolor: '#ef4444',
                            fontWeight: 700,
                            '&:hover': { bgcolor: '#dc2626' },
                            minWidth: 130,
                        }}
                    >
                        {createMutation.isPending ? (
                            <CircularProgress size={18} color="inherit" />
                        ) : (
                            'Create Tenant'
                        )}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
}
