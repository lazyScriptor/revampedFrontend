import React from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import type { SxProps } from '@mui/material';

interface KPICardProps {
  label: string;
  value: string | number | null;
  subLabel?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  loading?: boolean;
  accentColor?: string;
  sx?: SxProps;
}

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  subLabel,
  icon,
  trend,
  trendValue,
  loading = false,
  accentColor = '#2563eb',
  sx,
}) => {
  const trendColor =
    trend === 'up' ? '#16a34a' : trend === 'down' ? '#dc2626' : '#64748b';

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        p: 2,
        borderLeft: `3px solid ${accentColor}`,
        bgcolor: 'background.paper',
        borderRadius: 1,
        ...sx,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          {label}
        </Typography>
        {icon && (
          <Box sx={{ color: accentColor, opacity: 0.7, display: 'flex' }}>{icon}</Box>
        )}
      </Box>

      {loading ? (
        <Skeleton variant="text" width="60%" height={36} />
      ) : (
        <Typography
          sx={{ fontSize: '1.6rem', fontWeight: 700, color: 'text.primary', lineHeight: 1.2, mt: 0.5 }}
        >
          {value ?? '—'}
        </Typography>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {trendValue && (
          <Typography variant="caption" sx={{ color: trendColor, fontWeight: 600 }}>
            {trendValue}
          </Typography>
        )}
        {subLabel && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {subLabel}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
