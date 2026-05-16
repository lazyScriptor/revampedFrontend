import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
    Box, Button, Container, TextField, Typography, Paper,
    Alert, CircularProgress, InputAdornment, IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { api } from '@/lib/api';
import { useSuperAdminStore } from '@/stores/useSuperAdminStore';

interface LoginForm {
    email: string;
    password: string;
}

export default function SuperAdminLogin() {
    const navigate = useNavigate();
    const setAuth = useSuperAdminStore((s) => s.setAuth);
    const [showPassword, setShowPassword] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

    const loginMutation = useMutation({
        mutationFn: async (creds: LoginForm) => {
            const res = await api.post('/super-admin/login', creds);
            return res.data;
        },
        onSuccess: (data) => {
            setAuth(data.admin);
            navigate({ to: '/super-admin/dashboard' });
        },
    });

    const onSubmit = (data: LoginForm) => loginMutation.mutate(data);

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#020617',
                backgroundImage:
                    'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59,130,246,0.15), transparent)',
            }}
        >
            <Container maxWidth="xs">
                <Paper
                    elevation={0}
                    sx={{
                        p: 5,
                        borderRadius: 3,
                        border: '1px solid #1e293b',
                        backgroundColor: 'rgba(15,23,42,0.95)',
                        backdropFilter: 'blur(20px)',
                    }}
                >
                    {/* Header */}
                    <Box sx={{ mb: 4, textAlign: 'center' }}>
                        <Box
                            sx={{
                                width: 48,
                                height: 48,
                                mx: 'auto',
                                mb: 2,
                                borderRadius: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.2)',
                            }}
                        >
                            <ShieldOutlinedIcon sx={{ color: '#ef4444', fontSize: 24 }} />
                        </Box>
                        <Typography
                            variant="h5"
                            sx={{ color: '#f1f5f9', fontWeight: 800, letterSpacing: '-0.02em' }}
                        >
                            GearGrid
                            <Box component="span" sx={{ color: '#ef4444' }}>.</Box>
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                            SUPER ADMIN CONSOLE
                        </Typography>
                    </Box>

                    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                        <TextField
                            fullWidth
                            size="small"
                            label="Admin Email"
                            autoComplete="email"
                            autoFocus
                            {...register('email', { required: 'Email required' })}
                            error={!!errors.email}
                            helperText={errors.email?.message}
                            sx={{
                                mb: 2,
                                input: { color: '#f1f5f9' },
                                label: { color: '#64748b' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#475569' },
                            }}
                        />
                        <TextField
                            fullWidth
                            size="small"
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            {...register('password', { required: 'Password required' })}
                            error={!!errors.password}
                            helperText={errors.password?.message}
                            sx={{
                                mb: 2,
                                input: { color: '#f1f5f9' },
                                label: { color: '#64748b' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
                            }}
                            slotProps={{
                                input: {
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: '#64748b' }}>
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />

                        {loginMutation.isError && (
                            <Alert severity="error" sx={{ mb: 2, fontSize: '0.75rem' }}>
                                {loginMutation.error instanceof Error
                                    ? loginMutation.error.message
                                    : 'Invalid credentials'}
                            </Alert>
                        )}

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loginMutation.isPending}
                            sx={{
                                mt: 1,
                                py: 1.2,
                                backgroundColor: '#ef4444',
                                fontWeight: 700,
                                textTransform: 'none',
                                borderRadius: 2,
                                '&:hover': {
                                    backgroundColor: '#dc2626',
                                    boxShadow: '0 0 20px rgba(239,68,68,0.3)',
                                },
                            }}
                        >
                            {loginMutation.isPending ? (
                                <CircularProgress size={20} color="inherit" />
                            ) : (
                                'Access Console'
                            )}
                        </Button>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}
