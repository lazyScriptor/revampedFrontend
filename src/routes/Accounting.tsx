import { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import type React from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import OverviewTab from "@/features/accounting/components/OverviewTab";
import InvoicesTab from "@/features/accounting/components/InvoicesTab";
import PaymentsTab from "@/features/accounting/components/PaymentsTab";
import ExpensesTab from "@/features/accounting/components/ExpensesTab";
import ReceivablesTab from "@/features/accounting/components/ReceivablesTab";
import JournalTab from "@/features/accounting/components/JournalTab";
import { useReportStore } from "@/stores/useReportStore";

const ACCOUNTING_TAB_KEYS = [
  "overview",
  "invoices",
  "payments",
  "expenses",
  "receivables",
  "journal",
] as const;
type AccountingTabKey = (typeof ACCOUNTING_TAB_KEYS)[number];

const buildTabConfig = (t: (k: string) => string): { key: AccountingTabKey; label: string; subtitle: string; component: React.ComponentType }[] => [
  { key: "overview", label: t("accounting.overview"), subtitle: t("accounting.subtitles.overview"), component: OverviewTab },
  { key: "invoices", label: t("accounting.invoices"), subtitle: t("accounting.subtitles.invoices"), component: InvoicesTab },
  { key: "payments", label: t("accounting.payments"), subtitle: t("accounting.subtitles.payments"), component: PaymentsTab },
  { key: "expenses", label: t("accounting.expenses"), subtitle: t("accounting.subtitles.expenses"), component: ExpensesTab },
  { key: "receivables", label: t("accounting.receivables"), subtitle: t("accounting.subtitles.receivables"), component: ReceivablesTab },
  { key: "journal", label: t("accounting.journal"), subtitle: t("accounting.subtitles.journal"), component: JournalTab },
];

export default function AccountingRoute() {
  const { t } = useTranslation();
  const TAB_CONFIG = buildTabConfig(t);
  const { activeTab, setActiveTab } = useReportStore();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { tab?: AccountingTabKey };

  const dedicatedIdx = ACCOUNTING_TAB_KEYS.indexOf(search.tab as AccountingTabKey);
  const isDedicated = dedicatedIdx >= 0;

  // Sync URL tab → store (so the workstation view also remembers).
  useEffect(() => {
    if (isDedicated && dedicatedIdx !== activeTab) {
      setActiveTab(dedicatedIdx);
    }
  }, [dedicatedIdx, isDedicated]);

  // ── Dedicated single-tab view (sidebar deep-link target) ────────────────────
  if (isDedicated) {
    const { label, subtitle, component: Component } = TAB_CONFIG[dedicatedIdx];
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pb: 4 }}>
        <Box>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            {t("accounting.title")}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
            {label}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        </Box>
        <Component />
      </Box>
    );
  }

  // /accounting with no ?tab → land on the Overview (the old hidden workstation layout was removed).
  return <RedirectToOverview />;
}

function RedirectToOverview() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/accounting", search: { tab: "overview" } as any, replace: true });
  }, [navigate]);
  return null;
}
