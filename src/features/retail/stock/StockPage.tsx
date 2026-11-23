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
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import ExposureIcon from "@mui/icons-material/Exposure";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import HistoryIcon from "@mui/icons-material/History";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useOverlay } from "@/components/overlay";
import { formatCombo } from "@/components/command/shortcuts";
import { KpiTile } from "@/components/reports/KpiTile";
import { ResponsiveKpiStrip } from "@/components/ui/ResponsiveKpiStrip";
import { useDensity } from "@/features/preferences/useDensity";
import { useUiPreference } from "@/features/preferences/useUiPreference";
import { tk } from "@/i18n/marker";
import { fetchProducts } from "../api/catalog.api";
import { formatRs } from "../format";
import { buildRows, filterProducts, categoryCounts, stockKpis, STOCK_VIEWS, type StockView } from "./stockModel";
import { CategoryRail } from "./CategoryRail";
import { StockTable } from "./StockTable";
import { StockSheet } from "./StockSheet";
import { useStockLevels, useStockSummary } from "./useStockLevels";
import { useRetailCatalog, useRetailPermissions } from "../catalog/useRetailCatalog";
import { useScanDetector } from "../catalog/scanDetector";
import {
  BRANDS_OVERLAY_ID,
  CATEGORIES_OVERLAY_ID,
  CORRECT_OVERLAY_ID,
  COUNT_OVERLAY_ID,
  FINDER_OVERLAY_ID,
  HISTORY_OVERLAY_ID,
  ITEM_CARD_OVERLAY_ID,
  NEW_ITEM_OVERLAY_ID,
  STOCK_IN_OVERLAY_ID,
  WORDS_OVERLAY_ID,
} from "../catalog/overlayIds";
import { preloadCatalogOverlays } from "../catalog/registerCatalog";

const PAGE = 100;
const VIEW_LABEL: Record<StockView, string> = {
  all: tk("retail.stock.viewAll"),
  low_stock: tk("retail.stock.viewLowStock"),
  out_of_stock: tk("retail.stock.viewOutOfStock"),
  not_counted: tk("retail.stock.viewNotCounted"),
  recently_received: tk("retail.stock.viewRecentlyReceived"),
  no_barcode: tk("retail.stock.viewNoBarcode"),
  archived: tk("retail.stock.viewArchived"),
  recent: tk("retail.stock.viewRecent"),
};

