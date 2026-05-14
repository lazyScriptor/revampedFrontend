import React from 'react';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { KPICard } from './KPICard';
import { useDashboardKPIs } from '@/features/dashboard/hooks/useDashboardHooks';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const RevenueKPIWidget: React.FC = () => {
  const { data, isLoading } = useDashboardKPIs();
  const prev = data?.revenueTrend?.[0]?.revenue ?? 0;
  const curr = data?.revenueTrend?.slice(-1)[0]?.revenue ?? 0;
  const pct = prev > 0 ? (((curr - prev) / prev) * 100).toFixed(1) : null;

  return (
    <KPICard
      label="Total Revenue"
      value={data ? fmt(data.totalRevenue) : null}
      loading={isLoading}
      icon={<AttachMoneyIcon fontSize="small" />}
      accentColor="#2563eb"
      trend={pct ? (parseFloat(pct) >= 0 ? 'up' : 'down') : 'neutral'}
      trendValue={pct ? `${parseFloat(pct) >= 0 ? '▲' : '▼'} ${Math.abs(parseFloat(pct))}%` : undefined}
      subLabel="vs prior day"
    />
  );
};

export default RevenueKPIWidget;
