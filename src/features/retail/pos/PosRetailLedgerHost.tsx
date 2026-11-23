import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Badge, Box, Button, Tab, Tabs, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import SellOutlinedIcon from "@mui/icons-material/SellOutlined";
import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import { useTranslation } from "react-i18next";
import { useUiPreference } from "@/features/preferences/useUiPreference";
import { usePosCartStore, selectSaleLines, selectSaleSubtotal, type SaleCartLine } from "@/features/invoices/store/posCartStore";
import { lookupProduct } from "../api/catalog.api";
import type { CatalogProduct, CatalogUnit } from "../api/catalog.types";
import { lookupLocal, searchGroups } from "../catalog/catalogModel";
import { useScanDetector } from "../catalog/scanDetector";
import { useRetailCatalog } from "../catalog/useRetailCatalog";
import { useRetailSettings } from "../hooks/useRetailSettings";
import { useStockLevels } from "../stock/useStockLevels";
import { buildSaleLineFromProduct, customerPriceLevel } from "./posPricing";
import { PosQuickPad } from "./PosQuickPad";
import { SaleCartLineRow } from "./SaleCartLineRow";
import { SellCatalogGrid } from "./SellCatalogGrid";
import { SundryDialog } from "./SundryDialog";
import { UnlistedItemDialog } from "./UnlistedItemDialog";

export type PosCatalogTab = "all" | "rent" | "sell";

interface Props {
  searchBar: ReactNode;
  inputValue: string;
  setInputValue: (v: string) => void;
  catalogOpen: boolean;
  setCatalogOpen: (open: boolean) => void;
  rentalCount: number;
  rentalSubtotal: number;
  renderRentalCatalog: (opts: { retailSection?: ReactNode; extraCount?: number; extraTotal?: number }) => ReactNode;
  rentalCartContent: ReactNode;
  /** The rental line cards alone (no summary strip), used when rentals and goods share the cart. */
  rentalCards?: ReactNode;
  showToast: (msg: string, severity?: "error" | "success" | "warning") => void;
  setRegisterEnterHandler?: (fn: () => boolean) => void;
}

function CartGroupHeader({
  icon,
  label,
  count,
  total,
  dark,
  testId,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  total: number;
  dark: boolean;
  testId: string;
}) {
  const tone = dark ? "#fbbf24" : "#b45309";
  return (
    <Box
      data-testid={testId}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.5,
        py: 0.75,
        borderRadius: 2,
        bgcolor: dark ? "rgba(245, 158, 11, 0.12)" : "#fffbeb",
        border: "1px solid",
        borderColor: dark ? "rgba(245, 158, 11, 0.35)" : "#fde68a",
        color: tone,
        flexShrink: 0,
      }}
    >
      {icon}
      <Typography variant="caption" sx={{ fontWeight: 800, color: tone }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ fontWeight: 800, color: tone, fontVariantNumeric: "tabular-nums" }}>
        {count}
      </Typography>
      <Box sx={{ flexGrow: 1 }} />
      <Typography
        variant="body2"
        sx={{ fontWeight: 900, color: tone, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}
      >
        Rs. {total.toLocaleString()}
      </Typography>
    </Box>
  );
}

