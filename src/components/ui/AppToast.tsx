import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Snackbar, Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmberOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

type Severity = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
    title?: string;
    message: string;
    severity?: Severity;
    duration?: number;
}

interface ToastContextValue {
    showToast: (options: ToastOptions | string) => void;
    showSuccess: (message: string, title?: string) => void;
    showError: (message: string, title?: string) => void;
    showWarning: (message: string, title?: string) => void;
    showInfo: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
    return ctx;
};

const severityConfig: Record<Severity, {
    icon: React.ReactNode;
    gradient: string;
    borderColor: string;
    bgColor: string;
    textColor: string;
    defaultTitle: string;
}> = {
    success: {
        icon: <CheckCircleOutlineIcon sx={{ fontSize: 20 }} />,
        gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
        borderColor: '#34d399',
        bgColor: '#ecfdf5',
        textColor: '#065f46',
        defaultTitle: 'Success',
    },
    error: {
        icon: <ErrorOutlineIcon sx={{ fontSize: 20 }} />,
        gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
        borderColor: '#f87171',
        bgColor: '#fef2f2',
        textColor: '#991b1b',
        defaultTitle: 'Error',
    },
    warning: {
        icon: <WarningAmberIcon sx={{ fontSize: 20 }} />,
        gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
        borderColor: '#fbbf24',
        bgColor: '#fffbeb',
        textColor: '#92400e',
        defaultTitle: 'Warning',
    },
    info: {
        icon: <InfoOutlinedIcon sx={{ fontSize: 20 }} />,
        gradient: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
        borderColor: '#60a5fa',
        bgColor: '#eff6ff',
        textColor: '#1e40af',
        defaultTitle: 'Info',
    },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState<ToastOptions>({
        message: '',
        severity: 'info',
        duration: 5000,
    });

    const showToast = useCallback((options: ToastOptions | string) => {
        const opts: ToastOptions =
            typeof options === 'string' ? { message: options, severity: 'info' } : options;
        setCurrent({
            severity: 'info',
            duration: 5000,
            ...opts,
        });
        setOpen(true);
    }, []);

    const showSuccess = useCallback(
        (message: string, title?: string) => showToast({ message, title, severity: 'success' }),
        [showToast],
    );
    const showError = useCallback(
        (message: string, title?: string) => showToast({ message, title, severity: 'error', duration: 7000 }),
        [showToast],
    );
    const showWarning = useCallback(
        (message: string, title?: string) => showToast({ message, title, severity: 'warning' }),
        [showToast],
    );
    const showInfo = useCallback(
        (message: string, title?: string) => showToast({ message, title, severity: 'info' }),
        [showToast],
    );

    const value = useMemo(
        () => ({ showToast, showSuccess, showError, showWarning, showInfo }),
        [showToast, showSuccess, showError, showWarning, showInfo],
    );

    const sev = current.severity || 'info';
    const config = severityConfig[sev];

    return (
        <ToastContext.Provider value={value}>
            {children}
            <Snackbar
                open={open}
                autoHideDuration={current.duration}
                onClose={() => setOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                sx={{
                    '& .MuiSnackbarContent-root': { p: 0 },
                    maxWidth: 420,
                    minWidth: 320,
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1.5,
                        px: 2,
                        py: 1.5,
                        borderRadius: '10px',
                        borderLeft: `4px solid ${config.borderColor}`,
                        backgroundColor: config.bgColor,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
                        minWidth: 320,
                        maxWidth: 420,
                    }}
                >
                    {/* Icon pill */}
                    <Box
                        sx={{
                            mt: 0.25,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 32,
                            height: 32,
                            borderRadius: '8px',
                            background: config.gradient,
                            color: '#fff',
                            flexShrink: 0,
                        }}
                    >
                        {config.icon}
                    </Box>

                    {/* Text */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                            sx={{
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                color: config.textColor,
                                lineHeight: 1.3,
                            }}
                        >
                            {current.title || config.defaultTitle}
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: '0.75rem',
                                color: config.textColor,
                                opacity: 0.85,
                                lineHeight: 1.4,
                                mt: 0.25,
                                wordBreak: 'break-word',
                            }}
                        >
                            {current.message}
                        </Typography>
                    </Box>

                    {/* Close */}
                    <IconButton
                        size="small"
                        onClick={() => setOpen(false)}
                        sx={{
                            color: config.textColor,
                            opacity: 0.5,
                            '&:hover': { opacity: 1 },
                            mt: -0.25,
                        }}
                    >
                        <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Box>
            </Snackbar>
        </ToastContext.Provider>
    );
};
