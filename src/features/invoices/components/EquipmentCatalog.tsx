import { useEffect, useRef } from "react";
import { Badge, Box, Button, Chip, CircularProgress, IconButton, LinearProgress, Skeleton, TextField, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import AppsIcon from "@mui/icons-material/Apps";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FilterListOffIcon from "@mui/icons-material/FilterListOff";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";

import type { CatalogEquipment } from "../hooks/usePosEquipmentCatalog";
import { equipmentIcon } from "@/features/equipment/lib/equipmentVisual";
import { EquipmentCard } from "./EquipmentCard";

const MONO = "'JetBrains Mono', monospace";

const useTokens = () => {
  const dark = useTheme().palette.mode === "dark";
  return {
    dark,
    surface: dark ? "#0b1220" : "#f8fafc",
    card: dark ? "#1e293b" : "#ffffff",
    border: dark ? "#334155" : "#e2e8f0",
    text: dark ? "#f8fafc" : "#0f172a",
    muted: dark ? "#94a3b8" : "#475569",
  };
};

// ─── Search bar ──────────────────────────────────────────────────────────────

interface EquipmentSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  loading: boolean;
  onSubmit: () => void;
}

export function EquipmentSearchBar({ value, onChange, open, onOpen, onClose, loading, onSubmit }: EquipmentSearchBarProps) {
  const { t } = useTranslation();
  const k = useTokens();

  return (
    <TextField
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        if (!open) onOpen();
      }}
      onFocus={() => {
        if (!open) onOpen();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onSubmit();
        } else if (e.key === "Escape") {
          onClose();
        }
      }}
      placeholder={t("invoices.PosLedgerPanel.addEquipmentByNameOr")}
      fullWidth
      slotProps={{
        htmlInput: { "aria-label": t("invoices.PosLedgerPanel.addEquipmentByNameOr"), enterKeyHint: "search", autoComplete: "off" },
        input: {
          startAdornment: <SearchIcon sx={{ color: k.muted, ml: 0.5, mr: 0.75, fontSize: 22 }} />,
          endAdornment: (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              {loading && <CircularProgress size={16} sx={{ mr: 0.5 }} />}
              {value && (
                <IconButton size="small" aria-label={t("common.clear")} onClick={() => onChange("")} sx={{ color: k.muted }}>
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
              )}
              <IconButton
                size="small"
                aria-label={open ? t("common.close") : t("invoices.EquipmentCatalog.browse")}
                onClick={open ? onClose : onOpen}
                sx={{ color: open ? "primary.main" : k.muted, bgcolor: open ? "action.selected" : "transparent" }}
              >
                {open ? <KeyboardArrowUpIcon sx={{ fontSize: 22 }} /> : <GridViewRoundedIcon sx={{ fontSize: 20 }} />}
              </IconButton>
            </Box>
          ),
          sx: {
            borderRadius: 3.5,
            height: { xs: 48, sm: 44 },
            bgcolor: k.card,
            pr: 0.75,
            "& .MuiInputBase-input": { color: k.text, fontWeight: 500, fontSize: "0.9rem" },
            "& fieldset": { borderColor: k.border },
            "&:hover fieldset": { borderColor: k.dark ? "#475569" : "#cbd5e1" },
            "&.Mui-focused fieldset": { borderColor: "primary.main" },
          },
        },
      }}
    />
  );
}

// ─── Catalog overlay ─────────────────────────────────────────────────────────

interface CategoryOption {
  category_id: number;
  category_name: string;
}

