import { useTranslation } from "react-i18next";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import { useEquipmentInsights } from "@/features/dashboard/hooks/useDashboardHooks";
import { lkr } from "@/features/reports/equipment/performance.types";
import { InsightFrame } from "./InsightFrame";

export default function CategoryRevenueWidget() {
  const { t } = useTranslation();
  const { data, isLoading } = useEquipmentInsights();
  const families = (data?.families ?? []).filter((f) => f.revenue > 0).slice(0, 12);
  const max = Math.max(1, ...families.map((f) => f.revenue));
  return (
    <InsightFrame
      title={t("dashboard.widgets.categoryRevenue")}
      icon={<CategoryOutlinedIcon fontSize="small" />}
      loading={isLoading}
      empty={t("reports.Performance.noData")}
      rows={families.map((f) => ({
        key: f.name, label: f.name, value: lkr(f.revenue), share: (f.revenue / max) * 100,
        sub: `${t("reports.Performance.rentalsCount", { count: f.rentals })} · ${f.utilizationPct}%`,
      }))}
    />
  );
}
