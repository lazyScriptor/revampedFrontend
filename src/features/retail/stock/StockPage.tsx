import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, IconButton, InputAdornment, ListItemIcon, Menu, MenuItem, Stack, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import GridOnIcon from "@mui/icons-material/GridOn";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import LabelOutlinedIcon from "@mui/icons-material/LabelOutlined";
import TranslateIcon from "@mui/icons-material/Translate";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useOverlay } from "@/components/overlay";
import { formatCombo } from "@/components/command/shortcuts";
import { KpiTile } from "@/components/reports/KpiTile";
import { ResponsiveKpiStrip } from "@/components/ui/ResponsiveKpiStrip";
import { useDensity } from "@/features/preferences/useDensity";
import { useUiPreference } from "@/features/preferences/useUiPreference";
import { fetchProducts } from "../api/catalog.api";
import { buildRows, filterProducts, categoryCounts, stockKpis, STOCK_VIEWS, type StockView } from "./stockModel";
import { CategoryRail } from "./CategoryRail";
import { StockTable } from "./StockTable";
import { StockSheet } from "./StockSheet";
import { useRetailCatalog, useRetailPermissions } from "../catalog/useRetailCatalog";
import { useScanDetector } from "../catalog/scanDetector";
import { BRANDS_OVERLAY_ID, CATEGORIES_OVERLAY_ID, FINDER_OVERLAY_ID, ITEM_CARD_OVERLAY_ID, NEW_ITEM_OVERLAY_ID, WORDS_OVERLAY_ID } from "../catalog/overlayIds";
import { preloadCatalogOverlays } from "../catalog/registerCatalog";

const PAGE = 100;
const VIEW_LABEL: Record<StockView, string> = {
  all: "retail.stock.viewAll",
  no_barcode: "retail.stock.viewNoBarcode",
  archived: "retail.stock.viewArchived",
  recent: "retail.stock.viewRecent",
};

