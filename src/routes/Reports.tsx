import { useState } from "react";
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
  icon: React.ReactNode;
  reports: ReportDef[];
}[] = [
  {
    key: "customers",
    label: "Customers",
    icon: <PeopleIcon fontSize="small" />,
    reports: [
      { key: "all", label: "All Customers", component: AllCustomersReport },
      { key: "outstanding", label: "Outstanding Balances", component: OutstandingBalancesReport },
    ],
  },
  {
    key: "equipment",
    label: "Equipment",
    icon: <ConstructionIcon fontSize="small" />,
    reports: [
      { key: "utilization", label: "Utilization", component: UtilizationReport },
      { key: "maintenance", label: "Maintenance by Unit", component: MaintenanceReport },
    ],
  },
  {
    key: "invoices",
    label: "Invoices",
    icon: <ReceiptLongIcon fontSize="small" />,
    reports: [
      { key: "aging", label: "Aging", component: AgingReport },
      { key: "history", label: "Rental History", component: RentalHistoryReport },
    ],
  },
  {
    key: "financials",
    label: "Financials",
    icon: <AccountBalanceIcon fontSize="small" />,
    reports: [
      { key: "profit-loss", label: "Profit & Loss", component: ProfitLossReport },
      { key: "cash-flow", label: "Cash Flow", component: CashFlowReport },
    ],
  },
];

export default function ReportsRoute() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [categoryIdx, setCategoryIdx] = useState(0);
  const [reportKey, setReportKey] = useState<string>(CATEGORIES[0].reports[0].key);

  const category = CATEGORIES[categoryIdx];
  const ActiveReport =
    category.reports.find((r) => r.key === reportKey)?.component ||
    category.reports[0].component;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pb: 4 }}>
      {/* Page header */}
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a" }}>
          Reports
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Unified analytical surface — customers, equipment, invoices, and financials.
        </Typography>
      </Box>

      {/* Top-level category tabs */}
      <Box sx={{ borderBottom: "1px solid #e2e8f0", bgcolor: "white", borderRadius: 2 }}>
        <Tabs
          value={categoryIdx}
          onChange={(_, v) => {
            setCategoryIdx(v);
            setReportKey(CATEGORIES[v].reports[0].key);
          }}
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

      {/* Sub-tab pill strip for the active category */}
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
