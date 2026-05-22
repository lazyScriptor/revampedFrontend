import { useState, useMemo, useEffect } from "react";
import { useCustomerList } from "@/features/customers/hooks/useCustomerHooks";
import type { CustomerFilters } from "@/features/customers/hooks/useCustomerHooks";
import { CustomerTable } from "@/features/customers/components/CustomerTable";
import { CustomerFormDialog } from "@/features/customers/components/CustomerFormDialog";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";

// Debounce search input so we don't pound the API on every keystroke.
function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function CustomersRoute() {
  const theme = useTheme();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 20 });

  // ─── Filter state ───────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounced(searchInput, 300);
  const [type, setType] = useState<"" | "Individual" | "Business">("");
  const [status, setStatus] = useState<"" | "Active" | "Blacklisted">("");
  const [idRetained, setIdRetained] = useState<"" | "true">("");
  const [hasParent, setHasParent] = useState<"" | "true">("");

  const filters: CustomerFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      customer_type: type || undefined,
      status: status || undefined,
      id_retained: idRetained || undefined,
      has_parent: hasParent || undefined,
    }),
    [debouncedSearch, type, status, idRetained, hasParent],
  );

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setPaginationModel((m) => (m.page === 0 ? m : { ...m, page: 0 }));
  }, [debouncedSearch, type, status, idRetained, hasParent]);

  const { data: response, isLoading, isError, error } = useCustomerList(
    paginationModel.page + 1,
    paginationModel.pageSize,
    filters,
  );

  const customerList = response?.customers || [];
  const totalRowCount = response?.totalItems || 0;

  const activeFilterCount =
    (type ? 1 : 0) + (status ? 1 : 0) + (idRetained ? 1 : 0) + (hasParent ? 1 : 0);

  const clearFilters = () => {
    setSearchInput("");
    setType("");
    setStatus("");
    setIdRetained("");
    setHasParent("");
  };

  // Live KPIs over the current page (the totals stay correct because they come
  // from the paginated `totalRowCount` from the API)
  const { idsInVault, totalAdvance, businessCount, delegatedCount } = useMemo(() => {
    let ids = 0;
    let advance = 0;
    let businesses = 0;
    let delegated = 0;
    customerList.forEach((c: any) => {
      if (c.is_id_retained_currently) ids++;
      if (c.deposit_balance) advance += Number(c.deposit_balance);
      if (c.customer_type === "Business") businesses++;
      if (c.parent_customer_id) delegated++;
    });
    return { idsInVault: ids, totalAdvance: advance, businessCount: businesses, delegatedCount: delegated };
  }, [customerList]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };
  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setTimeout(() => setEditingItem(null), 300);
  };

  if (isError) {
    return (
      <Alert severity="error" className="m-4">
        Error loading customers: {error instanceof Error ? error.message : "Unknown error"}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Typography variant="h4" fontWeight="bold" color="text.primary">
            Client CRM
          </Typography>
          <Typography variant="body2" color="text.secondary" className="mt-1">
            Manage your individual renters, corporate clients, and retained collateral.
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          disableElevation
          sx={{ py: 1.5, px: 3, borderRadius: 2 }}
        >
          Add Customer
        </Button>
      </div>

      {/* KPI Dashboard */}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} className="border border-slate-200 rounded-xl bg-white h-full">
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <PeopleAltIcon fontSize="large" />
              </div>
              <div>
                <Typography variant="body2" color="text.secondary" fontWeight="500">
                  Total Clients
                </Typography>
                <Typography variant="h5" fontWeight="bold">{totalRowCount}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {businessCount} business · {customerList.length - businessCount} individual (this page)
                </Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} className="border border-slate-200 rounded-xl bg-white h-full">
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                <AccountTreeIcon fontSize="large" />
              </div>
              <div>
                <Typography variant="body2" color="text.secondary" fontWeight="500">
                  Linked to a Parent
                </Typography>
                <Typography variant="h5" fontWeight="bold">{delegatedCount}</Typography>
                <Typography variant="caption" color="text.secondary">on this page</Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} className="border border-red-200 rounded-xl bg-red-50/30 h-full">
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                <VerifiedUserIcon fontSize="large" />
              </div>
              <div>
                <Typography variant="body2" color="text.secondary" fontWeight="500">
                  IDs Currently in Vault
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="error.dark">{idsInVault}</Typography>
                <Typography variant="caption" color="text.secondary">on this page</Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} className="border border-slate-200 rounded-xl bg-white h-full">
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                <AccountBalanceWalletIcon fontSize="large" />
              </div>
              <div>
                <Typography variant="body2" color="text.secondary" fontWeight="500">
                  Total Advance Held
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  Rs. {totalAdvance.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">on this page</Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter / search bar */}
      <Card
        elevation={0}
        sx={{
          border: `1px solid ${theme.palette.border.subtle}`,
          borderRadius: 2.5,
          p: { xs: 1.5, sm: 2 },
          display: "flex",
          flexWrap: "wrap",
          gap: 1.25,
          alignItems: "center",
        }}
      >
        <TextField
          size="small"
          placeholder="Search name, company, phone, or NIC…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          sx={{ minWidth: { xs: "100%", sm: 320 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlinedIcon sx={{ fontSize: 18, color: theme.palette.text.disabled }} />
                </InputAdornment>
              ),
              endAdornment: searchInput ? (
                <InputAdornment position="end">
                  <Tooltip title="Clear">
                    <ClearOutlinedIcon
                      onClick={() => setSearchInput("")}
                      sx={{ fontSize: 16, color: theme.palette.text.disabled, cursor: "pointer" }}
                    />
                  </Tooltip>
                </InputAdornment>
              ) : null,
            },
          }}
        />

        {/* Type chips */}
        <FilterChipGroup
          label="Type"
          value={type}
          onChange={(v) => setType(v as any)}
          options={[
            { value: "", label: "All" },
            { value: "Individual", label: "Individual" },
            { value: "Business", label: "Business" },
          ]}
        />

        {/* Status chips */}
        <FilterChipGroup
          label="Status"
          value={status}
          onChange={(v) => setStatus(v as any)}
          options={[
            { value: "", label: "All" },
            { value: "Active", label: "Active", color: theme.palette.success.main },
            { value: "Blacklisted", label: "Blacklisted", color: theme.palette.error.main },
          ]}
        />

        {/* Toggle chips */}
        <Chip
          label="ID in vault"
          onClick={() => setIdRetained((v) => (v === "true" ? "" : "true"))}
          size="small"
          icon={<VerifiedUserIcon sx={{ fontSize: "14px !important" }} />}
          sx={{
            fontWeight: 700,
            height: 28,
            cursor: "pointer",
            color: idRetained === "true" ? theme.palette.error.contrastText : theme.palette.text.secondary,
            bgcolor: idRetained === "true" ? theme.palette.error.main : "transparent",
            border: `1px solid ${idRetained === "true" ? theme.palette.error.main : theme.palette.border.subtle}`,
            "&:hover": {
              bgcolor: idRetained === "true" ? theme.palette.error.dark : alpha(theme.palette.error.main, 0.08),
            },
          }}
        />
        <Chip
          label="Has parent"
          onClick={() => setHasParent((v) => (v === "true" ? "" : "true"))}
          size="small"
          icon={<AccountTreeIcon sx={{ fontSize: "14px !important" }} />}
          sx={{
            fontWeight: 700,
            height: 28,
            cursor: "pointer",
            color: hasParent === "true" ? theme.palette.primary.contrastText : theme.palette.text.secondary,
            bgcolor: hasParent === "true" ? theme.palette.primary.main : "transparent",
            border: `1px solid ${hasParent === "true" ? theme.palette.primary.main : theme.palette.border.subtle}`,
            "&:hover": {
              bgcolor:
                hasParent === "true" ? theme.palette.primary.dark : alpha(theme.palette.primary.main, 0.08),
            },
          }}
        />

        <Box sx={{ flex: 1 }} />

        {activeFilterCount > 0 || debouncedSearch ? (
          <Button
            size="small"
            color="inherit"
            startIcon={<FilterAltOutlinedIcon />}
            onClick={clearFilters}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Clear {activeFilterCount + (debouncedSearch ? 1 : 0)} filter
            {activeFilterCount + (debouncedSearch ? 1 : 0) > 1 ? "s" : ""}
          </Button>
        ) : null}

        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, ml: 0.5 }}>
          {isLoading ? "Loading…" : `${totalRowCount.toLocaleString()} match${totalRowCount === 1 ? "" : "es"}`}
        </Typography>
      </Card>

      {/* Data Table */}
      <Card elevation={0} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading && customerList.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <CustomerTable
            data={customerList}
            isLoading={isLoading}
            rowCount={totalRowCount}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            onEdit={handleOpenEdit}
          />
        )}
      </Card>

      <CustomerFormDialog open={isDialogOpen} onClose={handleCloseDialog} initialData={editingItem} />
    </div>
  );
}

// ─── Filter chip group ─────────────────────────────────────────────────────
interface FilterChipGroupProps {
  label: string;
  value: string;
  options: { value: string; label: string; color?: string }[];
  onChange: (next: string) => void;
}
function FilterChipGroup({ label, value, options, onChange }: FilterChipGroupProps) {
  const theme = useTheme();
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      <Typography
        variant="caption"
        sx={{
          color: theme.palette.text.disabled,
          fontSize: "0.62rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          mr: 0.25,
        }}
      >
        {label}
      </Typography>
      {options.map((opt) => {
        const active = value === opt.value;
        const accent = opt.color || theme.palette.primary.main;
        return (
          <Chip
            key={opt.value || "all"}
            label={opt.label}
            onClick={() => onChange(opt.value)}
            size="small"
            sx={{
              fontWeight: 700,
              height: 26,
              cursor: "pointer",
              color: active ? "#fff" : theme.palette.text.secondary,
              bgcolor: active ? accent : "transparent",
              border: `1px solid ${active ? accent : theme.palette.border.subtle}`,
              "&:hover": {
                bgcolor: active ? accent : alpha(accent, 0.08),
                borderColor: accent,
              },
            }}
          />
        );
      })}
    </Box>
  );
}
