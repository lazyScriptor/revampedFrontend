import { createTheme } from '@mui/material/styles';

export const createAppTheme = (primary = '#2563eb', secondary = '#4f46e5') =>
    createTheme({
        palette: {
            // Let MUI auto-derive `light`/`dark` shades from `main` for proper hover/active states
            primary: {
                main: primary,
                contrastText: '#ffffff',
            },
            secondary: {
                main: secondary,
            },
            background: {
                default: '#f8fafc',
                paper: '#ffffff',
            },
            text: {
                primary: '#0f172a',
                secondary: '#64748b',
            },
        },
        typography: {
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            button: {
                textTransform: 'none',
                fontWeight: 600,
            },
            h5: {
                fontWeight: 700,
            },
        },
        shape: {
            borderRadius: 8,
        },
        components: {
            MuiButton: {
                styleOverrides: {
                    root: {
                        boxShadow: 'none',
                        '&:hover': {
                            boxShadow: 'none',
                        },
                    },
                },
            },
        },
    });

export const theme = createAppTheme();
