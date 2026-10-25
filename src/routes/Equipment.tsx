import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useEquipmentList, useEquipmentStats, useConvertEquipmentNamesToSinhala } from "@/features/equipment/hooks/useEquipmentHooks";
import { useCategoryList } from "@/features/equipment/hooks/useCategoryHooks";
import type { EquipmentFilters } from "@/features/equipment/api/equipment.api";

import { EquipmentTable } from "@/features/equipment/components/EquipmentTable";
import { EquipmentCardGrid } from "@/features/equipment/components/EquipmentCardGrid";
import { EquipmentCardSettings } from "@/features/equipment/components/EquipmentCardSettings";
import {
  readEquipmentView,
  saveEquipmentView,
  useEquipmentCardConfig,
  type EquipmentView,
} from "@/features/equipment/lib/equipmentCardFields";
import { EquipmentFormDialog } from "@/features/equipment/components/EquipmentFormDialog";
import { EquipmentBulkEditDialog } from "@/features/equipment/components/EquipmentBulkEditDialog";
import { GearGridLoader } from "@/components/ui/GearGridLoader";
import { Can } from "@/components/auth/Can";
import { useToast } from "@/components/ui/AppToast";
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
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import InventoryIcon from "@mui/icons-material/Inventory2";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import EditNoteIcon from "@mui/icons-material/EditNote";
import TranslateIcon from "@mui/icons-material/Translate";
import ViewListRoundedIcon from "@mui/icons-material/ViewListRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";

// Debounce search input so we don't pound the API on every keystroke.
function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

type AvailabilityKey = "all" | "in_stock" | "rented" | "in_repair";

