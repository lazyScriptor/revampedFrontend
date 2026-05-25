import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Typography, Tabs, Tab, Paper, useTheme, useMediaQuery } from "@mui/material";
import type React from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import OverviewTab from "@/features/accounting/components/OverviewTab";
import InvoicesTab from "@/features/accounting/components/InvoicesTab";
import PaymentsTab from "@/features/accounting/components/PaymentsTab";
import ExpensesTab from "@/features/accounting/components/ExpensesTab";
import ReceivablesTab from "@/features/accounting/components/ReceivablesTab";
import JournalTab from "@/features/accounting/components/JournalTab";
import AccountingChartsPanel from "@/features/accounting/components/AccountingChartsPanel";
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
  { key: "overview", label: t("accounting.overview"), subtitle: t("accounting.subtitle"), component: OverviewTab },
  { key: "invoices", label: t("accounting.invoices"), subtitle: t("invoices.title"), component: InvoicesTab },
  { key: "payments", label: t("accounting.payments"), subtitle: t("accounting.paymentReceived"), component: PaymentsTab },
  { key: "expenses", label: t("accounting.expenses"), subtitle: t("accounting.expense"), component: ExpensesTab },
  { key: "receivables", label: t("accounting.receivables"), subtitle: t("accounting.receivables"), component: ReceivablesTab },
  { key: "journal", label: t("accounting.journal"), subtitle: t("accounting.journal"), component: JournalTab },
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

  // ── Legacy multi-tab workstation (only reached at /accounting with no ?tab=) ─
  const handleTabChange = (_: any, v: number) => {
    setActiveTab(v);
    navigate({
      to: "/accounting",
      search: { tab: ACCOUNTING_TAB_KEYS[v] } as any,
      replace: true,
    });
  };

  return <AccountingWorkstation activeTab={activeTab} onTabChange={handleTabChange} />;
}

// Kept for direct /accounting access; sidebar always routes to dedicated views.
function AccountingWorkstation({
  activeTab,
  onTabChange,
}: {
  activeTab: number;
  onTabChange: (_: any, v: number) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const TAB_CONFIG = buildTabConfig(t);
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [chartsWidth, setChartsWidth] = useState(isMobile ? 100 : 30);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const next = ((rect.right - mouseMoveEvent.clientX) / rect.width) * 100;
        if (next > 15 && next < 60) setChartsWidth(next);
      }
    },
    [isResizing]
  );
  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  return (
    <Box ref={containerRef} sx={{ display: "flex", flexDirection: "column", gap: 2.5, pb: 4, height: "100%" }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a" }}>
          Accounting Workstation
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Professional transactional financial management & real-time analytics.
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 3 : 0,
          minHeight: "70vh",
          position: "relative",
        }}
      >
        <Box
          sx={{
            flex: 1,
            width: isMobile ? "100%" : `${100 - chartsWidth}%`,
            transition: isResizing ? "none" : "width 0.2s",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={onTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              bgcolor: "white",
              borderRadius: 2,
              border: "1px solid #e2e8f0",
              "& .MuiTab-root": { textTransform: "none", fontWeight: 600, fontSize: "0.85rem", minHeight: 48 },
              "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0" },
            }}
          >
            {TAB_CONFIG.map((t, i) => (
              <Tab key={i} label={t.label} />
            ))}
          </Tabs>

          <Box sx={{ flexGrow: 1 }}>
            {TAB_CONFIG.map((t, i) => (
              <Box key={i} sx={{ display: activeTab === i ? "block" : "none" }}>
                {activeTab === i && <t.component />}
              </Box>
            ))}
          </Box>
        </Box>

        {!isMobile && (
          <Box
            onMouseDown={startResizing}
            sx={{
              width: "12px",
              cursor: "col-resize",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              "&:hover .resizer-line": { bgcolor: "primary.main" },
              px: 0.5,
              zIndex: 10,
            }}
          >
            <Box
              className="resizer-line"
              sx={{
                width: "2px",
                height: "40%",
                bgcolor: isResizing ? "primary.main" : "#e2e8f0",
                borderRadius: 1,
                transition: "background-color 0.2s",
              }}
            />
          </Box>
        )}

        <Paper
          elevation={0}
          sx={{
            width: isMobile ? "100%" : `${chartsWidth}%`,
            minWidth: isMobile ? "none" : "300px",
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            overflow: "hidden",
            bgcolor: "white",
            transition: isResizing ? "none" : "width 0.2s",
          }}
        >
          <AccountingChartsPanel />
        </Paper>
      </Box>
    </Box>
  );
}
