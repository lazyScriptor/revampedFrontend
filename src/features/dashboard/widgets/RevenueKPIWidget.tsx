import React from 'react';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useTranslation } from 'react-i18next';
import { KPICard } from './KPICard';
import { useDashboardKPIs } from '@/features/dashboard/hooks/useDashboardHooks';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const RevenueKPIWidget: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useDashboardKPIs();
  const prev = data?.revenueTrend?.[0]?.revenue ?? 0;
  const curr = data?.revenueTrend?.slice(-1)[0]?.revenue ?? 0;
  const pct = prev > 0 ? (((curr - prev) / prev) * 100).toFixed(1) : null;

  return (
    <KPICard
      label={t("dashboard.widgets.totalRevenue")}
      value={data ? fmt(data.totalRevenue) : null}
      loading={isLoading}
      icon={<AttachMoneyIcon />}
      tone="primary"
      trend={pct ? (parseFloat(pct) >= 0 ? "up" : "down") : "neutral"}
      trendValue={pct ? `${Math.abs(parseFloat(pct))}%` : undefined}
      subLabel={t("dashboard.widgets.vsPriorDay")}
    />
  );
};

export default RevenueKPIWidget;