/** The Stock workspace (plan §7.1): category rail, grouped item table, finder box, saved views, edit-as-sheet. */
export function StockPage() {
  const { t } = useTranslation();
  const overlay = useOverlay();
  const { canManage, canView } = useRetailPermissions();
  const { catalog, index, ready, isLoading, isError } = useRetailCatalog();
  const { rowHeight } = useDensity();
  const { value: viewPref, set: setViewPref } = useUiPreference<StockView>("stock.view", "all");
  const view: StockView = STOCK_VIEWS.includes(viewPref) ? viewPref : "all";

  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subCategoryId, setSubCategoryId] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [menu, setMenu] = useState<HTMLElement | null>(null);

  useEffect(() => preloadCatalogOverlays(), []);
  useEffect(() => setShown(PAGE), [view, deferred, categoryId, subCategoryId, sheet]);

  // A scan on this page (or into the search box) opens the finder with the code.
  useScanDetector((code) => {
    setQuery("");
    overlay.open(FINDER_OVERLAY_ID, { initialScan: code });
  }, canView);

  // Archived items are not in the local catalogue: the server lists them.
  const archivedQ = useQuery({
    queryKey: ["retail", "products", "archived"],
    queryFn: () => fetchProducts({ active: false, limit: 100 }),
    enabled: canView,
    staleTime: 60_000,
  });
  const archivedCount = archivedQ.data?.total ?? 0;

  const { products, scores } = useMemo(
    () => filterProducts(index, archivedQ.data?.rows ?? [], { view, query: deferred, categoryId, subCategoryId }),
    [index, archivedQ.data, view, deferred, categoryId, subCategoryId],
  );
  const groups = useMemo(() => buildRows(index, products, scores, view), [index, products, scores, view]);
  const kpis = useMemo(() => stockKpis(catalog.products), [catalog.products]);
  const counts = useMemo(() => categoryCounts(index), [index]);

  const openItem = (productId: number) => overlay.open(ITEM_CARD_OVERLAY_ID, { productId });
  const newItem = () => overlay.open(NEW_ITEM_OVERLAY_ID);

  const menuItem = (icon: React.ReactNode, label: string, id: string) => (
    <MenuItem
      onClick={() => {
        setMenu(null);
        overlay.open(id);
      }}
    >
      <ListItemIcon>{icon}</ListItemIcon>
      {label}
    </MenuItem>
  );

  return (
    // Viewport-locked on desktop: every flex parent has minHeight 0 so the table scrolls inside its box.
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, height: { md: "calc(100vh - 88px)" }, minHeight: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexShrink: 0, flexWrap: "wrap", rowGap: 1 }}>
        <TextField
          size="small"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("retail.finder.placeholder")}
          sx={{ flex: "1 1 240px", minWidth: 0, maxWidth: 480 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
            htmlInput: { "data-scan": "true", "aria-label": t("retail.finder.placeholder"), autoComplete: "off" },
          }}
        />
        <Tooltip title={`${t("retail.finder.title")} (${formatCombo("F3")})`}>
          <IconButton onClick={() => overlay.open(FINDER_OVERLAY_ID)} aria-label={t("retail.finder.title")}>
            <QrCodeScannerIcon />
          </IconButton>
        </Tooltip>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={newItem} sx={{ minHeight: 40 }}>
            {t("retail.stock.new")}
          </Button>
        )}
        {canManage && (
          <Button variant={sheet ? "contained" : "outlined"} color={sheet ? "primary" : "inherit"} startIcon={<GridOnIcon />} onClick={() => setSheet((s) => !s)} aria-pressed={sheet} sx={{ minHeight: 40 }}>
            {t("retail.stock.sheet")}
          </Button>
        )}
        <Tooltip title={t("retail.stock.setUp")}>
          <IconButton onClick={(e) => setMenu(e.currentTarget)} aria-label={t("retail.stock.setUp")}>
            <SettingsOutlinedIcon />
          </IconButton>
        </Tooltip>
        <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
          {menuItem(<CategoryOutlinedIcon fontSize="small" />, t("retail.manage.categories"), CATEGORIES_OVERLAY_ID)}
          {menuItem(<LabelOutlinedIcon fontSize="small" />, t("retail.manage.brands"), BRANDS_OVERLAY_ID)}
          {menuItem(<TranslateIcon fontSize="small" />, t("retail.manage.words"), WORDS_OVERLAY_ID)}
        </Menu>
      </Stack>

      <ResponsiveKpiStrip mobileLabel={t("retail.stock.title")}>
        <KpiTile compact label={t("retail.stock.kpiItems")} value={kpis.items} icon={<Inventory2OutlinedIcon />} active={view === "all"} onClick={() => setViewPref("all")} />
        <KpiTile compact label={t("retail.stock.kpiFamilies")} value={kpis.families} icon={<LayersOutlinedIcon />} />
        <KpiTile compact label={t("retail.stock.kpiNoBarcode")} value={kpis.withoutBarcode} icon={<QrCodeScannerIcon />} tone={kpis.withoutBarcode ? "warning" : "default"} active={view === "no_barcode"} onClick={() => setViewPref("no_barcode")} />
        <KpiTile compact label={t("retail.stock.kpiArchived")} value={archivedCount} icon={<ArchiveOutlinedIcon />} active={view === "archived"} onClick={() => setViewPref("archived")} />
      </ResponsiveKpiStrip>

      <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0, flexWrap: { xs: "nowrap", sm: "wrap" }, overflowX: "auto" }} role="group" aria-label={t("retail.stock.views")}>
        {STOCK_VIEWS.map((v) => (
          <Chip key={v} clickable label={t(VIEW_LABEL[v])} color={view === v ? "primary" : "default"} variant={view === v ? "filled" : "outlined"} onClick={() => setViewPref(v)} sx={{ flexShrink: 0, minHeight: 32 }} />
        ))}
      </Stack>

      <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 1.5, flex: 1, minHeight: 0 }}>
        <CategoryRail
          categories={catalog.categories}
          counts={counts}
          selected={categoryId}
          selectedSub={subCategoryId}
          total={catalog.products.length}
          onSelect={(c, s) => {
            setCategoryId(c);
            setSubCategoryId(s);
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", p: sheet ? 1 : 0 }}>
          {!ready && isLoading ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <CircularProgress size={28} />
            </Box>
          ) : !ready && isError ? (
            <Alert severity="error" sx={{ m: 2 }}>
              {t("retail.stock.loadFailed")}
            </Alert>
          ) : sheet ? (
            <StockSheet products={products} ctx={index.ctx} categories={catalog.categories} brands={catalog.brands} rowHeight={rowHeight} />
          ) : groups.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {catalog.products.length === 0 && view !== "archived" ? t("retail.stock.empty") : t("retail.stock.nothing")}
              </Typography>
              {canManage && catalog.products.length === 0 && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={newItem}>
                  {t("retail.stock.new")}
                </Button>
              )}
            </Box>
          ) : (
            <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
              <StockTable groups={groups.slice(0, shown)} ctx={index.ctx} rowHeight={rowHeight} onOpen={openItem} />
              {groups.length > shown && (
                <Box sx={{ p: 1.5, textAlign: "center" }}>
                  <Button onClick={() => setShown((n) => n + PAGE)}>{t("retail.stock.showMore", { count: groups.length - shown })}</Button>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
