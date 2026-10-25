import KpiCards from "./KpiCards";
import RevenueTrendChart from "./RevenueTrendChart";
import ReportBuilder from "./ReportBuilder";
import { useDashboardKPIs } from "../hooks/useReportHooks";
import { useReportStore } from "@/stores/useReportStore";
import { useCurrencyCode } from "../utils/currency";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function OverviewTab() {
  const { t } = useTranslation();
  const { startDate, endDate } = useReportStore();
  const dashboard = useDashboardKPIs(startDate, endDate);
  const currency = useCurrencyCode();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <ReportBuilder reportName="Dashboard" />
      <KpiCards data={dashboard.data} isLoading={dashboard.isLoading} currency={currency === "LKR" ? "Rs." : currency} />
      <Typography variant="caption" sx={{ color: "#475569", display: "block", px: 0.5 }}>
        {t("accounting.OverviewTab.definitions")}
      </Typography>
      <RevenueTrendChart data={dashboard.data?.revenueTrend} isLoading={dashboard.isLoading} />
    </Box>
  );
}
