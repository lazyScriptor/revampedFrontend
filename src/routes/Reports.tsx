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
import PeopleIcon from "@mui/icons-material/People";
import ConstructionIcon from "@mui/icons-material/Construction";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";

import AllCustomersReport from "@/features/reports/customers/AllCustomersReport";
import OutstandingBalancesReport from "@/features/reports/customers/OutstandingBalancesReport";
import UtilizationReport from "@/features/reports/equipment/UtilizationReport";
import MaintenanceReport from "@/features/reports/equipment/MaintenanceReport";
import AgingReport from "@/features/reports/invoices/AgingReport";
import RentalHistoryReport from "@/features/reports/invoices/RentalHistoryReport";
import ProfitLossReport from "@/features/reports/financials/ProfitLossReport";
import CashFlowReport from "@/features/reports/financials/CashFlowReport";

type CategoryKey = "customers" | "equipment" | "invoices" | "financials";

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
];

const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

export default function ReportsRoute() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { category?: string; report?: string };

  const dedicatedIdx = CATEGORY_KEYS.indexOf(search.category as CategoryKey);
  const isDedicated = dedicatedIdx >= 0;

  // For the legacy all-tabs view we keep local state.
  const [legacyIdx, setLegacyIdx] = useState(0);

  const activeIdx = isDedicated ? dedicatedIdx : legacyIdx;
  const category = CATEGORIES[activeIdx];

  const [reportKey, setReportKey] = useState<string>(
    search.report || category.reports[0].key
  );

  // Whenever the URL category changes, default to that category's first report
  // unless the URL explicitly carries a known report key for it.
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
            Reports
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
            {category.label}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {category.subtitle}
          </Typography>
        </Box>

        {/* Pill toggles for sub-reports inside this category */}
        <Box>
          <ToggleButtonGroup
            value={reportKey}
            exclusive
            size="small"
            onChange={(_, v) => v && handleReportChange(v)}
            sx={{
              flexWrap: "wrap",
              gap: 0.5,
              "& .MuiToggleButton-root": {
                textTransform: "none",
                fontWeight: 700,
                border: "1px solid #e2e8f0",
                borderRadius: "999px !important",
                px: 2,
                py: 0.5,
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

        <ActiveReport />
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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pb: 4 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a" }}>
          Reports
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Unified analytical surface — customers, equipment, invoices, and financials.
        </Typography>
      </Box>

      <Box sx={{ borderBottom: "1px solid #e2e8f0", bgcolor: "white", borderRadius: 2 }}>
        <Tabs
          value={activeIdx}
          onChange={(_, v) => handleCategoryChange(v)}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons="auto"
          sx={{
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 700,
              minHeight: 56,
              fontSize: "0.95rem",
            },
            "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0" },
          }}
        >
          {CATEGORIES.map((c) => (
            <Tab key={c.key} icon={c.icon as any} iconPosition="start" label={c.label} />
          ))}
        </Tabs>
      </Box>

      <Box>
        <ToggleButtonGroup
          value={reportKey}
          exclusive
          size="small"
          onChange={(_, v) => v && setReportKey(v)}
          sx={{
            flexWrap: "wrap",
            gap: 0.5,
            "& .MuiToggleButton-root": {
              textTransform: "none",
              fontWeight: 700,
              border: "1px solid #e2e8f0",
              borderRadius: "999px !important",
              px: 2,
              py: 0.5,
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

      <ActiveReport />
    </Box>
  );
}
