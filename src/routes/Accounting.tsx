import { Box, Typography, Tabs, Tab } from "@mui/material";
import OverviewTab from "@/features/accounting/components/OverviewTab";
import InvoicesTab from "@/features/accounting/components/InvoicesTab";
import PaymentsTab from "@/features/accounting/components/PaymentsTab";
import ExpensesTab from "@/features/accounting/components/ExpensesTab";
import ReceivablesTab from "@/features/accounting/components/ReceivablesTab";
import JournalTab from "@/features/accounting/components/JournalTab";
import { useReportStore } from "@/stores/useReportStore";

export default function AccountingRoute() {
  const { activeTab, setActiveTab } = useReportStore();

  const tabConfig = [
    { label: "Overview", component: OverviewTab },
    { label: "Invoices", component: InvoicesTab },
    { label: "Payments", component: PaymentsTab },
    { label: "Expenses", component: ExpensesTab },
    { label: "Receivables", component: ReceivablesTab },
    { label: "Journal", component: JournalTab },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pb: 4 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Accounting</Typography>
          <Typography variant="body2" color="text.secondary">
            Financial reports, receivables, and business intelligence.
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          bgcolor: "white", borderRadius: 2, border: "1px solid #e2e8f0",
          "& .MuiTab-root": { textTransform: "none", fontWeight: 600, fontSize: "0.8rem", minHeight: 44, py: 0 },
          "& .MuiTabs-indicator": { height: 2.5, borderRadius: "2px 2px 0 0" },
        }}
      >
        {tabConfig.map((t, i) => (
          <Tab key={i} label={t.label} />
        ))}
      </Tabs>

      {/* Render Active Tab */}
      <Box sx={{ mt: 1 }}>
        {tabConfig.map((t, i) => (
          <Box key={i} sx={{ display: activeTab === i ? "block" : "none" }}>
            {activeTab === i && <t.component />}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
