import React from 'react';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { KPICard } from './KPICard';
import { useDashboardKPIs } from '@/features/dashboard/hooks/useDashboardHooks';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const OutstandingDebtWidget: React.FC = () => {
  const { data, isLoading } = useDashboardKPIs();

  return (
    <KPICard
      label="Outstanding Debt"
      value={data ? fmt(data.outstandingDebt) : null}
      loading={isLoading}
      icon={<WarningAmberIcon />}
      tone="warning"
      subLabel="unpaid invoice balances"
    />
  );
};

export default OutstandingDebtWidget;
