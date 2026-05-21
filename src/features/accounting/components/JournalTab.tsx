import { Box, Chip } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import AccountingFilterBar from "./AccountingFilterBar";
import { useAccountingFilters } from "../hooks/useAccountingFilters";
import { useTransactionJournal } from "../hooks/useAccountingQueries";
import { useCurrencyFormatter } from "../utils/currency";
import { formatDisplayDate } from "@/lib/dates";

export default function JournalTab() {
  const { filters, updateFilter, updateMultiple, resetFilters, setPage, setPageSize, toQueryParams } =
    useAccountingFilters({ sortField: "date" });
  const { format } = useCurrencyFormatter();
  const { data, isLoading } = useAccountingJournalWithBalance(toQueryParams());

  const columns: GridColDef[] = [
    {
      field: "date",
      headerName: "Date",
      width: 120,
      valueFormatter: (value: string) => formatDisplayDate(value),
    },
    {
      field: "type",
      headerName: "Type",
      width: 120,
      renderCell: (p) => {
        const isIncome = p.value === "income";
        return (
          <Chip
            label={isIncome ? "INCOME" : "EXPENSE"}
            color={isIncome ? "success" : "error"}
            size="small"
            icon={isIncome ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
            sx={{ fontSize: "0.65rem", fontWeight: 700, height: 24, ".MuiChip-icon": { fontSize: 14 } }}
          />
        );
      },
    },
    {
      field: "description",
      headerName: "Description",
      flex: 1,
      minWidth: 200,
    },
    {
      field: "reference",
      headerName: "Ref",
      width: 110,
      renderCell: (p) => (
        <Chip label={p.value} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: "0.65rem", height: 22 }} />
      ),
    },
    {
      field: "category",
      headerName: "Category/Method",
      width: 150,
      renderCell: (p) => (
        <Chip label={p.value || "—"} size="small" sx={{ fontSize: "0.7rem", height: 22, bgcolor: "#f1f5f9" }} />
      ),
    },
    {
      field: "amount",
      headerName: "Amount",
      width: 140,
      align: "right",
      headerAlign: "right",
      renderCell: (p) => {
        const isIncome = p.row.type === "income";
        return (
          <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, color: isIncome ? "#16a34a" : "#dc2626" }}>
            {isIncome ? "+" : "-"}{format(p.value)}
          </span>
        );
      },
    },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <AccountingFilterBar
        filters={filters}
        onUpdate={updateFilter}
        onUpdateMultiple={updateMultiple}
        onReset={resetFilters}
        show={{ type: true, dateRange: true, datePresets: true, amountRange: true }}
      />
      <Box sx={{ bgcolor: "white", borderRadius: 2.5, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <DataGrid
          rows={data?.rows || []}
          columns={columns}
          getRowId={(row) => `${row.type}-${row.id}`}
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
            "& .MuiDataGrid-row": {
              "&:hover": { bgcolor: "#f8fafc" },
            },
          }}
        />
      </Box>
    </Box>
  );
}

// Wrapper hook to inject running balance (optional client-side calculation for visual)
function useAccountingJournalWithBalance(params: any) {
  const result = useTransactionJournal(params);
  // Optional: calculate running balance if needed, but for now we just return the raw result
  return result;
}