export function PosRetailLedgerHost({
  searchBar,
  inputValue,
  setInputValue,
  catalogOpen,
  setCatalogOpen,
  rentalCount,
  rentalSubtotal,
  renderRentalCatalog,
  rentalCartContent,
  rentalCards,
  showToast,
  setRegisterEnterHandler,
}: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const dark = theme.palette.mode === "dark";

  const { value: catalogTab, set: setCatalogTab } = useUiPreference<PosCatalogTab>("pos.catalogTab", "all");
  const { catalog, index } = useRetailCatalog();
  const { settings } = useRetailSettings();
  const { warehouseId } = useStockLevels();

  const selectedCustomer = usePosCartStore((s) => s.selectedCustomer);
  const lines = usePosCartStore((s) => s.lines);
  const addSaleLine = usePosCartStore((s) => s.addSaleLine);
  const updateSaleLine = usePosCartStore((s) => s.updateSaleLine);
  const removeSaleLine = usePosCartStore((s) => s.removeSaleLine);
  const applyCustomerPriceLevel = usePosCartStore((s) => s.applyCustomerPriceLevel);

  const saleLines = useMemo(() => selectSaleLines(lines), [lines]);
  const saleSubtotal = useMemo(() => selectSaleSubtotal(lines), [lines]);
  const priceLevel = customerPriceLevel(selectedCustomer);
  const showContractor = settings.showContractorPrice ?? true;

  const [unlistedOpen, setUnlistedOpen] = useState(false);
  const [unlistedPrefill, setUnlistedPrefill] = useState("");
  const [unlistedBarcode, setUnlistedBarcode] = useState<string | null>(null);
  const [sundryOpen, setSundryOpen] = useState(false);

  // Reprice non-manual sale lines automatically when customer price level changes (e.g. contractor/trade).
  useEffect(() => {
    if (index.byId.size > 0) {
      applyCustomerPriceLevel(index.byId, priceLevel, showContractor);
    }
  }, [selectedCustomer?.customer_id, selectedCustomer?.price_level, showContractor, index.byId, priceLevel, applyCustomerPriceLevel]);

  const handleAddProduct = (product: CatalogProduct, qty = 1, unit?: CatalogUnit | null, scannedBarcode?: string | null) => {
    addSaleLine(
      buildSaleLineFromProduct(product, {
        unit: unit ?? null,
        warehouseId,
        priceLevel,
        showContractorPrice: showContractor,
        qty,
        scannedBarcode: scannedBarcode ?? null,
      }),
    );
  };

  const handleAddCustomLine = (line: SaleCartLine) => {
    addSaleLine(line);
  };

  const openUnlisted = (prefill = "", barcode: string | null = null) => {
    setUnlistedPrefill(prefill);
    setUnlistedBarcode(barcode);
    setUnlistedOpen(true);
  };

  // Scanner anywhere on POS dispatch (including [data-scan] search bar): add item/pack at once or prompt Unlisted.
  useScanDetector((code) => {
    void (async () => {
      if (inputValue === code || inputValue.endsWith(code)) {
        setInputValue("");
      }
      const local = lookupLocal(index, code);
      if (local) {
        const unit = local.unit_id != null
          ? local.product.units?.find((u) => u.unit_id === local.unit_id) ?? null
          : null;
        handleAddProduct(local.product, 1, unit, code);
        showToast(
          t("retail.pos.scannedAdded", { name: unit ? `${local.product.name} (${unit.unit_name})` : local.product.name }),
          "success",
        );
        return;
      }
      try {
        const remote = await lookupProduct(code);
        if (remote?.product) {
          handleAddProduct(remote.product, 1, remote.unit ?? null, code);
          showToast(
            t("retail.pos.scannedAdded", {
              name: remote.unit ? `${remote.product.name} (${remote.unit.unit_name})` : remote.product.name,
            }),
            "success",
          );
          return;
        }
      } catch {
        // Ignore lookup error and offer unlisted entry with the scanned code.
      }
      openUnlisted("", code);
    })();
  });

  // Allow Enter in search bar on Sell tab when a single exact product matches.
  useEffect(() => {
    if (!setRegisterEnterHandler) return;
    setRegisterEnterHandler(() => {
      if (catalogTab !== "sell") return false;
      const groups = searchGroups(index, inputValue.trim());
      if (groups.length === 1 && groups[0].products.length === 1) {
        handleAddProduct(groups[0].products[0], 1);
        setInputValue("");
        return true;
      }
      return false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogTab, inputValue, index, rentalCount, priceLevel, warehouseId]);

  const cartQtyByProductId = useMemo(() => {
    const map = new Map<number, number>();
    for (const l of saleLines) {
      if (l.product_id != null) {
        map.set(l.product_id, (map.get(l.product_id) ?? 0) + l.qty);
      }
    }
    return map;
  }, [saleLines]);

  const totalItemsCount = rentalCount + saleLines.length;
  const combinedSubtotal = rentalSubtotal + saleSubtotal;

  const sellSection = (
    <Box sx={{ mt: catalogTab === "all" ? 2 : 0 }}>
      {catalogTab === "all" && catalog.products.length > 0 && (
        <Typography
          variant="overline"
          sx={{ display: "block", fontWeight: 800, letterSpacing: 1, color: "text.secondary", mb: 0.75 }}
        >
          {t("retail.pos.hardwareSection")}
        </Typography>
      )}
      <SellCatalogGrid
        searchQuery={inputValue}
        priceLevel={priceLevel}
        warehouseId={warehouseId}
        cartQtyByProductId={cartQtyByProductId}
        onAddProduct={(p) => handleAddProduct(p, 1)}
        onAddUnlisted={(prefill) => openUnlisted(prefill, null)}
      />
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Search bar + All/Rent/Sell tabs + Sundry / Unlisted actions */}
      <Box sx={{ px: { xs: 1.5, sm: 2.5 }, pt: { xs: 1.5, sm: 2 }, pb: 1, flexShrink: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        {searchBar}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
          <Tabs
            value={catalogTab}
            onChange={(_, v: PosCatalogTab) => {
              setCatalogTab(v);
              setCatalogOpen(true);
            }}
            sx={{
              minHeight: 34,
              "& .MuiTab-root": { minHeight: 34, py: 0.5, px: 1.5, textTransform: "none", fontWeight: 800, fontSize: "0.8rem" },
            }}
          >
            <Tab value="all" label={t("common.all")} onClick={() => setCatalogOpen(true)} />
            <Tab value="rent" label={t("retail.pos.tabRent")} onClick={() => setCatalogOpen(true)} />
            <Tab value="sell" label={t("retail.pos.tabSell")} onClick={() => setCatalogOpen(true)} />
          </Tabs>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<SellOutlinedIcon sx={{ fontSize: 15 }} />}
              onClick={() => setSundryOpen(true)}
              sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, minHeight: 32 }}
            >
              {t("retail.pos.sundryBtn")}
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddOutlinedIcon sx={{ fontSize: 15 }} />}
              onClick={() => openUnlisted(inputValue.trim(), null)}
              sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, minHeight: 32 }}
            >
              {t("retail.pos.unlistedBtn")}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Main ledger area with optional catalog overlay */}
      <Box sx={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {!catalogOpen && (
          <PosQuickPad
            priceLevel={priceLevel}
            warehouseId={warehouseId}
            onAdd={(p, q) => handleAddProduct(p, q)}
          />
        )}

        {saleLines.length > 0 && rentalCount > 0 ? (
          <Box
            data-testid="mixed-cart"
            sx={{
              flexGrow: 1,
              minHeight: 0,
              overflowY: "auto",
              px: { xs: 1.5, sm: 2.5 },
              pb: { xs: 2, sm: 2.5 },
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <CartGroupHeader
              testId="cart-group-rent"
              icon={<ConstructionOutlinedIcon sx={{ fontSize: 15 }} />}
              label={t("retail.pos.groupRent")}
              count={rentalCount}
              total={rentalSubtotal}
              dark={dark}
            />
            {rentalCards}
            <CartGroupHeader
              testId="cart-group-items"
              icon={<SellOutlinedIcon sx={{ fontSize: 15 }} />}
              label={t("retail.pos.groupItems")}
              count={saleLines.length}
              total={saleSubtotal}
              dark={dark}
            />
            {saleLines.map((line) => (
              <SaleCartLineRow
                key={line.cart_id}
                line={line}
                selectedCustomer={selectedCustomer}
                onUpdate={(patch) => updateSaleLine(line.cart_id, patch)}
                onRemove={() => removeSaleLine(line.cart_id)}
              />
            ))}
          </Box>
        ) : saleLines.length > 0 ? (
          <>
            <Box
              sx={{
                mx: { xs: 1.5, sm: 2.5 },
                mb: 1.25,
                px: 2,
                py: 1,
                borderRadius: 2,
                bgcolor: dark ? "rgba(245, 158, 11, 0.12)" : "#fffbeb",
                border: "1px solid",
                borderColor: dark ? "rgba(245, 158, 11, 0.35)" : "#fde68a",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 800, color: dark ? "#fbbf24" : "#b45309", fontVariantNumeric: "tabular-nums" }}>
                {t("invoices.PosLedgerPanel.itemsInOrder", { count: saleLines.length })}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 900,
                  color: dark ? "#fbbf24" : "#b45309",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                Rs. {saleSubtotal.toLocaleString()}
              </Typography>
            </Box>

            <Box
              sx={{
                flexGrow: 1,
                minHeight: 0,
                overflowY: "auto",
                px: { xs: 1.5, sm: 2.5 },
                pb: { xs: 2, sm: 2.5 },
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              {saleLines.map((line) => (
                <SaleCartLineRow
                  key={line.cart_id}
                  line={line}
                  selectedCustomer={selectedCustomer}
                  onUpdate={(patch) => updateSaleLine(line.cart_id, patch)}
                  onRemove={() => removeSaleLine(line.cart_id)}
                />
              ))}
            </Box>
          </>
        ) : (
          rentalCartContent
        )}

        {/* Catalog overlays */}
        {catalogOpen && catalogTab === "rent" && renderRentalCatalog({})}

        {catalogOpen &&
          catalogTab === "all" &&
          renderRentalCatalog({
            retailSection: sellSection,
            extraCount: saleLines.length,
            extraTotal: saleSubtotal,
          })}

        {catalogOpen && catalogTab === "sell" && (
          <Box
            onKeyDown={(e) => {
              if (e.key === "Escape") setCatalogOpen(false);
            }}
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 5,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              bgcolor: dark ? "#0b1220" : "#f8fafc",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 1.5 }}>{sellSection}</Box>
            <Box
              sx={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 1.5,
                py: 1,
                bgcolor: dark ? "#1e293b" : "#ffffff",
                borderTop: 1,
                borderColor: "divider",
              }}
            >
              <Badge
                badgeContent={totalItemsCount}
                color="primary"
                showZero
                sx={{ "& .MuiBadge-badge": { fontWeight: 800, fontVariantNumeric: "tabular-nums" } }}
              >
                <ShoppingCartOutlinedIcon sx={{ fontSize: 24 }} />
              </Badge>
              <Typography sx={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}>
                Rs. {combinedSubtotal.toLocaleString()}
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <Button
                variant="contained"
                disableElevation
                startIcon={<CheckRoundedIcon />}
                onClick={() => setCatalogOpen(false)}
                sx={{ borderRadius: 3, height: 40, px: 2.5, fontWeight: 800, textTransform: "none" }}
              >
                {t("invoices.EquipmentCatalog.done")}
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      <UnlistedItemDialog
        open={unlistedOpen}
        onClose={() => setUnlistedOpen(false)}
        initialName={unlistedPrefill}
        scannedBarcode={unlistedBarcode}
        warehouseId={warehouseId}
        onAdd={handleAddCustomLine}
      />

      <SundryDialog
        open={sundryOpen}
        onClose={() => setSundryOpen(false)}
        warehouseId={warehouseId}
        onAdd={handleAddCustomLine}
      />
    </Box>
  );
}
