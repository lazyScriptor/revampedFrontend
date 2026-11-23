import { useTranslation } from "react-i18next";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import { useEquipmentInsights } from "@/features/dashboard/hooks/useDashboardHooks";
import { lkr } from "@/features/reports/equipment/performance.types";
import { InsightFrame } from "./InsightFrame";

export default function TopEarningMachinesWidget() {
  const { t } = useTranslation();
  const { data, isLoading } = useEquipmentInsights();
  const machines = data?.topEarners ?? [];
  const max = Math.max(1, ...machines.map((m) => m.revenue));
  return (
    <InsightFrame
      title={t("dashboard.widgets.topEarningMachines")}
      icon={<EmojiEventsOutlinedIcon fontSize="small" />}
      loading={isLoading}
      empty={t("reports.Performance.noData")}
      rows={machines.map((m) => ({
        key: m.equipment_id, label: m.name, value: lkr(m.revenue), share: (m.revenue / max) * 100,
        sub: t("reports.Performance.rentalsCount", { count: m.rentals }),
      }))}
    />
  );
}
