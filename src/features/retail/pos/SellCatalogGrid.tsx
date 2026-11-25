import { useMemo } from "react";
import { Box, Button, Chip, Paper, Stack, Tooltip, Typography } from "@mui/material";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { useTranslation } from "react-i18next";
import { resolveAssetUrl } from "@/lib/assetUrl";
import type { CatalogProduct } from "../api/catalog.types";
import { groupProducts, searchGroups } from "../catalog/catalogModel";
import { formatVariant } from "../catalog/names";
import { useRetailCatalog } from "../catalog/useRetailCatalog";
import { useRetailSettings } from "../hooks/useRetailSettings";
import { useStockLevels } from "../stock/useStockLevels";
import { StockDot } from "../components/StockDot";
import { CatIcon } from "../components/CategoryIcon";
import { resolveCatalogPrice, type CustomerPriceLevel } from "./posPricing";

interface Props {
  searchQuery: string;
  priceLevel: CustomerPriceLevel;
  warehouseId: number | null;
  cartQtyByProductId?: Map<number, number>;
  onAddProduct: (product: CatalogProduct) => void;
  onAddUnlisted: (prefill: string) => void;
}

export function SellCatalogGrid({
  searchQuery,
  priceLevel,
  warehouseId,
  cartQtyByProductId,
  onAddProduct,
  onAddUnlisted,
}: Props) {
  const { t } = useTranslation();
  const { catalog, index } = useRetailCatalog();
  const { settings } = useRetailSettings();
  const { statusFor, qtyFor } = useStockLevels(warehouseId);
  const showContractor = settings.showContractorPrice ?? true;

  const groups = useMemo(() => {
    const q = searchQuery.trim();
    if (q) return searchGroups(index, q, { limit: 40 });
    const active = catalog.products.filter((p) => p.is_active !== false);
    return groupProducts(active, index.ctx)
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 60);
  }, [searchQuery, index, catalog.products]);

  const showTierTag = showContractor && (priceLevel === "contractor" || priceLevel === "trade");

  if (groups.length === 0) {
    return (
      <Box
        data-testid="sell-empty-state"
        sx={{
          minHeight: 160,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5,
          textAlign: "center",
          py: 3,
          px: 2,
        }}
      >
        <SearchOffIcon sx={{ fontSize: 32, color: "text.disabled" }} />
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
          {t("retail.pos.noRetailMatches")}
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<AddOutlinedIcon />}
          onClick={() => onAddUnlisted(searchQuery.trim())}
          sx={{ borderRadius: 2.5, fontWeight: 800, textTransform: "none", minHeight: 42 }}
        >
          {t("retail.pos.addUnlistedBtn")}
        </Button>
      </Box>
    );
  }

  return (
    <Box data-testid="sell-catalog-grid" sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fill, minmax(220px, 1fr))" },
          gap: 1,
        }}
      >
        {groups.map((g) => {
          const isFamily = g.familyId != null || g.products.length > 1;
          const lead = g.products[0];
          if (!lead) return null;
          const cat = g.categoryId != null ? index.ctx.categories.get(g.categoryId) : undefined;
          const img = g.products.find((p) => p.image_url)?.image_url ?? null;

          if (!isFamily) {
            const { unit_price, price_source } = resolveCatalogPrice(lead, null, priceLevel, showContractor);
            const st = statusFor(lead, warehouseId);
            const qty = qtyFor(lead.product_id, warehouseId);
            const inCart = cartQtyByProductId?.get(lead.product_id) ?? 0;
            const unitName = lead.base_unit || "pcs";

            return (
              <Paper
                key={g.key}
                role="button"
                tabIndex={0}
                variant="outlined"
                data-testid={`sell-card-${lead.product_id}`}
                onClick={() => onAddProduct(lead)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onAddProduct(lead);
                  }
                }}
                sx={{
                  p: 1.25,
                  borderRadius: 2.5,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  bgcolor: "background.paper",
                  borderColor: inCart > 0 ? "primary.main" : "divider",
                  "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
                }}
              >
                {img ? (
                  <Box
                    component="img"
                    src={resolveAssetUrl(img) || undefined}
                    alt=""
                    sx={{ width: 40, height: 40, objectFit: "contain", borderRadius: 1, flexShrink: 0 }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1.5,
                      bgcolor: "action.selected",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "primary.main",
                      flexShrink: 0,
                    }}
                  >
                    <CatIcon name={cat?.icon} sx={{ fontSize: 22 }} />
                  </Box>
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <StockDot status={st} tooltip={`${qty} ${unitName}`} />
                    <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.25 }} noWrap>
                      {lead.name}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.25, flexWrap: "wrap" }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        color: "primary.main",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      Rs {unit_price.toLocaleString()} / {unitName}
                    </Typography>
                    {showTierTag && price_source !== "retail" && (
                      <Chip
                        size="small"
                        color="warning"
                        label={price_source === "trade" ? t("retail.pos.tradePrice") : t("retail.pos.contractorPrice")}
                        sx={{ height: 18, fontSize: "0.62rem", fontWeight: 800 }}
                      />
                    )}
                    {inCart > 0 && (
                      <Chip
                        size="small"
                        color="primary"
                        label={`×${inCart}`}
                        sx={{ height: 18, fontSize: "0.65rem", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
                      />
                    )}
                  </Box>
                </Box>
              </Paper>
            );
          }

          // Family card with size chips
          return (
            <Paper
              key={g.key}
              variant="outlined"
              data-testid={`sell-family-${g.familyId ?? g.key}`}
              sx={{
                p: 1.25,
                borderRadius: 2.5,
                bgcolor: "background.paper",
                display: "flex",
                flexDirection: "column",
                gap: 0.75,
                gridColumn: { sm: "span 2" },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {img ? (
                  <Box
                    component="img"
                    src={resolveAssetUrl(img) || undefined}
                    alt=""
                    sx={{ width: 32, height: 32, objectFit: "contain", borderRadius: 1, flexShrink: 0 }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1,
                      bgcolor: "action.selected",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "primary.main",
                      flexShrink: 0,
                    }}
                  >
                    <CatIcon name={cat?.icon} sx={{ fontSize: 18 }} />
                  </Box>
                )}
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.2 }} noWrap>
                    {g.name}
                  </Typography>
                  {(g.brandName || g.categoryPath) && (
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", fontSize: "0.7rem" }}>
                      {[g.brandName, g.categoryPath].filter(Boolean).join(" · ")}
                    </Typography>
                  )}
                </Box>
                {showTierTag && (
                  <Chip
                    size="small"
                    color="warning"
                    variant="outlined"
                    label={priceLevel === "trade" ? t("retail.pos.tradePrice") : t("retail.pos.contractorPrice")}
                    sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }}
                  />
                )}
              </Box>

              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
                {g.products.map((p) => {
                  const { unit_price } = resolveCatalogPrice(p, null, priceLevel, showContractor);
                  const st = statusFor(p, warehouseId);
                  const qty = qtyFor(p.product_id, warehouseId);
                  const sizeLabel = formatVariant(p.variant_label, g.optionUnit) || p.name;
                  const matched = g.matchedIds.has(p.product_id);
                  const inCart = cartQtyByProductId?.get(p.product_id) ?? 0;

                  return (
                    <Tooltip
                      key={p.product_id}
                      title={`${p.name} · Rs ${unit_price.toLocaleString()} (${qty} ${p.base_unit || "pcs"})`}
                    >
                      <Chip
                        clickable
                        onClick={() => onAddProduct(p)}
                        color={inCart > 0 || matched ? "primary" : "default"}
                        variant={inCart > 0 ? "filled" : matched ? "outlined" : "outlined"}
                        icon={<StockDot status={st} size={7} />}
                        label={`${sizeLabel} · Rs ${unit_price.toLocaleString()}${inCart > 0 ? ` (${inCart})` : ""}`}
                        data-testid={`size-chip-${p.product_id}`}
                        sx={{
                          minHeight: 32,
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          "& .MuiChip-icon": { ml: 0.75 },
                        }}
                      />
                    </Tooltip>
                  );
                })}
              </Stack>
            </Paper>
          );
        })}
      </Box>

      {searchQuery.trim().length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "center", pt: 0.5 }}>
          <Button
            size="small"
            variant="text"
            startIcon={<AddOutlinedIcon />}
            onClick={() => onAddUnlisted(searchQuery.trim())}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {t("retail.pos.addUnlistedBtn")}
          </Button>
        </Box>
      )}
    </Box>
  );
}
