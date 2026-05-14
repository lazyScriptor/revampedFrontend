import React from 'react';
import { Box, Typography, Skeleton, Chip, Stack } from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { useMaintenanceQueue } from '@/features/dashboard/hooks/useDashboardHooks';
import type { MaintenanceItem } from '@/features/dashboard/types';
import dayjs from 'dayjs';

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  'Pending Assignment': { bg: '#fee2e2', color: '#991b1b', label: 'Unassigned' },
  'In Repair':          { bg: '#fef9c3', color: '#854d0e', label: 'In Repair' },
  'Partially Resolved': { bg: '#e0f2fe', color: '#075985', label: 'Partial' },
};

const MaintenanceQueueWidget: React.FC = () => {
  const { data, isLoading } = useMaintenanceQueue();

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', borderRadius: 1, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BuildIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
            Maintenance Queue
          </Typography>
        </Box>
        {data && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {data.pendingCount > 0 && (
              <Chip label={`${data.pendingCount} unassigned`} size="small" sx={{ bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 600, height: 20, fontSize: 10 }} />
            )}
            <Chip label={`${data.total} open`} size="small" sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 600, height: 20, fontSize: 10 }} />
          </Box>
        )}
      </Box>

      {/* List */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={52} sx={{ borderRadius: 1, mb: 0.5 }} />
            ))
          : data?.items.length === 0
          ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography variant="body2" color="text.secondary">No open defects — all clear.</Typography>
            </Box>
          )
          : data?.items.map((item: MaintenanceItem) => {
            const style = STATUS_STYLES[item.repair_status] ?? STATUS_STYLES['In Repair'];
            const techName = item.tech_first_name
              ? `${item.tech_first_name} ${item.tech_last_name}`
              : null;

            return (
              <Box
                key={item.log_id}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  px: 1.5,
                  py: 1,
                  mb: 0.5,
                  borderRadius: 1,
                  border: '1px solid #e2e8f0',
                  '&:hover': { bgcolor: '#f8fafc' },
                }}
              >
                <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: 12 }}>
                      {item.equipment_name}
                    </Typography>
                    <Chip
                      label={style.label}
                      size="small"
                      sx={{ bgcolor: style.bg, color: style.color, fontWeight: 600, height: 20, fontSize: 10 }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                    {item.category_name} · {item.pending_quantity} unit{item.pending_quantity !== 1 ? 's' : ''} pending
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ScheduleIcon sx={{ fontSize: 10, color: '#94a3b8' }} />
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: 10 }}>
                      {dayjs(item.reported_date).format('D MMM')}
                      {techName ? ` · ${techName}` : ' · Unassigned'}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            );
          })
        }
      </Box>
    </Box>
  );
};

export default MaintenanceQueueWidget;
