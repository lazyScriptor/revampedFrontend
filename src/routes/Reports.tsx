import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import PeopleIcon from "@mui/icons-material/People";
import ConstructionIcon from "@mui/icons-material/Construction";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PrintIcon from "@mui/icons-material/Print";

import AllCustomersReport from "@/features/reports/customers/AllCustomersReport";
import OutstandingBalancesReport from "@/features/reports/customers/OutstandingBalancesReport";
import UtilizationReport from "@/features/reports/equipment/UtilizationReport";
import MaintenanceReport from "@/features/reports/equipment/MaintenanceReport";
import AgingReport from "@/features/reports/invoices/AgingReport";
import RentalHistoryReport from "@/features/reports/invoices/RentalHistoryReport";
import ProfitLossReport from "@/features/reports/financials/ProfitLossReport";
import CashFlowReport from "@/features/reports/financials/CashFlowReport";
import { InvoicePrintLogsView } from "@/features/invoices/components/InvoicePrintLogsView";

type CategoryKey = "customers" | "equipment" | "invoices" | "financials" | "audit";

interface ReportDef {
  key: string;
  label: string;
  component: React.ComponentType;
}

const CATEGORIES: {
  key: CategoryKey;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  reports: ReportDef[];
}[] = [
  {
    key: "customers",
    label: "Customers",
    subtitle: "Roster health, ratings, and balances",
    icon: <PeopleIcon fontSize="small" />,
    reports: [
      { key: "all", label: "All Customers", component: AllCustomersReport },
      { key: "outstanding", label: "Outstanding Balances", component: OutstandingBalancesReport },
    ],
  },
  {
    key: "equipment",
    label: "Equipment",
    subtitle: "Utilization, maintenance and asset performance",
    icon: <ConstructionIcon fontSize="small" />,
    reports: [
      { key: "utilization", label: "Utilization", component: UtilizationReport },
      { key: "maintenance", label: "Maintenance by Unit", component: MaintenanceReport },
    ],
  },
  {
    key: "invoices",
    label: "Invoices",
    subtitle: "Aging, dispatched and returned orders",
    icon: <ReceiptLongIcon fontSize="small" />,
    reports: [
      { key: "aging", label: "Aging", component: AgingReport },
      { key: "history", label: "Rental History", component: RentalHistoryReport },
    ],
  },
  {
    key: "financials",
    label: "Financials",
    subtitle: "Profit, loss and cash flow",
    icon: <AccountBalanceIcon fontSize="small" />,
    reports: [
      { key: "profit-loss", label: "Profit & Loss", component: ProfitLossReport },
      { key: "cash-flow", label: "Cash Flow", component: CashFlowReport },
    ],
  },
  {
    key: "audit",
    label: "Print Audit",
    subtitle: "Complete immutable log of all thermal receipts printed, operator attribution, and point-in-time bill snapshots",
    icon: <PrintIcon fontSize="small" />,
    reports: [
      { key: "logs", label: "Print Audit Logs", component: InvoicePrintLogsView },
    ],
  },
];

const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

