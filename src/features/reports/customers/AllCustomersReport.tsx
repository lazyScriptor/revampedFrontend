import { useMemo, useState } from "react";
import {
  Box,
  TextField,
  Avatar,
  Typography,
  Rating,
  InputAdornment,
  useTheme,
} from "@mui/material";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import BusinessIcon from "@mui/icons-material/Business";
import SearchIcon from "@mui/icons-material/Search";
import { ReportShell } from "@/components/reports/ReportShell";
import { DateRangeFilter } from "@/components/reports/DateRangeFilter";
import { KpiTile } from "@/components/reports/KpiTile";
import { StatTable } from "@/components/reports/StatTable";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { useAllCustomersReport } from "../hooks/useReportsHooks";
import { todayLocalStr, addDaysLocal, formatDisplayDate } from "@/lib/dates";

const formatCurrency = (n: number) =>
  `LKR ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AllCustomersReport() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

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
      "Customer",
      "Type",
      "Phone",
      "NIC",
      "Invoices",
      "Revenue",
      "Paid",
      "Balance",
      "Overdue",
      "Avg Rating",
      "Last Rental",
      "Status",
    ];
    const lines = [headers.join(",")];
    rows.forEach((r: any) => {
      const name =
        r.customer_type === "Business" && r.company_name
          ? r.company_name
          : `${r.first_name || ""} ${r.last_name || ""}`.trim();
      lines.push(
        [
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
        ].join(","),
      );
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
        const name =
          isBusiness && r.company_name
            ? r.company_name
            : `${r.first_name || ""} ${r.last_name || ""}`.trim();
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 0.5 }}>
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: isBusiness ? "#f59e0b" : isDark ? "#334155" : "#e2e8f0",
                color: isBusiness ? "#0f172a" : isDark ? "#f8fafc" : "#334155",
                fontSize: "0.82rem",
                fontWeight: 700,
                border: "1px solid",
                borderColor: isBusiness ? "#d97706" : isDark ? "#475569" : "#cbd5e1",
              }}
            >
              {isBusiness ? <BusinessIcon fontSize="small" /> : (r.first_name?.[0] || "?")}
            </Avatar>
            <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 0.25 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  lineHeight: 1.3,
                  color: isDark ? "#f8fafc" : "#0f172a",
                }}
                noWrap
              >
                {name || "—"}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: isDark ? "#94a3b8" : "#64748b",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: "0.72rem",
                }}
                noWrap
              >
                {r.phone_number || r.nic_number || "No contact"}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: "invoice_count",
      headerName: "Invoices",
      width: 95,
      type: "number",
      renderCell: (p) => (
        <Typography
          variant="body2"
          sx={{
            fontFamily: "'JetBrains Mono', monospace",
            fontVariantNumeric: "tabular-nums",
            fontWeight: 600,
            color: isDark ? "#f8fafc" : "#0f172a",
          }}
        >
          {p.value}
        </Typography>
      ),
    },
    {
      field: "total_revenue",
      headerName: "Revenue",
      width: 140,
      type: "number",
      renderCell: (p) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            fontVariantNumeric: "tabular-nums",
            color: isDark ? "#f8fafc" : "#0f172a",
          }}
        >
          {formatCurrency(Number(p.value))}
        </Typography>
      ),
    },
    {
      field: "total_paid",
      headerName: "Paid",
      width: 140,
      type: "number",
      renderCell: (p) => (
        <Typography
          variant="body2"
          sx={{
            fontFamily: "'JetBrains Mono', monospace",
            fontVariantNumeric: "tabular-nums",
            color: "#10b981",
            fontWeight: 600,
          }}
        >
          {formatCurrency(Number(p.value))}
        </Typography>
      ),
    },
    {
      field: "balance_due",
      headerName: "Balance",
      width: 140,
      type: "number",
      renderCell: (p) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            fontVariantNumeric: "tabular-nums",
            color: Number(p.value) > 0 ? "#f59e0b" : isDark ? "#94a3b8" : "text.secondary",
          }}
        >
          {formatCurrency(Number(p.value))}
        </Typography>
      ),
    },
    {
      field: "overdue_amount",
      headerName: "Overdue",
      width: 140,
      type: "number",
      renderCell: (p) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            fontVariantNumeric: "tabular-nums",
            color: Number(p.value) > 0 ? "#ef4444" : isDark ? "#64748b" : "text.secondary",
          }}
        >
          {formatCurrency(Number(p.value))}
        </Typography>
      ),
    },
    {
      field: "avg_rating",
      headerName: "Rating",
      width: 120,
      renderCell: (p) => (
        <Rating
          value={Number(p.value) || 0}
          readOnly
          size="small"
          precision={0.5}
          sx={{ color: "#f59e0b" }}
        />
      ),
    },
    {
      field: "last_rental_date",
      headerName: "Last Rental",
      width: 130,
      renderCell: (p) => (
        <span className={`tabular-nums text-xs font-mono ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          {formatDisplayDate(p.value)}
        </span>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      renderCell: (p) => {
        const isBlacklisted = p.value === "Blacklisted";
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              isBlacklisted
                ? isDark
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                  : "bg-rose-50 text-rose-700 border-rose-200"
                : isDark
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isBlacklisted
                  ? isDark ? "bg-rose-400" : "bg-rose-600"
                  : isDark ? "bg-emerald-400" : "bg-emerald-600"
              }`}
            />
            {p.value}
          </span>
        );
      },
    },
  ];

  return (
    <ReportShell
      title="All Customers"
      subtitle="Per-customer revenue, paid, balance, and overdue figures for the selected period"
      actionsSlot={
        <ExportMenu onExport={(f) => (f === "csv" ? downloadCsv() : undefined)} />
      }
      filterSlot={
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "stretch", md: "flex-end" },
            justifyContent: "space-between",
          }}
        >
          <DateRangeFilter from={range.from} to={range.to} onChange={setRange} />
          <TextField
            size="small"
            placeholder="Search name, phone, NIC…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              minWidth: { xs: "100%", md: 260 },
              bgcolor: isDark ? "#0f172a" : "#ffffff",
              borderRadius: 2,
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "#cbd5e1",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "#f59e0b",
              },
              "& .MuiInputBase-input": {
                color: isDark ? "#f8fafc" : "#0f172a",
                fontSize: "0.85rem",
              },
            }}
          />
        </Box>
      }
    >
      {/* Responsive KPI Grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 2,
        }}
      >
        <KpiTile
          label="Customers"
          value={totals.customerCount}
          icon={<PeopleAltIcon />}
          tone="info"
          loading={isLoading}
        />
        <KpiTile
          label="Total Revenue"
          value={formatCurrency(totals.totalRevenue)}
          icon={<AttachMoneyIcon />}
          tone="success"
          loading={isLoading}
        />
        <KpiTile
          label="Outstanding Balance"
          value={formatCurrency(totals.totalBalance)}
          icon={<AccountBalanceWalletIcon />}
          tone="warning"
          loading={isLoading}
        />
        <KpiTile
          label="Overdue Amount"
          value={formatCurrency(totals.totalOverdue)}
          icon={<WarningAmberIcon />}
          tone="error"
          loading={isLoading}
        />
      </Box>

      {/* High-density Data Table */}
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
