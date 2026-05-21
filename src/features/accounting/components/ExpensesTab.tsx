import { useState } from "react";
import {
  Box, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Tooltip,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import AccountingFilterBar from "./AccountingFilterBar";
import { useAccountingFilters } from "../hooks/useAccountingFilters";
import { todayLocalStr, formatDisplayDate, formatLocalDate } from "@/lib/dates";
import { useAccountingExpenses } from "../hooks/useAccountingQueries";
import { useCurrencyFormatter } from "../utils/currency";
import { useToast } from "@/components/ui/AppToast";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

const EXPENSE_CATEGORIES = [
  { value: "Operational", label: "Operational" },
  { value: "Repair", label: "Repair" },
  { value: "Asset Purchase", label: "Asset Purchase" },
  { value: "Other", label: "Other" },
];

const CATEGORY_COLORS: Record<string, "primary" | "secondary" | "warning" | "default"> = {
  Operational: "primary",
  Repair: "warning",
  "Asset Purchase": "secondary",
  Other: "default",
};

const EMPTY_FORM = {
  category: "Operational",
  amount: "",
  date: todayLocalStr(),
  description: "",
};

export default function ExpensesTab() {
  const { filters, updateFilter, updateMultiple, resetFilters, setPage, setPageSize, toQueryParams } =
    useAccountingFilters({ sortField: "date" });
  const { format } = useCurrencyFormatter();
  const { data, isLoading } = useAccountingExpenses(toQueryParams());
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (row: any) => {
    setEditingId(row.expense_id);
    setForm({
      category: row.category,
      amount: String(row.amount),
      date: row.date ? formatLocalDate(new Date(row.date)) : "",
      description: row.description || "",
    });
    setFormOpen(true);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["accounting-expenses"] });
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    queryClient.invalidateQueries({ queryKey: ["report-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["report-pnl"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        category: form.category,
        amount: parseFloat(form.amount),
        date: form.date,
        description: form.description,
      };
      if (editingId) {
        return api.patch(`/expenses/${editingId}`, payload);
      }
      return api.post("/expenses", payload);
    },
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
      showSuccess(editingId ? "Expense updated." : "Expense recorded.");
    },
    onError: (err: any) => showError(err.message || "Failed to save expense."),
  });

  const handleDelete = async (id: number, desc: string) => {
    const confirmed = await confirm({
      title: "Delete Expense",
      message: `Are you sure you want to delete "${desc || `EXP-${id}`}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      severity: "error",
    });
    if (!confirmed) return;
    try {
      await api.delete(`/expenses/${id}`);
      invalidate();
      showSuccess("Expense deleted.");
    } catch (err: any) {
      showError(err.message || "Failed to delete expense.");
    }
  };

  const columns: GridColDef[] = [
    {
      field: "expense_id",
      headerName: "ID",
      width: 80,
      renderCell: (p) => (
        <Chip label={`EXP-${p.value}`} size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: "0.72rem" }} />
      ),
    },
    {
      field: "date",
      headerName: "Date",
      width: 120,
      valueFormatter: (value: string) => formatDisplayDate(value),
    },
    {
      field: "category",
      headerName: "Category",
      width: 140,
      renderCell: (p) => (
        <Chip
          label={p.value}
          color={CATEGORY_COLORS[p.value] || "default"}
          size="small"
          sx={{ fontSize: "0.7rem", fontWeight: 600, height: 24 }}
        />
      ),
    },
    {
      field: "description",
      headerName: "Description",
      flex: 1,
      minWidth: 200,
    },
    {
      field: "amount",
      headerName: "Amount",
      width: 140,
      align: "right",
      headerAlign: "right",
      renderCell: (p) => (
        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "#dc2626" }}>
          {format(p.value)}
        </span>
      ),
    },
    {
      field: "Warehouse",
      headerName: "Warehouse",
      width: 140,
      sortable: false,
      valueGetter: (_value: any, row: any) => row.Warehouse?.location_name || "—",
    },
    {
      field: "User",
      headerName: "Recorded By",
      width: 130,
      sortable: false,
      valueGetter: (_value: any, row: any) => row.User?.username || "—",
    },
    {
      field: "actions",
      headerName: "",
      width: 90,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Box>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(p.row)} sx={{ color: "#2563eb" }}>
              <EditOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={() => handleDelete(p.row.expense_id, p.row.description)}
              sx={{ color: "#dc2626" }}
            >
              <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <AccountingFilterBar
            filters={filters}
            onUpdate={updateFilter}
            onUpdateMultiple={updateMultiple}
            onReset={resetFilters}
            show={{ search: true, dateRange: true, datePresets: true, category: true, amountRange: true }}
            categoryOptions={EXPENSE_CATEGORIES}
          />
        </Box>
        <Button
          variant="contained"
          size="small"
          disableElevation
          startIcon={<AddOutlinedIcon sx={{ fontSize: 16 }} />}
          onClick={openCreate}
          sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.78rem", whiteSpace: "nowrap", mt: 0.5, px: 2.5 }}
        >
          Add Expense
        </Button>
      </Box>

      <Box sx={{ bgcolor: "white", borderRadius: 2.5, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <DataGrid
          rows={data?.rows || []}
          columns={columns}
          getRowId={(row) => row.expense_id}
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

      {/* Create / Edit Expense Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight="bold">{editingId ? "Edit Expense" : "Record New Expense"}</DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          <TextField
            select
            label="Category"
            size="small"
            fullWidth
            value={form.category}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Amount"
            size="small"
            fullWidth
            type="number"
            value={form.amount}
            onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
          />
          <TextField
            label="Date"
            size="small"
            fullWidth
            type="date"
            value={form.date}
            onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Description"
            size="small"
            fullWidth
            multiline
            rows={2}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setFormOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            disableElevation
            disabled={!form.amount || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog />
    </Box>
  );
}