/** The Stock workspace (plan §7.1): category rail, grouped item table, stock levels, action overlays, saved views. */
export function StockPage() {
  const { t } = useTranslation();
  const overlay = useOverlay();
  const { canManage, canView, canCost, canReceive, canAdjust } = useRetailPermissions();
  const { catalog, index, ready, isLoading, isError } = useRetailCatalog();
  const { rowHeight } = useDensity();
  const { value: viewPref, set: setViewPref } = useUiPreference<StockView>("stock.view", "all");
  const view: StockView = STOCK_VIEWS.includes(viewPref) ? viewPref : "all";

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
  const levels = useStockLevels(selectedWarehouseId);
  const activeWarehouseId = levels.warehouseId;
  const summaryQ = useStockSummary(activeWarehouseId);

  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subCategoryId, setSubCategoryId] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [whMenu, setWhMenu] = useState<HTMLElement | null>(null);

  useEffect(() => preloadCatalogOverlays(), []);
  useEffect(() => setShown(PAGE), [view, deferred, categoryId, subCategoryId, sheet, activeWarehouseId]);

  // A scan on this page (or into the search box) opens the finder with the code.
  useScanDetector((code) => {
    setQuery("");
    overlay.open(FINDER_OVERLAY_ID, { initialScan: code, warehouseId: activeWarehouseId });
  }, canView);

  // Archived items are not in the local catalogue: the server lists them.
  const archivedQ = useQuery({
    queryKey: ["retail", "products", "archived"],
    queryFn: () => fetchProducts({ active: false, limit: 100 }),
    enabled: canView && view === "archived",
    staleTime: 60_000,
  });

  const { products, scores } = useMemo(
    () => filterProducts(index, archivedQ.data?.rows ?? [], { view, query: deferred, categoryId, subCategoryId }, levels.levelFor),
    [index, archivedQ.data, view, deferred, categoryId, subCategoryId, levels.levelFor],
  );
  const groups = useMemo(() => buildRows(index, products, scores, view), [index, products, scores, view]);
  const localKpis = useMemo(() => stockKpis(catalog.products, levels.levelFor), [catalog.products, levels.levelFor]);
  const counts = useMemo(() => categoryCounts(index), [index]);

  const summary = summaryQ.data;
  const totalItems = summary ? summary.items_counted + summary.items_not_counted : localKpis.items;
  const lowCount = summary ? summary.low_stock_count : localKpis.lowStock;
  const notCountedCount = summary ? summary.items_not_counted : localKpis.notCounted;
  const stockValue = summary?.stock_value !== undefined ? summary.stock_value : localKpis.stockValue;

  const activeWarehouse = levels.warehouses.find((w) => w.warehouse_id === activeWarehouseId);

  const openItem = (productId: number) => overlay.open(ITEM_CARD_OVERLAY_ID, { productId, warehouseId: activeWarehouseId });
  const newItem = () => overlay.open(NEW_ITEM_OVERLAY_ID);
  const openStockIn = () => overlay.open(STOCK_IN_OVERLAY_ID, { warehouseId: activeWarehouseId });
  const openCorrect = () => overlay.open(CORRECT_OVERLAY_ID, { warehouseId: activeWarehouseId });
  const openCount = (mode: "count" | "opening" = "count") =>
    overlay.open(COUNT_OVERLAY_ID, { warehouseId: activeWarehouseId, mode, categoryId: subCategoryId ?? categoryId });
  const openHistory = () => overlay.open(HISTORY_OVERLAY_ID, { warehouseId: activeWarehouseId });

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
          sx={{ flex: "1 1 220px", minWidth: 0, maxWidth: 420 }}
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
          <IconButton onClick={() => overlay.open(FINDER_OVERLAY_ID, { warehouseId: activeWarehouseId })} aria-label={t("retail.finder.title")}>
            <QrCodeScannerIcon />
          </IconButton>
        </Tooltip>

        {levels.warehouses.length > 1 && (
          <>
            <Chip
              clickable
              size="small"
              icon={<LocationOnOutlinedIcon fontSize="small" />}
              deleteIcon={<KeyboardArrowDownIcon fontSize="small" />}
              onDelete={(e) => setWhMenu(e.currentTarget as HTMLElement)}
              onClick={(e) => setWhMenu(e.currentTarget)}
              label={activeWarehouse?.location_name ?? t("retail.stock.location")}
              variant="outlined"
              data-testid="location-chip"
              sx={{ minHeight: 36, fontWeight: 700 }}
            />
            <Menu anchorEl={whMenu} open={!!whMenu} onClose={() => setWhMenu(null)}>
              {levels.warehouses.map((w) => (
                <MenuItem
                  key={w.warehouse_id}
                  selected={w.warehouse_id === activeWarehouseId}
                  onClick={() => {
                    setSelectedWarehouseId(w.warehouse_id);
                    setWhMenu(null);
                  }}
                >
                  {w.location_name}
                </MenuItem>
              ))}
            </Menu>
          </>
        )}

        {canReceive && (
          <Tooltip title={`${t("retail.stock.inTip")} (${formatCombo("F2")})`}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openStockIn} sx={{ minHeight: 40 }}>
              {t("retail.stock.in")}
            </Button>
          </Tooltip>
        )}
        {canAdjust && (
          <Tooltip title={`${t("retail.stock.correctTip")} (${formatCombo("F4")})`}>
            <Button variant="outlined" color="inherit" startIcon={<ExposureIcon />} onClick={openCorrect} sx={{ minHeight: 40 }}>
              {t("retail.stock.correct")}
            </Button>
          </Tooltip>
        )}
        {canAdjust && (
          <Tooltip title={t("retail.stock.countTip")}>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<FactCheckOutlinedIcon />}
              onClick={() => openCount(view === "not_counted" ? "opening" : "count")}
              sx={{ minHeight: 40 }}
            >
              {t("retail.stock.count")}
            </Button>
          </Tooltip>
        )}
        {canView && (
          <Tooltip title={t("retail.stock.historyTip")}>
            <Button variant="outlined" color="inherit" startIcon={<HistoryIcon />} onClick={openHistory} sx={{ minHeight: 40 }}>
              {t("retail.stock.history")}
            </Button>
          </Tooltip>
        )}
        {canManage && (
          <Button variant="outlined" color="inherit" startIcon={<AddIcon />} onClick={newItem} sx={{ minHeight: 40 }}>
            {t("retail.stock.new")}
          </Button>
        )}
        {canManage && (
          <Button
            variant={sheet ? "contained" : "outlined"}
            color={sheet ? "primary" : "inherit"}
            startIcon={<GridOnIcon />}
            onClick={() => setSheet((s) => !s)}
            aria-pressed={sheet}
            sx={{ minHeight: 40 }}
          >
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

      <ResponsiveKpiStrip mobileLabel={t("retail.stock.title")} columns={canCost ? 4 : 3}>
        <KpiTile
          compact
          label={t("retail.stock.kpiItems")}
          value={totalItems}
          icon={<Inventory2OutlinedIcon />}
          active={view === "all"}
          onClick={() => setViewPref("all")}
        />
        <KpiTile
          compact
          label={t("retail.stock.kpiLowStock")}
          value={lowCount}
          icon={<WarningAmberOutlinedIcon />}
          tone={lowCount > 0 ? "warning" : "default"}
          active={view === "low_stock"}
          onClick={() => setViewPref("low_stock")}
        />
        <KpiTile
          compact
          label={t("retail.stock.kpiNotCounted")}
          value={notCountedCount}
          icon={<HelpOutlineOutlinedIcon />}
          tone={notCountedCount > 0 ? "info" : "default"}
          active={view === "not_counted"}
          onClick={() => setViewPref("not_counted")}
        />
        {canCost && (
          <KpiTile
            compact
            label={t("retail.stock.kpiStockValue")}
            value={stockValue != null ? formatRs(stockValue) : "—"}
            icon={<AccountBalanceWalletOutlinedIcon />}
            tone="success"
          />
        )}
      </ResponsiveKpiStrip>

      <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0, flexWrap: { xs: "nowrap", sm: "wrap" }, overflowX: "auto", alignItems: "center" }} role="group" aria-label={t("retail.stock.views")}>
        {STOCK_VIEWS.map((v) => (
          <Chip
            key={v}
            clickable
            label={t(VIEW_LABEL[v])}
            color={view === v ? "primary" : "default"}
            variant={view === v ? "filled" : "outlined"}
            onClick={() => setViewPref(v)}
            sx={{ flexShrink: 0, minHeight: 32 }}
          />
        ))}
        {view === "not_counted" && canAdjust && (
          <Button size="small" variant="contained" onClick={() => openCount("opening")} sx={{ flexShrink: 0, ml: "auto" }}>
            {t("retail.count.openingAction")}
          </Button>
        )}
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
              <StockTable groups={groups.slice(0, shown)} ctx={index.ctx} rowHeight={rowHeight} levelFor={levels.levelFor} onOpen={openItem} />
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
