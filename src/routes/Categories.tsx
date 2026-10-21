import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCategoryList } from "@/features/equipment/hooks/useCategoryHooks";
import { CategoryTable } from "@/features/equipment/components/CategoryTable";
import { CategoryFormDrawer } from "@/features/equipment/components/CategoryFormDrawer";
import { GearGridLoader } from "@/components/ui/GearGridLoader";
import { ResponsiveKpiStrip } from "@/components/ui/ResponsiveKpiStrip";
import { KpiTile } from "@/components/reports/KpiTile";

import {
  Box,
  Button,
  Typography,
  Card,
  Alert,
  TextField,
  InputAdornment,
  Tooltip,
  Chip,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ClassOutlinedIcon from "@mui/icons-material/ClassOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";

function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function CategoriesRoute() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Search state
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounced(searchInput, 300);

  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 20,
  });

  // Reset to page 0 when search changes
  useEffect(() => {
    setPaginationModel((m) => (m.page === 0 ? m : { ...m, page: 0 }));
  }, [debouncedSearch]);

  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useCategoryList(paginationModel.page + 1, paginationModel.pageSize, debouncedSearch);

  const categoryList = response?.categories || [];
  const totalRowCount = Number(response?.total || 0);

  // Compute stat metrics
  const stats = useMemo(() => {
    const withDesc = categoryList.filter(
      (c) => c.description && c.description.trim().length > 0
    ).length;

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = categoryList.filter((c) => {
      const dt = c.createdAt ? new Date(c.createdAt).getTime() : 0;
      return dt >= thirtyDaysAgo;
    }).length;

    return {
      documented: withDesc,
      recent,
    };
  }, [categoryList]);

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

  const clearSearch = () => {
    setSearchInput("");
  };

  if (isError) {
    return (
      <Alert severity="error" className="m-4">
        {t("pages.Categories.failedToLoadCategories")}{" "}
        {error instanceof Error ? error.message : t("pages.Categories.unknownError")}
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: { xs: "auto", md: "calc(100vh - 88px)" },
        minHeight: 0,
        overflow: { xs: "visible", md: "hidden" },
        gap: { xs: 1.5, md: 2 },
      }}
    >
      {/* Header */}
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
            {t("nav.categories")}
          </Typography>
          <Typography variant="body2" color="text.secondary" className="mt-1">
            {t("equipment.subtitle")} · {t("pages.Categories.taxonomyCatalogOrganization")}
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          disableElevation
          sx={{ py: 1.25, px: 2.5, borderRadius: 2 }}
        >
          {t("common.add")} {t("nav.categories")}
        </Button>
      </Box>

      {/* KPI Cards Strip */}
      <ResponsiveKpiStrip mobileLabel={t("pages.Categories.categoriesOverview")}>
        <KpiTile
          label={t("pages.Categories.totalCategories")}
          value={`${totalRowCount}`}
          hint={t("pages.Categories.catalogTaxonomyGroups")}
          icon={<CategoryOutlinedIcon />}
          tone="default"
          onClick={clearSearch}
          active={!debouncedSearch}
          compact
          badge={
            debouncedSearch ? (
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
          label={t("pages.Categories.documented")}
          value={`${stats.documented}`}
          hint={t("pages.Categories.withDetailedDescriptions")}
          icon={<DescriptionOutlinedIcon />}
          tone="info"
          compact
        />

        <KpiTile
          label={t("pages.Categories.activeStructure")}
          value="100%"
          hint={t("pages.Categories.validRelationalTaxonomy")}
          icon={<CheckCircleOutlinedIcon />}
          tone="success"
          compact
        />

        <KpiTile
          label={t("pages.Categories.recentAdditions")}
          value={`${stats.recent}`}
          hint={t("pages.Categories.addedInLast30Days")}
          icon={<ClassOutlinedIcon />}
          tone="warning"
          compact
        />
      </ResponsiveKpiStrip>

      {/* Search Bar */}
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
          placeholder={t("pages.Categories.searchCategoriesByNameOr")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          sx={{
            width: { xs: "100%", sm: 320, md: 380 },
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
                  <Tooltip title={t("pages.Categories.clearSearch")}>
                    <ClearOutlinedIcon
                      onClick={clearSearch}
                      sx={{ fontSize: 16, color: theme.palette.text.disabled, cursor: "pointer" }}
                    />
                  </Tooltip>
                </InputAdornment>
              ) : null,
            },
          }}
        />

        {debouncedSearch && (
          <Button
            size="small"
            color="inherit"
            startIcon={<FilterAltOutlinedIcon />}
            onClick={clearSearch}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {t("pages.Categories.clearSearch")}
          </Button>
        )}

        <Typography
          variant="caption"
          sx={{
            color: theme.palette.text.secondary,
            ml: { sm: "auto" },
            whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {isLoading
            ? t("common.loading")
            : t("pages.Categories.categoriesRegistered", { count: totalRowCount })}
        </Typography>
      </Card>

      {/* Main Table Card */}
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
        {isLoading && categoryList.length === 0 ? (
          <GearGridLoader
            centered
            size="lg"
            label={t("pages.Categories.loadingFleetCategories")}
            sublabel={t("pages.Categories.organizingEquipmentTaxonomyCatalogMappin")}
          />
        ) : (
          <CategoryTable
            data={categoryList}
            isLoading={isLoading}
            rowCount={totalRowCount}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            onEdit={handleOpenEdit}
          />
        )}
      </Card>

      <CategoryFormDrawer
        open={isDrawerOpen}
        onClose={handleCloseDrawer}
        initialData={editingItem}
      />
    </Box>
  );
}
