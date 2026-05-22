import React from 'react';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { KPICard } from './KPICard';
import { useDashboardKPIs } from '@/features/dashboard/hooks/useDashboardHooks';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const NetProfitWidget: React.FC = () => {
  const { data, isLoading } = useDashboardKPIs();
  const isPositive = (data?.netProfit ?? 0) >= 0;

  return (
    <KPICard
      label="Net Profit"
      value={data ? fmt(data.netProfit) : null}
      loading={isLoading}
      icon={isPositive ? <TrendingUpIcon /> : <TrendingDownIcon />}
      tone={isPositive ? "accent" : "danger"}
      subLabel="revenue minus expenses"
    />
  );
};

export default NetProfitWidget;
