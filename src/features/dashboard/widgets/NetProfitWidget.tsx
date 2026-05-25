import React from 'react';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { useTranslation } from 'react-i18next';
import { KPICard } from './KPICard';
import { useDashboardKPIs } from '@/features/dashboard/hooks/useDashboardHooks';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const NetProfitWidget: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useDashboardKPIs();
  const isPositive = (data?.netProfit ?? 0) >= 0;

  return (
    <KPICard
      label={t("dashboard.widgets.netProfit")}
      value={data ? fmt(data.netProfit) : null}
      loading={isLoading}
      icon={isPositive ? <TrendingUpIcon /> : <TrendingDownIcon />}
      tone={isPositive ? "accent" : "danger"}
      subLabel={t("dashboard.widgets.revenueMinusExpenses")}
    />
  );
};

export default NetProfitWidget;
