import React from 'react';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useTranslation } from 'react-i18next';
import { KPICard } from './KPICard';
import { useDashboardKPIs } from '@/features/dashboard/hooks/useDashboardHooks';

const ActiveRentalsWidget: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useDashboardKPIs();

  return (
    <KPICard
      label={t("dashboard.widgets.activeRentals")}
      value={data?.activeRentalsCount ?? null}
      loading={isLoading}
      icon={<ReceiptLongIcon />}
      tone="violet"
      subLabel={t("dashboard.widgets.openInvoices")}
    />
  );
};

export default ActiveRentalsWidget;
