import { Box, Chip } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import AccountingFilterBar from "./AccountingFilterBar";
import { useAccountingFilters } from "../hooks/useAccountingFilters";
import { useAccountingInvoices } from "../hooks/useAccountingQueries";
import { useCurrencyFormatter } from "../utils/currency";

const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Completed", label: "Completed" },
  { value: "Settled", label: "Settled" },
  { value: "Overdue", label: "Overdue" },
];

const STATUS_COLORS: Record<string, "primary" | "success" | "error" | "default" | "warning"> = {
  Active: "primary",
  Completed: "success",
  Settled: "default",
  Overdue: "error",
};

export default function InvoicesTab() {
  const { filters, updateFilter, updateMultiple, resetFilters, setPage, setPageSize, toQueryParams } =
    useAccountingFilters({ sortField: "issued_date" });
  const { format } = useCurrencyFormatter();
  const { data, isLoading } = useAccountingInvoices(toQueryParams());

  const columns: GridColDef[] = [
    {
      field: "invoice_id",
      headerName: "Invoice #",
      width: 100,
      renderCell: (p) => (
        <Chip label={`INV-${p.value}`} size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: "0.72rem" }} />
      ),
    },
    {
      field: "issued_date",
      headerName: "Date",
      width: 120,
      valueFormatter: (value: string) => value ? new Date(value).toLocaleDateString() : "—",
    },
    {
      field: "Customer",
      headerName: "Customer",
      width: 200,
      sortable: false,
      valueGetter: (_value: any, row: any) => {
        const c = row.Customer;
        if (!c) return "—";
        return c.customer_type === "Business" ? c.company_name : `${c.first_name} ${c.last_name}`;
      },
    },
    {
      field: "number_of_days_of_the_bill",
      headerName: "Days",
      width: 80,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "total_amount",
      headerName: "Total",
      width: 130,
      align: "right",
      headerAlign: "right",
      renderCell: (p) => (
        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
          {format(p.value)}
        </span>
      ),
    },
    {
      field: "total_paid",
      headerName: "Paid",
      width: 130,
      align: "right",
      headerAlign: "right",
      renderCell: (p) => (
        <span style={{ fontVariantNumeric: "tabular-nums", color: "#16a34a", fontWeight: 600 }}>
          {format(p.value)}
        </span>
      ),
    },
    {
      field: "outstanding",
      headerName: "Outstanding",
      width: 130,
      align: "right",
      headerAlign: "right",
      renderCell: (p) => (
        <span
          style={{
            fontVariantNumeric: "tabular-nums",
            fontWeight: 700,
            color: p.value > 0 ? "#dc2626" : "#16a34a",
          }}
        >
          {format(p.value)}
        </span>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      renderCell: (p) => (
        <Chip
          label={p.value}
          color={STATUS_COLORS[p.value] || "default"}
          size="small"
          sx={{ fontSize: "0.7rem", fontWeight: 600, height: 24 }}
        />
      ),
    },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <AccountingFilterBar
        filters={filters}
        onUpdate={updateFilter}
        onUpdateMultiple={updateMultiple}
        onReset={resetFilters}
        show={{ search: true, dateRange: true, datePresets: true, status: true, amountRange: true }}
        statusOptions={STATUS_OPTIONS}
      />
      <Box sx={{ bgcolor: "white", borderRadius: 2.5, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <DataGrid
          rows={data?.rows || []}
          columns={columns}
          getRowId={(row) => row.invoice_id}
          loading={isLoading}
          rowCount={data?.totalCount || 0}
          paginationMode="server"
          paginationModel={{ page: filters.page - 1, pageSize: filters.pageSize }}
          onPaginationModelChange={(model) => {
            updateMultiple({ page: model.page + 1, pageSize: model.pageSize });
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          disableRowSelectionOnClick
          autoHeight
          density="compact"
          sx={{
            border: 0,
            "& .MuiDataGrid-columnHeaders": { bgcolor: "#f8fafc" },
            "& .MuiDataGrid-cell": { fontSize: "0.78rem" },
            "& .MuiDataGrid-columnHeaderTitle": { fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" },
          }}
        />
      </Box>
    </Box>
  );
}
