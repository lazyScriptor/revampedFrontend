import { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Avatar,
  ToggleButtonGroup,
  ToggleButton,
  useTheme,
} from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import BusinessIcon from "@mui/icons-material/Business";
import { ReportShell } from "@/components/reports/ReportShell";
import { DateRangeFilter } from "@/components/reports/DateRangeFilter";
import { StatTable } from "@/components/reports/StatTable";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { useRentalHistoryReport } from "../hooks/useReportsHooks";
import { todayLocalStr, addDaysLocal, formatDisplayDate } from "@/lib/dates";

const formatCurrency = (n: number) =>
  `LKR ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const isOverdue = (inv: any) =>
  inv.status === "Active" &&
  (inv.InvoiceLines || inv.invoice_lines || []).some(
    (l: any) =>
      l.line_status === "Active" &&
      l.actual_return_date == null &&
      l.expected_return_date &&
      new Date(l.expected_return_date) < new Date(),
  );

export default function RentalHistoryReport() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [range, setRange] = useState({
    from: addDaysLocal(todayLocalStr(), -90),
    to: todayLocalStr(),
  });
  const [status, setStatus] = useState<string>("All");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

  const { data, isLoading, isFetching } = useRentalHistoryReport({
    startDate: range.from || undefined,
    endDate: range.to || undefined,
    status,
    page: paginationModel.page + 1,
    pageSize: paginationModel.pageSize,
  });

  const rows = useMemo(() => data?.rows || [], [data]);
  const rowCount = data?.totalItems || 0;

  const downloadCsv = () => {
    const headers = ["Invoice", "Customer", "Issued", "Total", "Status"];
    const lines = [headers.join(",")];
    rows.forEach((r: any) => {
      const c = r.Customer || {};
      const name =
        c.customer_type === "Business" && c.company_name
          ? c.company_name
          : `${c.first_name || ""} ${c.last_name || ""}`.trim();
      lines.push(
        [
          `INV-${r.invoice_id}`,
          `"${name}"`,
          r.issued_date,
          Number(r.total_amount || 0).toFixed(2),
          r.status,
        ].join(","),
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rental-history-${range.from}-to-${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: GridColDef[] = [
    {
      field: "invoice_id",
      headerName: "Invoice #",
      width: 125,
      renderCell: (p) => (
        <span
          className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
            isDark
              ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
              : "text-amber-800 bg-amber-50 border-amber-200"
          }`}
        >
          INV-{p.value}
        </span>
      ),
    },
    {
      field: "customer",
      headerName: "Customer",
      flex: 1.4,
      minWidth: 240,
      renderCell: (p) => {
        const c = p.row.Customer || {};
        const isBusiness = c.customer_type === "Business";
        const name =
          isBusiness && c.company_name
            ? c.company_name
            : `${c.first_name || ""} ${c.last_name || ""}`.trim();
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
              {isBusiness ? <BusinessIcon fontSize="small" /> : (c.first_name?.[0] || "?")}
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
              >
                {c.phone_number || "No contact"}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: "issued_date",
      headerName: "Issued Date",
      width: 135,
      renderCell: (p) => (
        <span className={`tabular-nums font-mono text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          {formatDisplayDate(p.value)}
        </span>
      ),
    },
    {
      field: "total_amount",
      headerName: "Grand Total",
      width: 150,
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
      field: "status",
      headerName: "Rental Status",
      width: 150,
      renderCell: (p) => {
        const overdue = isOverdue(p.row);
        const label = overdue ? "Overdue" : p.value;
        const isCompleted = p.value === "Completed";

        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              overdue
                ? isDark
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                  : "bg-rose-50 text-rose-700 border-rose-200"
                : isCompleted
                ? isDark
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                : isDark
                ? "bg-sky-500/10 text-sky-400 border-sky-500/25"
                : "bg-sky-50 text-sky-700 border-sky-200"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                overdue
                  ? isDark ? "bg-rose-400" : "bg-rose-600"
                  : isCompleted
                  ? isDark ? "bg-emerald-400" : "bg-emerald-600"
                  : isDark ? "bg-sky-400" : "bg-sky-600"
              }`}
            />
            {label}
          </span>
        );
      },
    },
  ];

  return (
    <ReportShell
      title="Rental History"
      subtitle="Complete ledger of dispatched, active, overdue, and returned rental orders"
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
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: isDark ? "#94a3b8" : "text.secondary",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontSize: "0.7rem",
              }}
            >
              FILTER BY STATUS
            </Typography>
            <ToggleButtonGroup
              value={status}
              exclusive
              size="small"
              onChange={(_, v) => v && setStatus(v)}
              sx={{
                flexWrap: "wrap",
                gap: 0.5,
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
                  px: 1.75,
                  py: 0.4,
                  fontSize: "0.75rem",
                  color: isDark ? "#94a3b8" : "#475569",
                  "&.Mui-selected": {
                    bgcolor: "#f59e0b !important",
                    color: "#0f172a !important",
                  },
                },
              }}
            >
              <ToggleButton value="All">All Invoices</ToggleButton>
              <ToggleButton value="Active">Active</ToggleButton>
              <ToggleButton value="Completed">Completed</ToggleButton>
              <ToggleButton value="Draft">Draft</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      }
    >
      <StatTable
        rows={rows}
        columns={columns}
        loading={isLoading || isFetching}
        rowCount={rowCount}
        getRowId={(r) => r.invoice_id}
        paginationMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[25, 50, 100]}
      />
    </ReportShell>
  );
}
