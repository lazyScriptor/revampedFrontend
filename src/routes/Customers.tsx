import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useCustomerList, useCustomerStats } from "@/features/customers/hooks/useCustomerHooks";
import type { CustomerFilters } from "@/features/customers/hooks/useCustomerHooks";
import { CustomerTable } from "@/features/customers/components/CustomerTable";
import { CustomerFormDialog } from "@/features/customers/components/CustomerFormDialog";
import { CustomerBulkEditDialog } from "@/features/customers/components/CustomerBulkEditDialog";
import { GearGridLoader } from "@/components/ui/GearGridLoader";
import { Can } from "@/components/auth/Can";
import { ResponsiveKpiStrip } from "@/components/ui/ResponsiveKpiStrip";
import { KpiTile } from "@/components/reports/KpiTile";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
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
import EditNoteIcon from "@mui/icons-material/EditNote";

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
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 20 });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

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

  // Reset to page 1 and clear selection whenever any filter changes
  useEffect(() => {
    setPaginationModel((m) => (m.page === 0 ? m : { ...m, page: 0 }));
    setSelectedIds([]);
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

  const { data: statsData } = useCustomerStats();

  const totalClients = statsData?.totalClients ?? totalRowCount;
  const idsInVault = statsData?.idsInVault ?? 0;
  const totalAdvance = statsData?.totalAdvance ?? 0;
  const businessCount = statsData?.businessCount ?? 0;
  const individualCount = statsData?.individualCount ?? Math.max(0, totalClients - businessCount);
  const delegatedCount = statsData?.linkedToParent ?? 0;

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
        {t("pages.Customers.errorLoadingCustomers")} {error instanceof Error ? error.message : t("pages.Categories.unknownError")}
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        gap: { xs: 1.5, md: 2 },
      }}
    >
      {/* Page Header */}
      <Box
        sx={{
          flexShrink: 0,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { sm: "center" },
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        <div>
          <Typography variant="h4" fontWeight="bold" color="text.primary">
            {t("customers.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary" className="mt-1">
            {t("customers.subtitle")}
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          disableElevation
          sx={{ py: 1.25, px: 2.5, borderRadius: 2 }}
        >
          {t("customers.addCustomer")}
        </Button>
      </Box>

      {/* KPI Dashboard */}
      <ResponsiveKpiStrip mobileLabel={t("pages.Customers.customerOverview")}>
        <KpiTile
          label={t("customers.totalClients")}
          value={totalClients}
          hint={`${businessCount} ${t("customers.business")} · ${individualCount} ${t("customers.individual")}`}
          icon={<PeopleAltIcon />}
          tone="default"
          onClick={clearFilters}
          active={activeFilterCount === 0 && !debouncedSearch}
          compact
          badge={
            activeFilterCount > 0 || debouncedSearch ? (
              <Chip
                label={t("common.matches", { count: totalRowCount })}
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(56, 189, 248, 0.2)" : "#eff6ff"),
                  color: (t) => (t.palette.mode === "dark" ? "#38bdf8" : "#1d4ed8"),
                }}
              />
            ) : null
          }
        />

        <KpiTile
          label={t("customers.linkedToParent")}
          value={delegatedCount}
          hint={t("pages.Customers.corporateStaffAccounts")}
          icon={<AccountTreeIcon />}
          tone="info"
          onClick={() => setHasParent((v) => (v === "true" ? "" : "true"))}
          active={hasParent === "true"}
          compact
          badge={
            hasParent === "true" ? (
              <Chip
                label={t("pages.Customers.filtered")}
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(99, 102, 241, 0.2)" : "#e0e7ff"),
                  color: (t) => (t.palette.mode === "dark" ? "#818cf8" : "#3730a3"),
                }}
              />
            ) : null
          }
        />

        <KpiTile
          label={t("customers.idsInVault")}
          value={idsInVault}
          hint={idRetained === "true" ? t("pages.Customers.filteredVaultClients") : t("pages.Customers.idCardCollateralInVault")}
          icon={<VerifiedUserIcon />}
          tone="error"
          onClick={() => setIdRetained((v) => (v === "true" ? "" : "true"))}
          active={idRetained === "true"}
          compact
          badge={
            idRetained === "true" ? (
              <Chip
                label={t("common.active")}
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  bgcolor: "error.main",
                  color: "#ffffff",
                }}
              />
            ) : null
          }
        />

        <KpiTile
          label={t("customers.totalAdvanceHeld")}
          value={`Rs. ${totalAdvance.toLocaleString()}`}
          hint={t("pages.Customers.activeClientAdvanceBalances")}
          icon={<AccountBalanceWalletIcon />}
          tone="success"
          compact
        />
      </ResponsiveKpiStrip>

      {/* Filter / search bar */}
      <Card
        elevation={0}
        sx={{
          flexShrink: 0,
          border: `1px solid ${theme.palette.border.subtle}`,
          borderRadius: 2.5,
          p: { xs: 1.25, sm: 1.5 },
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 1.25,
          alignItems: { xs: "stretch", sm: "center" },
          bgcolor: theme.palette.background.paper,
        }}
      >
        <TextField
          size="small"
          placeholder={t("customers.searchPlaceholder")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          sx={{
            width: { xs: "100%", sm: 260, md: 320 },
            flexShrink: 0,
            "& .MuiInputBase-input": { fontSize: "0.84rem", py: 0.8 },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlinedIcon sx={{ fontSize: 18, color: theme.palette.text.disabled }} />
                </InputAdornment>
              ),
              endAdornment: searchInput ? (
                <InputAdornment position="end">
                  <Tooltip title={t("common.clear")}>
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

        {/* Swipeable Filter Chips on Mobile, Inline on Desktop */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            overflowX: { xs: "auto", sm: "visible" },
            flexWrap: { xs: "nowrap", sm: "wrap" },
            pb: { xs: 0.5, sm: 0 },
            "&::-webkit-scrollbar": { height: 3 },
            "&::-webkit-scrollbar-thumb": { background: theme.palette.border.subtle, borderRadius: 3 },
            "& > *": { flexShrink: 0 },
            flex: 1,
          }}
        >
          {/* Type chips */}
          <FilterChipGroup
            label={t("common.type")}
            value={type}
            onChange={(v) => setType(v as any)}
            options={[
              { value: "", label: t("common.all") },
              { value: "Individual", label: t("customers.individual") },
              { value: "Business", label: t("customers.business") },
            ]}
          />

          {/* Status chips */}
          <FilterChipGroup
            label={t("common.status")}
            value={status}
            onChange={(v) => setStatus(v as any)}
            options={[
              { value: "", label: t("common.all") },
              { value: "Active", label: t("common.active"), color: theme.palette.success.main },
              { value: "Blacklisted", label: t("customers.blacklisted"), color: theme.palette.error.main },
            ]}
          />

          {/* Toggle chips */}
          <Chip
            label={t("customers.idInVault")}
            onClick={() => setIdRetained((v) => (v === "true" ? "" : "true"))}
            size="small"
            icon={<VerifiedUserIcon sx={{ fontSize: "14px !important" }} />}
            sx={{
              fontWeight: 700,
              height: 26,
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
            label={t("customers.hasParent")}
            onClick={() => setHasParent((v) => (v === "true" ? "" : "true"))}
            size="small"
            icon={<AccountTreeIcon sx={{ fontSize: "14px !important" }} />}
            sx={{
              fontWeight: 700,
              height: 26,
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

          {activeFilterCount > 0 || debouncedSearch ? (
            <Button
              size="small"
              color="inherit"
              startIcon={<FilterAltOutlinedIcon />}
              onClick={clearFilters}
              sx={{ textTransform: "none", fontWeight: 700, ml: { sm: "auto" } }}
            >
              {t("superAdmin.InquiryListPanel.clearFilters")}
            </Button>
          ) : null}
        </Box>

        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, whiteSpace: "nowrap", flexShrink: 0 }}>
          {isLoading ? t("common.loading") : t("common.matchesFormatted", { count: totalRowCount })}
        </Typography>
      </Card>

      {/* Data Table */}
      <Card
        elevation={0}
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          border: `1px solid ${theme.palette.border.subtle}`,
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
          bgcolor: "background.paper",
        }}
      >
        {isLoading && customerList.length === 0 ? (
          <GearGridLoader centered size="lg" label={t("pages.Customers.loadingClientAccounts")} sublabel={t("pages.Customers.retrievingCustomerRecordsCreditBalances")} />
        ) : (
          <CustomerTable
            data={customerList}
            isLoading={isLoading}
            rowCount={totalRowCount}
            paginationModel={paginationModel}
            onPaginationModelChange={(model) => {
              setPaginationModel(model);
              setSelectedIds([]);
            }}
            onEdit={handleOpenEdit}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        )}
      </Card>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <Box
          sx={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1200,
            bgcolor: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(8px)",
            color: "#fff",
            px: 2.5,
            py: 1.25,
            borderRadius: 9999,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: 2,
            border: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              label={selectedIds.length}
              size="small"
              sx={{
                bgcolor: theme.palette.primary.main,
                color: "#fff",
                fontWeight: 800,
                height: 22,
                minWidth: 22,
              }}
            />
            <Typography variant="body2" sx={{ fontWeight: 600, color: "#fff" }}>
              {t("pages.Customers.clientsSelected", { count: selectedIds.length })}
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.2)" }} />

          <Can perform={["customer:bulk_edit", "customer:edit"]}>
            <Button
              variant="contained"
              size="small"
              startIcon={<EditNoteIcon />}
              onClick={() => setIsBulkEditOpen(true)}
              sx={{
                bgcolor: theme.palette.primary.main,
                "&:hover": { bgcolor: theme.palette.primary.dark },
                fontWeight: 700,
                borderRadius: 9999,
                textTransform: "none",
                px: 2,
              }}
            >
              {t("pages.Customers.bulkEdit")}
            </Button>
          </Can>

          <Button
            variant="text"
            size="small"
            onClick={() => setSelectedIds([])}
            sx={{
              color: "rgba(255, 255, 255, 0.7)",
              "&:hover": { color: "#fff", bgcolor: "rgba(255, 255, 255, 0.08)" },
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 9999,
            }}
          >
            {t("pages.Customers.deselectAll")}
          </Button>
        </Box>
      )}

      <CustomerFormDialog open={isDialogOpen} onClose={handleCloseDialog} initialData={editingItem} />

      <CustomerBulkEditDialog
        open={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        selectedIds={selectedIds}
        onSuccess={() => setSelectedIds([])}
      />
    </Box>
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
