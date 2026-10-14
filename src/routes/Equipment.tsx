import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useEquipmentList } from "@/features/equipment/hooks/useEquipmentHooks";
import { useCategoryList } from "@/features/equipment/hooks/useCategoryHooks";
import type { EquipmentFilters } from "@/features/equipment/api/equipment.api";

import { EquipmentTable } from "@/features/equipment/components/EquipmentTable";
import { EquipmentFormDialog } from "@/features/equipment/components/EquipmentFormDialog";
import { EquipmentBulkEditDialog } from "@/features/equipment/components/EquipmentBulkEditDialog";
import { GearGridLoader } from "@/components/ui/GearGridLoader";
import { Can } from "@/components/auth/Can";

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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 20 });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

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

  // Global stats for the KPIs (not affected by filters)
  const { data: globalStats } = useQuery({
    queryKey: ["equipment-global-stats"],
    queryFn: async () => {
      const res = await api.get("/equipment", { params: { limit: 5000 } });
      const allItems = res.data?.data?.equipment || res.data?.equipment || [];
      let available = 0;
      let maintenance = 0;
      allItems.forEach((item: any) => {
        available += Number(item.available_qty || 0);
        maintenance += Number(item.defective_qty || 0);
      });
      return { available, maintenance };
    },
    staleTime: 1000 * 60 * 5,
  });

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
        Failed to load equipment: {error instanceof Error ? error.message : "Unknown error"}
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: { xs: "auto", md: "calc(100vh - 112px)" },
        gap: { xs: 2, md: 2.5 },
      }}
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Typography variant="h4" fontWeight="bold" color="text.primary">
            {t("equipment.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary" className="mt-1">
            {t("equipment.subtitle")}
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          disableElevation
          sx={{ py: 1.5, px: 3, borderRadius: 2 }}
        >
          {t("equipment.addEquipment")}
        </Button>
      </div>

      {/* KPI Cards */}
      <Grid container spacing={{ xs: 1.5, md: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card elevation={0} className="border border-slate-200 rounded-xl bg-white h-full">
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <InventoryIcon fontSize="large" />
              </div>
              <div>
                <Typography variant="body2" color="text.secondary" fontWeight="500">
                  {t("equipment.totalAssets")}
                </Typography>
                <Typography variant="h5" fontWeight="bold">{totalRowCount}</Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card elevation={0} className="border border-green-200 rounded-xl bg-green-50/30 h-full">
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                <CheckCircleIcon fontSize="large" />
              </div>
              <div>
                <Typography variant="body2" color="text.secondary" fontWeight="500">
                  {t("equipment.availableForRent")}
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="success.dark">
                  {globalStats?.available || 0} {t("equipment.units")}
                </Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card elevation={0} className="border border-orange-200 rounded-xl bg-orange-50/30 h-full">
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                <BuildCircleIcon fontSize="large" />
              </div>
              <div>
                <Typography variant="body2" color="text.secondary" fontWeight="500">
                  {t("equipment.inMaintenance")}
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="warning.dark">
                  {globalStats?.maintenance || 0} {t("equipment.units")}
                </Typography>
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
          placeholder={t("equipment.searchPlaceholder")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          sx={{ minWidth: { xs: "100%", sm: 300 } }}
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

        {/* Category dropdown */}
        <TextField
          select
          size="small"
          value={categoryId}
          onChange={(e) =>
            setCategoryId(e.target.value === "" ? "" : Number(e.target.value))
          }
          sx={{ minWidth: 200 }}
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

        {/* Availability chips */}
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
        </Box>

        <Box sx={{ flex: 1 }} />

        {activeFilterCount > 0 && (
          <Button
            size="small"
            color="inherit"
            startIcon={<FilterAltOutlinedIcon />}
            onClick={clearFilters}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
          </Button>
        )}

        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, ml: 0.5 }}>
          {isLoading
            ? "Loading…"
            : `${totalRowCount.toLocaleString()} match${totalRowCount === 1 ? "" : "es"}`}
        </Typography>
      </Card>

      {/* Data Table */}
      <Card
        elevation={0}
        sx={{
          flex: 1,
          minHeight: { xs: 520, md: 450 },
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
          <GearGridLoader centered size="lg" label="Loading Fleet Inventory..." sublabel="Synchronizing asset specifications & telemetry" />
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
              item{selectedIds.length === 1 ? "" : "s"} selected
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
              Bulk Edit
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
            Deselect All
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
