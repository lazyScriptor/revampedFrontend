import { useMemo, useState } from "react";
import { Box, TextField, Chip, Avatar, Typography, Rating } from "@mui/material";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import BusinessIcon from "@mui/icons-material/Business";
import { ReportShell } from "@/components/reports/ReportShell";
import { DateRangeFilter } from "@/components/reports/DateRangeFilter";
import { KpiTile } from "@/components/reports/KpiTile";
import { StatTable } from "@/components/reports/StatTable";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { useAllCustomersReport } from "../hooks/useReportsHooks";
import { todayLocalStr, addDaysLocal, formatDisplayDate } from "@/lib/dates";

const formatCurrency = (n: number) => `Rs. ${Number(n || 0).toLocaleString()}`;

export default function AllCustomersReport() {
  const [range, setRange] = useState({
    from: addDaysLocal(todayLocalStr(), -30),
    to: todayLocalStr(),
  });
  const [search, setSearch] = useState("");

  const { data, isLoading, isFetching } = useAllCustomersReport({
    startDate: range.from || undefined,
    endDate: range.to || undefined,
    search: search || undefined,
  });

  const rows = useMemo(() => data?.rows || [], [data]);
  const totals = data?.totals || {
    totalRevenue: 0,
    totalPaid: 0,
    totalBalance: 0,
    totalOverdue: 0,
    customerCount: 0,
  };

  const downloadCsv = () => {
    const headers = [
      "Customer", "Type", "Phone", "NIC",
      "Invoices", "Revenue", "Paid", "Balance", "Overdue",
      "Avg Rating", "Last Rental", "Status",
    ];
    const lines = [headers.join(",")];
    rows.forEach((r: any) => {
      const name = r.customer_type === "Business" && r.company_name
        ? r.company_name
        : `${r.first_name || ""} ${r.last_name || ""}`.trim();
      lines.push([
        `"${name}"`,
        r.customer_type,
        r.phone_number || "",
        r.nic_number || "",
        r.invoice_count,
        Number(r.total_revenue || 0).toFixed(2),
        Number(r.total_paid || 0).toFixed(2),
        Number(r.balance_due || 0).toFixed(2),
        Number(r.overdue_amount || 0).toFixed(2),
        Number(r.avg_rating || 0).toFixed(1),
        r.last_rental_date || "",
        r.status,
      ].join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-report-${range.from}-to-${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Customer",
      flex: 1.4,
      minWidth: 240,
      renderCell: (p: GridRenderCellParams) => {
        const r = p.row;
        const isBusiness = r.customer_type === "Business";
        const name = isBusiness && r.company_name
          ? r.company_name
          : `${r.first_name || ""} ${r.last_name || ""}`.trim();
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: isBusiness ? "primary.main" : "#475569", fontSize: "0.85rem" }}>
              {isBusiness ? <BusinessIcon fontSize="small" /> : (r.first_name?.[0] || "?")}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                {name || "—"}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {r.phone_number || r.nic_number}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    { field: "invoice_count", headerName: "Invoices", width: 100, type: "number" },
    {
      field: "total_revenue",
      headerName: "Revenue",
      width: 130,
      type: "number",
      renderCell: (p) => (
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {formatCurrency(Number(p.value))}
        </Typography>
      ),
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
      width: 130,
      type: "number",
      renderCell: (p) => (
        <Typography variant="body2" sx={{ fontWeight: 700, color: Number(p.value) > 0 ? "warning.dark" : "text.secondary" }}>
          {formatCurrency(Number(p.value))}
        </Typography>
      ),
    },
    {
      field: "overdue_amount",
      headerName: "Overdue",
      width: 130,
      type: "number",
      renderCell: (p) => (
        <Typography variant="body2" sx={{ fontWeight: 700, color: Number(p.value) > 0 ? "error.main" : "text.secondary" }}>
          {formatCurrency(Number(p.value))}
        </Typography>
      ),
    },
    {
      field: "avg_rating",
      headerName: "Rating",
      width: 130,
      renderCell: (p) => (
        <Rating value={Number(p.value) || 0} readOnly size="small" precision={0.5} />
      ),
    },
    {
      field: "last_rental_date",
      headerName: "Last Rental",
      width: 130,
      renderCell: (p) => formatDisplayDate(p.value),
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      renderCell: (p) => (
        <Chip
          size="small"
          label={p.value}
          color={p.value === "Blacklisted" ? "error" : "success"}
          variant="outlined"
          sx={{ fontWeight: 700 }}
        />
      ),
    },
  ];

  return (
    <ReportShell
      title="All Customers"
      subtitle="Per-customer revenue, paid, balance, and overdue figures for the period"
      actionsSlot={<ExportMenu onExport={(f) => f === "csv" ? downloadCsv() : undefined} />}
      filterSlot={
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-end" }}>
          <DateRangeFilter from={range.from} to={range.to} onChange={setRange} />
          <TextField
            size="small"
            label="Search"
            placeholder="Name, phone, NIC…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 220 }}
          />
        </Box>
      }
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2 }}>
        <KpiTile label="Customers" value={totals.customerCount} icon={<PeopleAltIcon />} tone="info" loading={isLoading} />
        <KpiTile label="Revenue" value={formatCurrency(totals.totalRevenue)} icon={<AttachMoneyIcon />} tone="success" loading={isLoading} />
        <KpiTile label="Outstanding" value={formatCurrency(totals.totalBalance)} icon={<AccountBalanceWalletIcon />} tone="warning" loading={isLoading} />
        <KpiTile label="Overdue" value={formatCurrency(totals.totalOverdue)} icon={<WarningAmberIcon />} tone="error" loading={isLoading} />
      </Box>
      <StatTable
        rows={rows}
        columns={columns}
        loading={isLoading || isFetching}
        getRowId={(r) => r.customer_id}
        pageSizeOptions={[25, 50, 100]}
      />
    </ReportShell>
  );
}