export default function EquipmentRoute() {
  const theme = useTheme();
  const { t } = useTranslation();
  const toast = useToast();
  const convertNames = useConvertEquipmentNamesToSinhala();
  const runConvert = (ids?: number[]) =>
    convertNames.mutate(
      { ids },
      {
        onSuccess: (r) =>
          r.total === 0
            ? toast.showInfo(t("equipment.convertNothing"))
            : toast.showSuccess(t("equipment.convertDone", { converted: r.converted, total: r.total })),
        onError: (e: any) => toast.showError(e?.message || t("equipment.convertFailed")),
      },
    );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 20 });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

  // Table or card view (remembered per browser); the card view's details are configurable.
  const [view, setView] = useState<EquipmentView>(readEquipmentView);
  const cardConfig = useEquipmentCardConfig();
  const changeView = (next: EquipmentView | null) => {
    if (!next || next === view) return;
    setView(next);
    saveEquipmentView(next);
  };

  // ─── Filter state ──────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounced(searchInput, 300);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [availability, setAvailability] = useState<AvailabilityKey>("all");

  const filters: EquipmentFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      category_id: categoryId || undefined,
      availability: availability !== "all" ? availability : undefined,
    }),
    [debouncedSearch, categoryId, availability],
  );

  // Reset to page 1 and clear selection when filters change
  useEffect(() => {
    setPaginationModel((m) => (m.page === 0 ? m : { ...m, page: 0 }));
    setSelectedIds([]);
  }, [debouncedSearch, categoryId, availability]);

  // Categories for the dropdown (large limit; categories list is small)
  const { data: categoriesResponse } = useCategoryList(1, 500);
  const categories: any[] =
    (categoriesResponse as any)?.categories ||
    (categoriesResponse as any)?.data?.categories ||
    [];

  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useEquipmentList(paginationModel.page + 1, paginationModel.pageSize, filters);

  const equipmentList = response?.equipment || [];
  const totalRowCount = Number(response?.total || 0);

  // Global stats from dedicated fast aggregate backend API
  const { data: statsData } = useEquipmentStats();

  const totalAssetsOwned = statsData?.totalUnitsOwned ?? totalRowCount;
  const totalModelsCount = statsData?.totalModels ?? 0;
  const availableUnits = statsData?.availableUnits ?? 0;
  const maintenanceUnits = statsData?.maintenanceUnits ?? 0;
  const rentedUnits = statsData?.rentedUnits ?? 0;

  const activeFilterCount =
    (categoryId ? 1 : 0) + (availability !== "all" ? 1 : 0) + (debouncedSearch ? 1 : 0);

  const clearFilters = () => {
    setSearchInput("");
    setCategoryId("");
    setAvailability("all");
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsDrawerOpen(true);
  };
  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setIsDrawerOpen(true);
  };
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setEditingItem(null), 300);
  };

  if (isError) {
    return (
      <Alert severity="error" className="m-4">
        {t("pages.Equipment.failedToLoadEquipment")} {error instanceof Error ? error.message : t("pages.Categories.unknownError")}
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
            {t("equipment.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary" className="mt-1">
            {t("equipment.subtitle")}
          </Typography>
        </div>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Can perform="equipment:edit">
            <Button
              variant="outlined"
              startIcon={convertNames.isPending ? <CircularProgress size={16} /> : <TranslateIcon />}
              onClick={() => runConvert()}
              disabled={convertNames.isPending}
              sx={{ py: 1.25, px: 2, borderRadius: 2, textTransform: "none", fontWeight: 700 }}
            >
              {convertNames.isPending ? t("equipment.converting") : t("equipment.convertAllToSinhala")}
            </Button>
          </Can>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
            disableElevation
            sx={{ py: 1.25, px: 2.5, borderRadius: 2 }}
          >
            {t("equipment.addEquipment")}
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <ResponsiveKpiStrip mobileLabel={t("pages.Equipment.equipmentOverview")}>
        <KpiTile
          label={t("equipment.totalAssets")}
          value={`${totalAssetsOwned} ${t("equipment.units")}`}
          hint={t("pages.Equipment.modelsOnRent", { totalModelsCount, rentedUnits })}
          icon={<InventoryIcon />}
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
          label={t("equipment.availableForRent")}
          value={`${availableUnits} ${t("equipment.units")}`}
          hint={t("pages.Equipment.warehouseReadyStock")}
          icon={<CheckCircleIcon />}
          tone="success"
          onClick={() => setAvailability(availability === "in_stock" ? "all" : "in_stock")}
          active={availability === "in_stock"}
          compact
          badge={
            availability === "in_stock" ? (
              <Chip
                label={t("pages.Customers.filtered")}
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(16, 185, 129, 0.2)" : "#d1fae5"),
                  color: (t) => (t.palette.mode === "dark" ? "#34d399" : "#047857"),
                }}
              />
            ) : null
          }
        />

        <KpiTile
          label={t("equipment.inMaintenance")}
          value={`${maintenanceUnits} ${t("equipment.units")}`}
          hint={t("pages.Equipment.workshopRepairQueue")}
          icon={<BuildCircleIcon />}
          tone="warning"
          onClick={() => setAvailability(availability === "in_repair" ? "all" : "in_repair")}
          active={availability === "in_repair"}
          compact
          badge={
            availability === "in_repair" ? (
              <Chip
                label={t("pages.Customers.filtered")}
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(245, 158, 11, 0.2)" : "#fef3c7"),
                  color: (t) => (t.palette.mode === "dark" ? "#fbbf24" : "#b45309"),
                }}
              />
            ) : null
          }
        />

        <KpiTile
          label={t("equipment.rented")}
          value={`${rentedUnits} ${t("equipment.units")}`}
          hint={t("pages.Equipment.activeOnCustomerHire")}
          icon={<InventoryIcon />}
          tone="info"
          onClick={() => setAvailability(availability === "rented" ? "all" : "rented")}
          active={availability === "rented"}
          compact
          badge={
            availability === "rented" ? (
              <Chip
                label={t("pages.Customers.filtered")}
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(56, 189, 248, 0.2)" : "#e0f2fe"),
                  color: (t) => (t.palette.mode === "dark" ? "#38bdf8" : "#0369a1"),
                }}
              />
            ) : null
          }
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
        <Box sx={{ display: "flex", gap: 1.25, flexDirection: { xs: "column", sm: "row" }, flexShrink: 0 }}>
          <TextField
            size="small"
            placeholder={t("equipment.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            sx={{
              width: { xs: "100%", sm: 240, md: 280 },
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

          {/* Category dropdown */}
          <TextField
            select
            size="small"
            value={categoryId}
            onChange={(e) =>
              setCategoryId(e.target.value === "" ? "" : Number(e.target.value))
            }
            sx={{
              width: { xs: "100%", sm: 180, md: 200 },
              "& .MuiInputBase-input": { fontSize: "0.84rem", py: 0.8 },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <CategoryOutlinedIcon sx={{ fontSize: 16, color: theme.palette.text.disabled }} />
                  </InputAdornment>
                ),
              },
            }}
          >
            <MenuItem value="">{t("equipment.allCategories")}</MenuItem>
            {categories.map((c: any) => (
              <MenuItem key={c.category_id} value={c.category_id}>
                {c.category_name}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {/* Availability chips in swipeable row on mobile */}
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
            {t("equipment.availability")}
          </Typography>
          {(
            [
              { value: "all", label: t("common.all"), color: theme.palette.primary.main },
              { value: "in_stock", label: t("equipment.inStock"), color: theme.palette.success.main },
              { value: "rented", label: t("equipment.rented"), color: theme.palette.info.main },
              { value: "in_repair", label: t("equipment.inRepair"), color: theme.palette.warning.main },
            ] as const
          ).map((opt) => {
            const active = availability === opt.value;
            return (
              <Chip
                key={opt.value}
                label={opt.label}
                onClick={() => setAvailability(opt.value as AvailabilityKey)}
                size="small"
                sx={{
                  fontWeight: 700,
                  height: 26,
                  cursor: "pointer",
                  color: active ? "#fff" : theme.palette.text.secondary,
                  bgcolor: active ? opt.color : "transparent",
                  border: `1px solid ${active ? opt.color : theme.palette.border.subtle}`,
                  "&:hover": {
                    bgcolor: active ? opt.color : alpha(opt.color, 0.08),
                    borderColor: opt.color,
                  },
                }}
              />
            );
          })}

          {activeFilterCount > 0 && (
            <Button
              size="small"
              color="inherit"
              startIcon={<FilterAltOutlinedIcon />}
              onClick={clearFilters}
              sx={{ textTransform: "none", fontWeight: 700, ml: { sm: "auto" } }}
            >
              {t("superAdmin.InquiryListPanel.clearFilters")}
            </Button>
          )}
        </Box>

        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, whiteSpace: "nowrap", flexShrink: 0 }}>
          {isLoading ? t("common.loading") : t("common.matchesFormatted", { count: totalRowCount })}
        </Typography>

        {/* View mode: table ⇄ cards */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0, justifyContent: { xs: "space-between", sm: "flex-end" } }}>
          {view === "cards" && (
            <EquipmentCardSettings config={cardConfig.config} onToggle={cardConfig.toggle} onReset={cardConfig.reset} />
          )}
          <ToggleButtonGroup
            exclusive
            size="small"
            value={view}
            onChange={(_, next) => changeView(next)}
            aria-label={t("equipment.cards.viewMode")}
            sx={{ "& .MuiToggleButton-root": { height: 32, px: 1.25, borderColor: theme.palette.border.subtle } }}
          >
            <ToggleButton value="table" aria-label={t("equipment.cards.tableView")} title={t("equipment.cards.tableView")}>
              <ViewListRoundedIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="cards" aria-label={t("equipment.cards.cardView")} title={t("equipment.cards.cardView")}>
              <GridViewRoundedIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
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
        {isLoading && equipmentList.length === 0 ? (
          <GearGridLoader centered size="lg" label={t("pages.Equipment.loadingFleetInventory")} sublabel={t("pages.Equipment.synchronizingAssetSpecificationsTelemetr")} />
        ) : view === "cards" ? (
          <EquipmentCardGrid
            data={equipmentList}
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
            config={cardConfig.config}
          />
        ) : (
          <EquipmentTable
            data={equipmentList}
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
              {t("pages.Equipment.itemsSelected", { count: selectedIds.length })}
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.2)" }} />

          <Can perform={["equipment:bulk_edit", "equipment:edit"]}>
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

          <Can perform="equipment:edit">
            <Button
              variant="outlined"
              size="small"
              startIcon={convertNames.isPending ? <CircularProgress size={14} color="inherit" /> : <TranslateIcon />}
              onClick={() => runConvert(selectedIds)}
              disabled={convertNames.isPending}
              sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)", fontWeight: 700, borderRadius: 9999, textTransform: "none", px: 2, "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.08)" } }}
            >
              {t("equipment.convertSelectedToSinhala")}
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

      <EquipmentFormDialog
        open={isDrawerOpen}
        onClose={handleCloseDrawer}
        initialData={editingItem}
      />

      <EquipmentBulkEditDialog
        open={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        selectedIds={selectedIds}
        onSuccess={() => setSelectedIds([])}
      />
    </Box>
  );
}