interface EquipmentCatalogProps {
  items: CatalogEquipment[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  onRetry: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  categories: CategoryOption[];
  categoryId: number | null;
  onCategoryChange: (id: number | null) => void;
  inStockOnly: boolean;
  onInStockChange: (value: boolean) => void;
  searching: boolean;
  cartQtyById: Map<number, number>;
  cartCount: number;
  cartTotal: number;
  onAdd: (item: CatalogEquipment) => void;
  onDecrement: (item: CatalogEquipment) => void;
  onClose: () => void;
  onClearFilters: () => void;
}

export function EquipmentCatalog(props: EquipmentCatalogProps) {
  const {
    items, isLoading, isFetching, isError, onRetry, hasNextPage, isFetchingNextPage, fetchNextPage,
    categories, categoryId, onCategoryChange, inStockOnly, onInStockChange, searching,
    cartQtyById, cartCount, cartTotal, onAdd, onDecrement, onClose, onClearFilters,
  } = props;
  const { t } = useTranslation();
  const k = useTokens();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Endless scroll: pull the next page when the sentinel nears the bottom.
  useEffect(() => {
    const root = scrollRef.current;
    const target = sentinelRef.current;
    if (!root || !target || !hasNextPage || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { root, rootMargin: "240px" },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, items.length]);

  const filtersActive = categoryId !== null || searching || !inStockOnly;
  const chipSx = (selected: boolean, accent: "primary" | "success" = "primary") => {
    const on = accent === "success" ? "#16a34a" : "primary.main";
    const onHover = accent === "success" ? "#15803d" : "primary.dark";
    // white on green, the theme's own on-colour on the brand colour (dark text on amber)
    const onText = accent === "success" ? "#ffffff" : "primary.contrastText";
    return {
      flexShrink: 0,
      height: 34,
      borderRadius: 17,
      fontWeight: 700,
      fontSize: "0.8rem",
      bgcolor: selected ? on : k.card,
      color: selected ? onText : k.text,
      border: "1px solid",
      borderColor: selected ? on : k.border,
      "& .MuiChip-icon": { color: selected ? onText : k.muted, fontSize: 18 },
      "&:hover": { bgcolor: selected ? onHover : k.dark ? "#273449" : "#f1f5f9" },
      "&.Mui-disabled": { opacity: 0.45 },
    };
  };

  return (
    <Box
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      sx={{
        position: "absolute",
        inset: 0,
        zIndex: 5,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        bgcolor: k.surface,
        borderRadius: 3,
        overflow: "hidden",
        animation: "catalogIn 0.16s ease-out",
        "@keyframes catalogIn": { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "none" } },
        "@media (prefers-reduced-motion: reduce)": { animation: "none" },
      }}
    >
      {/* ── Filters ── */}
      <Box
        sx={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 1,
          overflowX: "auto",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        <Chip
          clickable
          icon={<Inventory2OutlinedIcon />}
          label={t("invoices.EquipmentCatalog.inStock")}
          onClick={() => onInStockChange(!inStockOnly)}
          disabled={searching}
          sx={chipSx(inStockOnly && !searching, "success")}
        />
        <Box sx={{ width: "1px", height: 20, bgcolor: k.border, flexShrink: 0 }} />
        <Chip clickable icon={<AppsIcon />} label={t("common.all")} onClick={() => onCategoryChange(null)} sx={chipSx(categoryId === null)} />
        {categories.map((c) => {
          const CatIcon = equipmentIcon(c.category_name);
          return (
            <Chip
              key={c.category_id}
              clickable
              icon={<CatIcon />}
              label={c.category_name}
              onClick={() => onCategoryChange(categoryId === c.category_id ? null : c.category_id)}
              sx={chipSx(categoryId === c.category_id)}
            />
          );
        })}
      </Box>

      {/* ── Product grid ── */}
      <Box sx={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {isFetching && !isLoading && <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, zIndex: 1 }} />}
        <Box
          ref={scrollRef}
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            px: 1.5,
            pb: 1.5,
            pt: 0.5,
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
            "&::-webkit-scrollbar": { width: "5px" },
            "&::-webkit-scrollbar-thumb": { background: k.dark ? "#475569" : "#cbd5e1", borderRadius: "10px" },
          }}
        >
          {isLoading || (isFetching && items.length === 0 && !isError) ? (
            <Grid>
              {Array.from({ length: 6 }).map((_, i) => (
                <Box key={i} sx={{ borderRadius: 3, overflow: "hidden", bgcolor: k.card, border: "1px solid", borderColor: k.border }}>
                  <Skeleton variant="rectangular" sx={{ aspectRatio: "4 / 3", width: "100%", height: "auto" }} animation="wave" />
                  <Box sx={{ p: 1.25 }}>
                    <Skeleton width="85%" />
                    <Skeleton width="45%" />
                  </Box>
                </Box>
              ))}
            </Grid>
          ) : items.length === 0 ? (
            <Box sx={{ minHeight: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5, textAlign: "center", py: 4 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  bgcolor: k.dark ? "#1e293b" : "#e2e8f0",
                  color: k.muted,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <SearchOffIcon sx={{ fontSize: 34 }} />
              </Box>
              <Typography sx={{ color: k.text, fontWeight: 700, fontSize: "0.95rem" }}>
                {isError ? t("invoices.EquipmentCatalog.couldNotLoad") : t("invoices.EquipmentCatalog.noResults")}
              </Typography>
              {isError ? (
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={onRetry} sx={{ borderRadius: 3, fontWeight: 700, textTransform: "none" }}>
                  {t("common.retry")}
                </Button>
              ) : (
                filtersActive && (
                  <Button variant="outlined" startIcon={<FilterListOffIcon />} onClick={onClearFilters} sx={{ borderRadius: 3, fontWeight: 700, textTransform: "none" }}>
                    {t("invoices.EquipmentCatalog.clearFilters")}
                  </Button>
                )
              )}
            </Box>
          ) : (
            <>
              <Grid>
                {items.map((item) => (
                  <EquipmentCard
                    key={item.equipment_id}
                    item={item}
                    inCartQty={cartQtyById.get(item.equipment_id) ?? 0}
                    onAdd={onAdd}
                    onDecrement={onDecrement}
                  />
                ))}
              </Grid>
              {hasNextPage && (
                <Box ref={sentinelRef} sx={{ display: "flex", justifyContent: "center", py: 1.5 }}>
                  {isFetchingNextPage ? (
                    <CircularProgress size={22} />
                  ) : (
                    <IconButton aria-label={t("invoices.EquipmentCatalog.loadMore")} onClick={() => fetchNextPage()} sx={{ color: k.muted, border: "1px solid", borderColor: k.border }}>
                      <ExpandMoreIcon />
                    </IconButton>
                  )}
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* ── Order bar ── */}
      <Box
        sx={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 1.5,
          py: 1,
          bgcolor: k.card,
          borderTop: "1px solid",
          borderColor: k.border,
        }}
      >
        <Badge
          badgeContent={cartCount}
          color="primary"
          showZero
          aria-label={t("invoices.PosLedgerPanel.itemsInOrder", { count: cartCount })}
          sx={{ "& .MuiBadge-badge": { fontWeight: 800, fontVariantNumeric: "tabular-nums" } }}
        >
          <ShoppingCartOutlinedIcon sx={{ color: k.text, fontSize: 26 }} />
        </Badge>
        <Typography sx={{ color: k.text, fontWeight: 800, fontFamily: MONO, fontVariantNumeric: "tabular-nums", fontSize: "0.95rem" }}>
          Rs. {cartTotal.toLocaleString()}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          disableElevation
          startIcon={<CheckRoundedIcon />}
          onClick={onClose}
          sx={{ borderRadius: 3, height: 42, px: 2.5, fontWeight: 800, textTransform: "none" }}
        >
          {t("invoices.EquipmentCatalog.done")}
        </Button>
      </Box>
    </Box>
  );
}

// Responsive product grid: 2 columns on a phone, 3+ as the pane widens.
function Grid({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))", gap: 1.25 }}>{children}</Box>
  );
}
