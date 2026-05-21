import { useMemo } from "react";
import { Box, Typography, Avatar } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import BusinessIcon from "@mui/icons-material/Business";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { ReportShell } from "@/components/reports/ReportShell";
import { KpiTile } from "@/components/reports/KpiTile";
import { StatTable } from "@/components/reports/StatTable";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { useInvoiceAging } from "../hooks/useReportsHooks";
import { formatDisplayDate } from "@/lib/dates";

const formatCurrency = (n: number) => `Rs. ${Number(n || 0).toLocaleString()}`;

export default function AgingReport() {
  const { data, isLoading, isFetching } = useInvoiceAging();

  const buckets = data?.buckets;
  const rows = useMemo(() => data?.rows || [], [data]);

  const downloadCsv = () => {
    const headers = ["Invoice", "Customer", "Issued", "Total", "Paid", "Balance", "Days Overdue"];
    const lines = [headers.join(",")];
    rows.forEach((r: any) => {
      const name = r.customer_type === "Business" && r.company_name
        ? r.company_name
        : `${r.first_name || ""} ${r.last_name || ""}`.trim();
      lines.push([
        `INV-${r.invoice_id}`,
        `"${name}"`,
        r.issued_date,
        Number(r.total_amount || 0).toFixed(2),
        Number(r.total_paid || 0).toFixed(2),
        Number(r.balance_due || 0).toFixed(2),
        r.days_overdue,
      ].join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-aging-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: GridColDef[] = [
    {
      field: "invoice_id",
      headerName: "Invoice",
      width: 120,
      renderCell: (p) => <Typography sx={{ fontWeight: 700 }}>INV-{p.value}</Typography>,
    },
    {
      field: "customer",
      headerName: "Customer",
      flex: 1.4,
      minWidth: 240,
      renderCell: (p) => {
        const r = p.row;
        const isBusiness = r.customer_type === "Business";
        const name = isBusiness && r.company_name
          ? r.company_name
          : `${r.first_name || ""} ${r.last_name || ""}`.trim();
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Avatar sx={{ width: 30, height: 30, bgcolor: isBusiness ? "primary.main" : "#475569", fontSize: "0.8rem" }}>
              {isBusiness ? <BusinessIcon fontSize="small" /> : (r.first_name?.[0] || "?")}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>{name}</Typography>
              <Typography variant="caption" color="text.secondary">{r.phone_number}</Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: "issued_date",
      headerName: "Issued",
      width: 130,
      renderCell: (p) => formatDisplayDate(p.value),
    },
    {
      field: "total_amount",
      headerName: "Total",
      width: 130,
      type: "number",
      renderCell: (p) => formatCurrency(Number(p.value)),
    },
    {
      field: "total_paid",
      headerName: "Paid",
      width: 130,
      type: "number",
      renderCell: (p) => formatCurrency(Number(p.value)),
    },
    {
      field: "balance_due",
      headerName: "Balance",
      width: 140,
      type: "number",
      renderCell: (p) => (
        <Typography variant="body2" sx={{ fontWeight: 800, color: "error.main" }}>
          {formatCurrency(Number(p.value))}
        </Typography>
      ),
    },
    {
      field: "days_overdue",
      headerName: "Days overdue",
      width: 130,
      type: "number",
      renderCell: (p) => {
        const v = Number(p.value) || 0;
        const tone = v > 90 ? "error.main" : v > 60 ? "warning.dark" : v > 30 ? "warning.main" : "text.secondary";
        return <Typography variant="body2" sx={{ fontWeight: 700, color: tone }}>{v}</Typography>;
      },
    },
  ];

  return (
    <ReportShell
      title="Invoice Aging"
      subtitle="Active invoices with unpaid balances, age-bucketed"
      actionsSlot={<ExportMenu onExport={(f) => f === "csv" ? downloadCsv() : undefined} />}
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2 }}>
        <KpiTile label="0-30 Days" value={formatCurrency(buckets?.current?.total || 0)} hint={`${buckets?.current?.rows?.length || 0} invoices`} tone="info" loading={isLoading} />
        <KpiTile label="31-60 Days" value={formatCurrency(buckets?.thirtyToSixty?.total || 0)} hint={`${buckets?.thirtyToSixty?.rows?.length || 0} invoices`} tone="warning" loading={isLoading} />
        <KpiTile label="61-90 Days" value={formatCurrency(buckets?.sixtyToNinety?.total || 0)} hint={`${buckets?.sixtyToNinety?.rows?.length || 0} invoices`} tone="warning" loading={isLoading} />
        <KpiTile label="90+ Days" value={formatCurrency(buckets?.overNinety?.total || 0)} hint={`${buckets?.overNinety?.rows?.length || 0} invoices`} icon={<AccountBalanceWalletIcon />} tone="error" loading={isLoading} />
      </Box>
      <StatTable
        rows={rows}
        columns={columns}
        loading={isLoading || isFetching}
        getRowId={(r) => r.invoice_id}
        pageSizeOptions={[25, 50, 100]}
      />
    </ReportShell>
  );
}
