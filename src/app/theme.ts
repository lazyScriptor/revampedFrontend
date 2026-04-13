import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    palette: {
        primary: {
            main: '#2563eb', // Tailwind blue-600
            light: '#3b82f6', // Tailwind blue-500
            dark: '#1d4ed8', // Tailwind blue-700
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#4f46e5', // Tailwind indigo-600
        },
        background: {
            default: '#f8fafc', // Tailwind slate-50 (Dashboard background)
            paper: '#ffffff', // Card backgrounds
        },
        text: {
            primary: '#0f172a', // Tailwind slate-900
            secondary: '#64748b', // Tailwind slate-500
        },
    },
    typography: {
        // Inter is the standard modern SaaS font
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        button: {
            textTransform: 'none', // Disables MUI's default ALL CAPS buttons
            fontWeight: 600,
        },
        h5: {
            fontWeight: 700,
        },
    },
    shape: {
        borderRadius: 8, // Slightly softer, more modern corners (matches Tailwind rounded-lg)
    },
    components: {
        // You can globally override specific MUI component behaviors here
        MuiButton: {
            styleOverrides: {
                root: {
                    boxShadow: 'none', // Modern flat look instead of 2014 material shadow
                    '&:hover': {
                        boxShadow: 'none',
                    },
                },
            },
        },
    },
});