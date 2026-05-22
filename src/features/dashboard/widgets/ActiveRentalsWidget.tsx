import React from 'react';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { KPICard } from './KPICard';
import { useDashboardKPIs } from '@/features/dashboard/hooks/useDashboardHooks';

const ActiveRentalsWidget: React.FC = () => {
  const { data, isLoading } = useDashboardKPIs();

  return (
    <KPICard
      label="Active Rentals"
      value={data?.activeRentalsCount ?? null}
      loading={isLoading}
      icon={<ReceiptLongIcon />}
      tone="violet"
      subLabel="open invoices"
    />
  );
};

export default ActiveRentalsWidget;
