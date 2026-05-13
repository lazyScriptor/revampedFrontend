import AccountsReceivableTable from "./AccountsReceivableTable";
import ReportBuilder from "./ReportBuilder";
import { useAccountsReceivable } from "../hooks/useReportHooks";
import { useCurrencyCode } from "../utils/currency";
import { Box } from "@mui/material";

const SYMBOL_MAP: Record<string, string> = {
  LKR: "Rs.", USD: "$", EUR: "€", GBP: "£", INR: "₹",
};

export default function ReceivablesTab() {
  const ar = useAccountsReceivable(true);
  const code = useCurrencyCode();
  const symbol = SYMBOL_MAP[code] || code;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <ReportBuilder
        showDateRange={false}
        pdfEndpoint="/reports/accounts-receivable/pdf"
        excelEndpoint="/reports/accounts-receivable/excel"
        reportName="AccountsReceivable"
      />
      <AccountsReceivableTable data={ar.data} isLoading={ar.isLoading} currency={symbol} />
    </Box>
  );
}
