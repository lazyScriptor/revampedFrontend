import { useDashboardMoney } from '@/features/accounting/utils/currency';
import React from 'react';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useTranslation } from 'react-i18next';
import { KPICard } from './KPICard';
import { useDashboardKPIs } from '@/features/dashboard/hooks/useDashboardHooks';

const OutstandingDebtWidget: React.FC = () => {
  const { full: fmt } = useDashboardMoney();
  const { t } = useTranslation();
  const { data, isLoading } = useDashboardKPIs();

  return (
    <KPICard
      label={t("dashboard.widgets.outstandingDebt")}
      value={data ? fmt(data.outstandingDebt) : null}
      loading={isLoading}
      icon={<WarningAmberIcon />}
      tone="warning"
      subLabel={t("dashboard.widgets.unpaidInvoiceBalances")}
    />
  );
};

export default OutstandingDebtWidget;
