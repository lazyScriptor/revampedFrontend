import { useTranslation } from "react-i18next";
import HotelOutlinedIcon from "@mui/icons-material/HotelOutlined";
import { useEquipmentInsights } from "@/features/dashboard/hooks/useDashboardHooks";
import { lkr } from "@/features/reports/equipment/performance.types";
import { InsightFrame } from "./InsightFrame";

export default function IdleMachinesWidget() {
  const { t } = useTranslation();
  const { data, isLoading } = useEquipmentInsights();
  const machines = data?.idleMachines ?? [];
  const total = data?.totals.idleMachines ?? 0;
  return (
    <InsightFrame
      title={`${t("dashboard.widgets.idleMachines")}${total ? ` (${total})` : ""}`}
      icon={<HotelOutlinedIcon fontSize="small" />}
      loading={isLoading}
      empty={t("reports.Performance.noIdle")}
      rows={machines.map((m) => ({
        key: m.equipment_id, label: m.name, value: m.purchaseCost ? lkr(m.purchaseCost) : "", sub: m.warehouse ?? undefined,
      }))}
    />
  );
}
