import { useMemo, useState } from "react";
import { Box, Typography, Chip, Avatar, ToggleButtonGroup, ToggleButton } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import BusinessIcon from "@mui/icons-material/Business";
import { ReportShell } from "@/components/reports/ReportShell";
import { DateRangeFilter } from "@/components/reports/DateRangeFilter";
import { StatTable } from "@/components/reports/StatTable";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { useRentalHistoryReport } from "../hooks/useReportsHooks";
import { todayLocalStr, addDaysLocal, formatDisplayDate } from "@/lib/dates";

const formatCurrency = (n: number) => `Rs. ${Number(n || 0).toLocaleString()}`;

const isOverdue = (inv: any) =>
  inv.status === "Active" &&
  (inv.InvoiceLines || inv.invoice_lines || []).some(
    (l: any) =>
      l.line_status === "Active" &&
      l.actual_return_date == null &&
      l.expected_return_date && new Date(l.expected_return_date) < new Date(),
  );

export default function RentalHistoryReport() {
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
      const name = c.customer_type === "Business" && c.company_name
        ? c.company_name
        : `${c.first_name || ""} ${c.last_name || ""}`.trim();
      lines.push([
        `INV-${r.invoice_id}`,
        `"${name}"`,
        r.issued_date,
        Number(r.total_amount || 0).toFixed(2),
        r.status,
      ].join(","));
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
      headerName: "Invoice",
      width: 110,
      renderCell: (p) => <Typography sx={{ fontWeight: 700 }}>INV-{p.value}</Typography>,
    },
    {
      field: "customer",
      headerName: "Customer",
      flex: 1.4,
      minWidth: 240,
      renderCell: (p) => {
        const c = p.row.Customer || {};
        const isBusiness = c.customer_type === "Business";
        const name = isBusiness && c.company_name
          ? c.company_name
          : `${c.first_name || ""} ${c.last_name || ""}`.trim();
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Avatar sx={{ width: 30, height: 30, bgcolor: isBusiness ? "primary.main" : "#475569", fontSize: "0.8rem" }}>
              {isBusiness ? <BusinessIcon fontSize="small" /> : (c.first_name?.[0] || "?")}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>{name || "—"}</Typography>
              <Typography variant="caption" color="text.secondary">{c.phone_number}</Typography>
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
      width: 140,
      type: "number",
      renderCell: (p) => (
        <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(Number(p.value))}</Typography>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      renderCell: (p) => {
        const overdue = isOverdue(p.row);
        const label = overdue ? "Overdue" : p.value;
        const color: any = overdue ? "error" : p.value === "Completed" ? "success" : "primary";
        return <Chip size="small" label={label} color={color} sx={{ fontWeight: 700 }} />;
      },
    },
  ];

  return (
    <ReportShell
      title="Rental History"
      subtitle="Read-only invoice timeline for the period"
      actionsSlot={<ExportMenu onExport={(f) => f === "csv" ? downloadCsv() : undefined} />}
      filterSlot={
        <Box sx={{ display: "flex", gap: 2.5, flexWrap: "wrap", alignItems: "flex-end" }}>
          <DateRangeFilter from={range.from} to={range.to} onChange={setRange} />
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", letterSpacing: 0.5, display: "block", mb: 0.75 }}>
              STATUS
            </Typography>
            <ToggleButtonGroup
              value={status}
              exclusive
              size="small"
              onChange={(_, v) => v && setStatus(v)}
            >
              <ToggleButton value="All">All</ToggleButton>
              <ToggleButton value="Active">Active</ToggleButton>
              <ToggleButton value="Completed">Completed</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      }
    >
      <StatTable
        rows={rows}
        columns={columns}
        loading={isLoading || isFetching}
        getRowId={(r) => r.invoice_id}
        paginationMode="server"
        rowCount={rowCount}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[10, 25, 50, 100]}
      />
    </ReportShell>
  );
}
