import AccountsReceivableTable from "./AccountsReceivableTable";
import ReportBuilder from "./ReportBuilder";
import { useAccountsReceivable } from "../hooks/useReportHooks";
import { useCurrencyCode } from "../utils/currency";
import { useState } from "react";
import { Box } from "@mui/material";
import { WhatsAppSendDialog } from "@/features/whatsapp/components/WhatsAppSendDialog";
import { useAuthStore } from "@/stores/useAuthStore";

const SYMBOL_MAP: Record<string, string> = {
  LKR: "Rs.", USD: "$", EUR: "€", GBP: "£", INR: "₹",
};

export default function ReceivablesTab() {
  const ar = useAccountsReceivable(true);
  const code = useCurrencyCode();
  const symbol = SYMBOL_MAP[code] || code;
  const canMessage = useAuthStore((st) => st.hasPermission)("whatsapp:send");
  const [reminderInvoice, setReminderInvoice] = useState<number | null>(null);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <ReportBuilder
        showDateRange={false}
        pdfEndpoint="/reports/accounts-receivable/pdf"
        excelEndpoint="/reports/accounts-receivable/excel"
        reportName="AccountsReceivable"
      />
      <AccountsReceivableTable
        data={ar.data}
        isLoading={ar.isLoading}
        currency={symbol}
        onSendReminder={canMessage ? (invoiceId) => setReminderInvoice(invoiceId) : undefined}
      />
      {reminderInvoice !== null && (
        <WhatsAppSendDialog open onClose={() => setReminderInvoice(null)} invoiceId={reminderInvoice} templateKey="payment_reminder" />
      )}
    </Box>
  );
}