export default function ReportsRoute() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { t } = useTranslation();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { category?: string; report?: string };

  const dedicatedIdx = CATEGORY_KEYS.indexOf(search.category as CategoryKey);
  const isDedicated = dedicatedIdx >= 0;

  const [legacyIdx, setLegacyIdx] = useState(0);
  const activeIdx = isDedicated ? dedicatedIdx : legacyIdx;
  const category = CATEGORIES[activeIdx];

  const [reportKey, setReportKey] = useState<string>(
    search.report || category.reports[0].key
  );

  useEffect(() => {
    const matchedReport = category.reports.find((r) => r.key === search.report);
    setReportKey(matchedReport ? matchedReport.key : category.reports[0].key);
  }, [activeIdx, search.report]);

  const ActiveReport = useMemo(
    () =>
      category.reports.find((r) => r.key === reportKey)?.component ||
      category.reports[0].component,
    [category, reportKey]
  );

  const updateUrl = (nextCategory: CategoryKey, nextReport: string) => {
    navigate({
      to: "/reports",
      search: { category: nextCategory, report: nextReport } as any,
      replace: true,
    });
  };

  const handleReportChange = (key: string) => {
    setReportKey(key);
    updateUrl(category.key, key);
  };

  // ── Dedicated category view (sidebar deep-link target) ──────────────────────
  if (isDedicated) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pb: 4, minHeight: 0 }}>
        {/* Header */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#f59e0b",
              fontSize: "0.72rem",
            }}
          >
            {t("nav.reports")} / {category.label}
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: isDark ? "#f8fafc" : "#0f172a",
              lineHeight: 1.15,
              letterSpacing: "-0.025em",
              fontSize: { xs: "1.5rem", sm: "1.875rem" },
            }}
          >
            {category.label}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: isDark ? "#94a3b8" : "text.secondary",
              maxWidth: 720,
              fontSize: { xs: "0.8125rem", sm: "0.875rem" },
            }}
          >
            {category.subtitle}
          </Typography>
        </Box>

        {/* Sub-report selector pills */}
        {category.reports.length > 1 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            <ToggleButtonGroup
              value={reportKey}
              exclusive
              size="small"
              onChange={(_, v) => v && handleReportChange(v)}
              sx={{
                flexWrap: "wrap",
                gap: 0.75,
                bgcolor: isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(0, 0, 0, 0.03)",
                p: 0.5,
                borderRadius: "999px",
                border: "1px solid",
                borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
                "& .MuiToggleButton-root": {
                  textTransform: "none",
                  fontWeight: 700,
                  border: "none",
                  borderRadius: "999px !important",
                  px: 2.25,
                  py: 0.6,
                  fontSize: "0.8125rem",
                  color: isDark ? "#94a3b8" : "#475569",
                  transition: "all 0.18s ease",
                  "&.Mui-selected": {
                    bgcolor: "#f59e0b !important",
                    color: "#0f172a !important",
                    boxShadow: "0 2px 8px rgba(245, 158, 11, 0.25)",
                  },
                  "&:hover:not(.Mui-selected)": {
                    bgcolor: isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9",
                    color: isDark ? "#f8fafc" : "#0f172a",
                  },
                },
              }}
            >
              {category.reports.map((r) => (
                <ToggleButton key={r.key} value={r.key}>
                  {r.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        )}

        {/* Animated Report Switcher */}
        <AnimatePresence mode="wait">
          <motion.div
            key={reportKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <ActiveReport />
          </motion.div>
        </AnimatePresence>
      </Box>
    );
  }

  // ── Legacy all-tabs view (only reached at /reports with no ?category=) ──────
  const handleCategoryChange = (idx: number) => {
    setLegacyIdx(idx);
    const next = CATEGORIES[idx];
    setReportKey(next.reports[0].key);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pb: 4, minHeight: 0 }}>
      {/* Header */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            color: isDark ? "#f8fafc" : "#0f172a",
            letterSpacing: "-0.025em",
            fontSize: { xs: "1.5rem", sm: "1.875rem" },
          }}
        >
          Reports & Analytics
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: isDark ? "#94a3b8" : "text.secondary", fontSize: { xs: "0.8125rem", sm: "0.875rem" } }}
        >
          Unified analytical surface — customers, equipment, invoices, financials, and print audits.
        </Typography>
      </Box>

      {/* Category Tabs Strip */}
      <Box
        sx={{
          borderBottom: "1px solid",
          borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
          bgcolor: isDark ? "#1e293b" : "white",
          borderRadius: 3,
          p: 0.5,
        }}
      >
        <Tabs
          value={activeIdx}
          onChange={(_, v) => handleCategoryChange(v)}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 48,
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 700,
              minHeight: 48,
              fontSize: "0.875rem",
              borderRadius: 2,
              color: isDark ? "#94a3b8" : "#64748b",
              transition: "all 0.15s ease",
              "&.Mui-selected": {
                color: isDark ? "#f8fafc" : "#0f172a",
              },
              "&:hover:not(.Mui-selected)": {
                color: isDark ? "#f8fafc" : "#0f172a",
                bgcolor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0,0,0,0.02)",
              },
            },
            "& .MuiTabs-indicator": {
              height: 3,
              borderRadius: "3px 3px 0 0",
              bgcolor: "#f59e0b",
            },
          }}
        >
          {CATEGORIES.map((c) => (
            <Tab key={c.key} icon={c.icon as any} iconPosition="start" label={c.label} />
          ))}
        </Tabs>
      </Box>

      {/* Sub-report selector pills */}
      {category.reports.length > 1 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          <ToggleButtonGroup
            value={reportKey}
            exclusive
            size="small"
            onChange={(_, v) => v && setReportKey(v)}
            sx={{
              flexWrap: "wrap",
              gap: 0.75,
              bgcolor: isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(0, 0, 0, 0.03)",
              p: 0.5,
              borderRadius: "999px",
              border: "1px solid",
              borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
              "& .MuiToggleButton-root": {
                textTransform: "none",
                fontWeight: 700,
                border: "none",
                borderRadius: "999px !important",
                px: 2.25,
                py: 0.6,
                fontSize: "0.8125rem",
                color: isDark ? "#94a3b8" : "#475569",
                transition: "all 0.18s ease",
                "&.Mui-selected": {
                  bgcolor: "#f59e0b !important",
                  color: "#0f172a !important",
                  boxShadow: "0 2px 8px rgba(245, 158, 11, 0.25)",
                },
                "&:hover:not(.Mui-selected)": {
                  bgcolor: isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9",
                  color: isDark ? "#f8fafc" : "#0f172a",
                },
              },
            }}
          >
            {category.reports.map((r) => (
              <ToggleButton key={r.key} value={r.key}>
                {r.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      )}

      {/* Animated Report Component */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${category.key}-${reportKey}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <ActiveReport />
        </motion.div>
      </AnimatePresence>
    </Box>
  );
}
