import { useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { useAuthStore } from '@/stores/useAuthStore';
import { createAppTheme } from '@/app/theme';

export function DynamicThemeProvider({ children }: { children: React.ReactNode }) {
    const configData = useAuthStore((s) => (s.user as any)?.configData);
    const primary = configData?.primary_color ?? '#2563eb';
    const secondary = configData?.secondary_color ?? '#4f46e5';
    const theme = useMemo(() => createAppTheme(primary, secondary), [primary, secondary]);
    return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
