import React from 'react';
import {
  Box, Typography, Skeleton, Chip, Link, Stack,
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { useReturnsDueToday } from '@/features/dashboard/hooks/useDashboardHooks';
import type { ReturnItem } from '@/features/dashboard/types';
import dayjs from 'dayjs';

const StatusChip: React.FC<{ days: number }> = ({ days }) => {
  if (days <= 0)
    return <Chip label="Due Today" size="small" sx={{ bgcolor: '#fef9c3', color: '#854d0e', fontWeight: 600, height: 20, fontSize: 10 }} />;
  return <Chip label={`${days}d overdue`} size="small" sx={{ bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 600, height: 20, fontSize: 10 }} />;
};

const ActionableReturnsTable: React.FC = () => {
  const { data, isLoading } = useReturnsDueToday();

  const customerName = (r: ReturnItem) =>
    r.customer_type === 'Business' && r.company_name
      ? r.company_name
      : `${r.first_name} ${r.last_name}`;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', borderRadius: 1, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
          Returns Due
        </Typography>
        {data && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {data.overdueCount > 0 && (
              <Chip label={`${data.overdueCount} overdue`} size="small" sx={{ bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 600, height: 20, fontSize: 10 }} />
            )}
            <Chip label={`${data.total} total`} size="small" sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 600, height: 20, fontSize: 10 }} />
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
              <Typography variant="body2" color="text.secondary">No returns due — all clear.</Typography>
            </Box>
          )
          : data?.items.map((item: ReturnItem) => (
            <Box
              key={item.line_id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 1.5,
                py: 1,
                mb: 0.5,
                borderRadius: 1,
                border: '1px solid',
                borderColor: parseInt(item.days_overdue as unknown as string) > 0 ? '#fecaca' : '#e2e8f0',
                bgcolor: parseInt(item.days_overdue as unknown as string) > 0 ? '#fff5f5' : 'transparent',
                '&:hover': { bgcolor: '#f8fafc' },
              }}
            >
              <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {customerName(item)}
                  </Typography>
                  <StatusChip days={parseInt(item.days_overdue as unknown as string)} />
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                  {item.equipment_name} · qty {item.borrow_quantity}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
                  Expected {dayjs(item.expected_return_date).format('D MMM YYYY')}
                </Typography>
              </Stack>

              <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, ml: 1 }}>
                <Link href={`/invoices?id=${item.invoice_id}`} underline="none">
                  <Box sx={{ display: 'flex', alignItems: 'center', p: 0.75, borderRadius: 1, color: '#2563eb', '&:hover': { bgcolor: '#eff6ff' }, cursor: 'pointer' }}>
                    <ReceiptIcon sx={{ fontSize: 16 }} />
                  </Box>
                </Link>
                <Link href={`tel:${item.phone_number}`} underline="none">
                  <Box sx={{ display: 'flex', alignItems: 'center', p: 0.75, borderRadius: 1, color: '#16a34a', '&:hover': { bgcolor: '#f0fdf4' }, cursor: 'pointer' }}>
                    <PhoneIcon sx={{ fontSize: 16 }} />
                  </Box>
                </Link>
              </Box>
            </Box>
          ))
        }
      </Box>
    </Box>
  );
};

export default ActionableReturnsTable;
