import { Box, Chip } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import AccountingFilterBar from "./AccountingFilterBar";
import { useAccountingFilters } from "../hooks/useAccountingFilters";
import { useAccountingPayments } from "../hooks/useAccountingQueries";
import { useCurrencyFormatter } from "../utils/currency";

const METHOD_OPTIONS = [
  { value: "Cash", label: "Cash" },
  { value: "Card", label: "Card" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Cheque", label: "Cheque" },
  { value: "Online", label: "Online" },
];

const METHOD_COLORS: Record<string, "success" | "primary" | "secondary" | "warning" | "info"> = {
  Cash: "success",
  Card: "primary",
  "Bank Transfer": "secondary",
  Cheque: "warning",
  Online: "info",
};

export default function PaymentsTab() {
  const { filters, updateFilter, updateMultiple, resetFilters, setPage, setPageSize, toQueryParams } =
    useAccountingFilters({ sortField: "payment_date" });
  const { format } = useCurrencyFormatter();
  const { data, isLoading } = useAccountingPayments(toQueryParams());

  const columns: GridColDef[] = [
    {
      field: "payment_id",
      headerName: "Payment #",
      width: 100,
      renderCell: (p) => (
        <Chip label={`PAY-${p.value}`} size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: "0.72rem" }} />
      ),
    },
    {
      field: "payment_date",
      headerName: "Date",
      width: 120,
      valueFormatter: (value: string) => value ? new Date(value).toLocaleDateString() : "—",
    },
    {
      field: "invoice_id",
      headerName: "Invoice Ref",
      width: 110,
      renderCell: (p) => (
        <Chip
          label={`INV-${p.row.Invoice?.invoice_id || p.value}`}
          size="small"
          color="default"
          sx={{ fontWeight: 600, fontSize: "0.7rem" }}
        />
      ),
    },
    {
      field: "customer",
      headerName: "Customer",
      width: 200,
      sortable: false,
      valueGetter: (_value: any, row: any) => {
        const c = row.Invoice?.Customer;
        if (!c) return "—";
        return c.customer_type === "Business" ? c.company_name : `${c.first_name} ${c.last_name}`;
      },
    },
    {
      field: "payment_amount",
      headerName: "Amount",
      width: 150,
      align: "right",
      headerAlign: "right",
      renderCell: (p) => (
        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "#16a34a" }}>
          {format(p.value)}
        </span>
      ),
    },
    {
      field: "method",
      headerName: "Method",
      width: 140,
      renderCell: (p) => (
        <Chip
          label={p.value}
          color={METHOD_COLORS[p.value] || "default"}
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
        show={{ search: true, dateRange: true, datePresets: true, method: true, amountRange: true }}
        methodOptions={METHOD_OPTIONS}
      />
      <Box sx={{ bgcolor: "white", borderRadius: 2.5, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <DataGrid
          rows={data?.rows || []}
          columns={columns}
          getRowId={(row) => row.payment_id}
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
