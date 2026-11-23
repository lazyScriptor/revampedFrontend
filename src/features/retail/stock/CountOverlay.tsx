import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  InputBase,
  Menu,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckIcon from "@mui/icons-material/Check";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { useTranslation } from "react-i18next";
import { Overlay, useOverlay, type OverlayComponentProps } from "@/components/overlay";
import { useToast } from "@/components/ui/AppToast";
import { errorMessage } from "../api/http";
import { subtreeIds } from "../catalog/catalogModel";
import { useRetailCatalog, useRetailPermissions } from "../catalog/useRetailCatalog";
import { CatIcon } from "../components/CategoryIcon";
import { Tile } from "../components/Tile";
import { formatQty, formatRs, formatSignedQty } from "../format";
import { computeCountReview, filterCountProducts, type CountMode } from "./countModel";
import { isNotCounted, isTrackableProduct } from "./levelsModel";
import { usePostCount, usePostOpening } from "./stockMutations";
import { useStockLevels } from "./useStockLevels";

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

interface Props extends OverlayComponentProps {
  mode?: CountMode;
  warehouseId?: number | null;
  categoryId?: number | null;
  familyId?: number | null;
}

/**
 * Stock count & Opening stock overlay (plan §7.4):
 * Step 1: Pick a category or family (tiles)
 * Step 2: Blind count by default ("Show system" toggle), optional cost column in opening mode
 * Step 3: Review differences only (or all entered lines in opening mode), then Post
 */
function CountOverlay({ mode: initialMode = "count", warehouseId: initialWhId, categoryId: initialCatId = null, familyId: initialFamId = null }: Props) {
  const { t } = useTranslation();
  const overlay = useOverlay();
  const toast = useToast();
  const { canCost } = useRetailPermissions();
  const { catalog, index } = useRetailCatalog();
  const levels = useStockLevels(initialWhId);
  const postCountMut = usePostCount();
  const postOpeningMut = usePostOpening();

  const [mode, setMode] = useState<CountMode>(initialMode);
  const [selectedWhId, setSelectedWhId] = useState<number | null>(initialWhId ?? null);
  const activeWhId = selectedWhId ?? levels.warehouseId;
  const activeWarehouse = levels.warehouses.find((w) => w.warehouse_id === activeWhId);
  const [whMenu, setWhMenu] = useState<HTMLElement | null>(null);

  const [categoryId, setCategoryId] = useState<number | null>(initialCatId);
  const [familyId, setFamilyId] = useState<number | null>(initialFamId);
  const [step, setStep] = useState<1 | 2 | 3>(initialCatId != null || initialFamId != null ? 2 : 1);

  const [showSystem, setShowSystem] = useState(false);
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [costs, setCosts] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);

  const levelForWh = (pid: number) => levels.levelFor(pid, activeWhId);

  const eligibleFilter = (p: (typeof catalog.products)[number]) =>
    isTrackableProduct(p) && (mode === "count" || isNotCounted(p, levelForWh(p.product_id)));

  // Top-level categories with count of eligible items
  const categoryTiles = useMemo(() => {
    const eligible = catalog.products.filter(eligibleFilter);
    return catalog.categories
      .filter((c) => c.parent_id == null && c.is_active !== false)
      .map((c) => {
        const ids = subtreeIds(index.ctx, c.category_id);
        const count = eligible.filter((p) => p.category_id != null && ids.has(p.category_id)).length;
        return { category: c, count };
      })
      .filter((x) => x.count > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog.categories, catalog.products, index.ctx, mode, activeWhId, levels.levels]);

  const familyTiles = useMemo(() => {
    const eligible = catalog.products.filter(eligibleFilter);
    return catalog.families
      .map((f) => ({
        family: f,
        count: eligible.filter((p) => p.family_id === f.family_id).length,
      }))
      .filter((x) => x.count > 0)
      .slice(0, 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog.families, catalog.products, mode, activeWhId, levels.levels]);

  const totalEligibleCount = useMemo(
    () => catalog.products.filter(eligibleFilter).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalog.products, mode, activeWhId, levels.levels],
  );

  const items = useMemo(
    () => filterCountProducts(catalog, levelForWh, { mode, categoryId, familyId }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalog, mode, categoryId, familyId, activeWhId, levels.levels],
  );

  const review = useMemo(
    () => computeCountReview(items, counts, costs, levelForWh),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, counts, costs, activeWhId, levels.levels],
  );

  const pickScope = (catId: number | null, famId: number | null) => {
    setCategoryId(catId);
    setFamilyId(famId);
    setCounts({});
    setCosts({});
    setError(null);
    setStep(2);
  };

  const handleCountKeyDown = (e: KeyboardEvent<HTMLInputElement>, rowIdx: number) => {
    if (e.key !== "Enter" && e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    if (e.nativeEvent.isComposing) return;
    const delta = e.key === "ArrowUp" ? -1 : 1;
    const next = tableRef.current?.querySelector<HTMLInputElement>(`[data-count-input="${rowIdx + delta}"]`);
    if (next) {
      e.preventDefault();
      next.focus();
      next.select();
    }
  };

  const busy = postCountMut.isPending || postOpeningMut.isPending;

  const handlePost = async () => {
    setError(null);
    if (review.enteredLines.length === 0) {
      setError(t("retail.count.noneEntered"));
      return;
    }
    try {
      if (mode === "opening") {
        const doc = await postOpeningMut.mutateAsync({
          warehouse_id: activeWhId ?? undefined,
          lines: review.enteredLines.map((r) => ({
            product_id: r.product.product_id,
            qty: r.countedQty,
            ...(canCost && r.unitCost !== null ? { unit_cost: r.unitCost } : {}),
          })),
        });
        toast.showSuccess(t("retail.count.postedToast", { docNo: doc.doc_no }));
      } else {
        const doc = await postCountMut.mutateAsync({
          warehouse_id: activeWhId ?? undefined,
          lines: review.enteredLines.map((r) => ({
            product_id: r.product.product_id,
            counted_qty: r.countedQty,
          })),
        });
        toast.showSuccess(t("retail.count.postedToast", { docNo: doc.doc_no }));
      }
      await overlay.close();
    } catch (err) {
      setError(errorMessage(err, t("retail.item.saveFailed")));
    }
  };

  const scopeTitle =
    familyId != null
      ? index.ctx.families.get(familyId)?.name
      : categoryId != null
        ? index.ctx.categories.get(categoryId)?.name
        : t("retail.count.allNotCounted");

  const headerActions = (
    <Stack direction="row" spacing={0.75}>
      <Chip
        size="small"
        clickable
        label={t("retail.count.modeCount")}
        color={mode === "count" ? "primary" : "default"}
        variant={mode === "count" ? "filled" : "outlined"}
        onClick={() => {
          setMode("count");
          setStep(1);
        }}
      />
      <Chip
        size="small"
        clickable
        label={t("retail.count.modeOpening")}
        color={mode === "opening" ? "primary" : "default"}
        variant={mode === "opening" ? "filled" : "outlined"}
        onClick={() => {
          setMode("opening");
          setStep(1);
        }}
      />
    </Stack>
  );

  const footer =
    step === 2 ? (
      <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => setStep(1)} sx={{ minHeight: 44 }}>
          {t("common.back")}
        </Button>
        <Typography variant="body2" color="text.secondary" sx={NUM}>
          {t("retail.count.enteredCount", { entered: review.enteredLines.length, total: items.length })}
        </Typography>
        <Button
          variant="contained"
          endIcon={<NavigateNextIcon />}
          disabled={review.enteredLines.length === 0}
          onClick={() => {
            setError(null);
            setStep(3);
          }}
          sx={{ minHeight: 44 }}
        >
          {t("retail.count.review")}
        </Button>
      </Stack>
    ) : step === 3 ? (
      <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => setStep(2)} sx={{ minHeight: 44 }}>
          {t("common.back")}
        </Button>
        <Button variant="contained" startIcon={<CheckIcon />} disabled={busy || review.enteredLines.length === 0} onClick={() => void handlePost()} sx={{ minHeight: 44 }}>
          {t("retail.stockIn.post")}
        </Button>
      </Stack>
    ) : undefined;

  const reviewRows = mode === "count" ? review.differences : review.enteredLines;

  return (
    <Overlay
      title={mode === "opening" ? t("retail.count.openingTitle") : t("retail.count.title")}
      width={680}
      headerActions={headerActions}
      footer={footer}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {levels.warehouses.length > 1 && (
          <Box>
            <Chip
              size="small"
              clickable
              icon={<LocationOnOutlinedIcon fontSize="small" />}
              deleteIcon={<KeyboardArrowDownIcon fontSize="small" />}
              onDelete={(e) => setWhMenu(e.currentTarget as HTMLElement)}
              onClick={(e) => setWhMenu(e.currentTarget)}
              label={activeWarehouse?.location_name ?? t("retail.stock.location")}
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
            <Menu anchorEl={whMenu} open={!!whMenu} onClose={() => setWhMenu(null)}>
              {levels.warehouses.map((w) => (
                <MenuItem
                  key={w.warehouse_id}
                  selected={w.warehouse_id === activeWhId}
                  onClick={() => {
                    setSelectedWhId(w.warehouse_id);
                    setWhMenu(null);
                  }}
                >
                  {w.location_name}
                </MenuItem>
              ))}
            </Menu>
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {step === 1 && (
          <Stack spacing={2}>
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, display: "block", mb: 1 }}>
                {t("retail.count.pickCategory")}
              </Typography>
              {categoryTiles.length === 0 && totalEligibleCount === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {mode === "opening" ? t("retail.count.nothingUncounted") : t("retail.stock.empty")}
                </Typography>
              ) : (
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }} data-testid="count-category-tiles">
                  {mode === "opening" && totalEligibleCount > 0 && (
                    <Tile
                      dense
                      label={t("retail.count.allNotCounted")}
                      count={totalEligibleCount}
                      onClick={() => pickScope(null, null)}
                    />
                  )}
                  {categoryTiles.map(({ category, count }) => (
                    <Tile
                      key={category.category_id}
                      dense
                      label={category.name}
                      count={count}
                      imageUrl={category.image_url}
                      media={<CatIcon name={category.icon} fontSize="medium" />}
                      onClick={() => pickScope(category.category_id, null)}
                    />
                  ))}
                </Stack>
              )}
            </Box>

            {familyTiles.length > 0 && (
              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, display: "block", mb: 1 }}>
                  {t("retail.count.orFamily")}
                </Typography>
                <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
                  {familyTiles.map(({ family, count }) => (
                    <Chip
                      key={family.family_id}
                      clickable
                      variant="outlined"
                      label={`${family.name} (${count})`}
                      onClick={() => pickScope(null, family.family_id)}
                      sx={{ minHeight: 36, fontWeight: 700, ...NUM }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        )}

        {step === 2 && (
          <Stack spacing={1.25}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {scopeTitle}
              </Typography>
              {mode === "count" && (
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={showSystem}
                      onChange={(_, v) => setShowSystem(v)}
                    />
                  }
                  label={
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                      {showSystem ? <VisibilityOutlinedIcon fontSize="small" /> : <VisibilityOffOutlinedIcon fontSize="small" />}
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {t("retail.count.showSystem")}
                      </Typography>
                    </Stack>
                  }
                />
              )}
            </Stack>

            <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflowX: "auto" }}>
              <Table size="small" ref={tableRef}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>{t("retail.stock.colName")}</TableCell>
                    {mode === "count" && showSystem && (
                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        {t("retail.count.system")}
                      </TableCell>
                    )}
                    <TableCell align="right" sx={{ fontWeight: 800, width: 110 }}>
                      {mode === "opening" ? t("retail.count.openingQty") : t("retail.count.counted")}
                    </TableCell>
                    {mode === "opening" && canCost && (
                      <TableCell align="right" sx={{ fontWeight: 800, width: 120 }}>
                        {t("retail.item.cost")}
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((p, rowIdx) => {
                    const sys = levelForWh(p.product_id)?.qty_on_hand ?? 0;
                    return (
                      <TableRow key={p.product_id} data-testid={`count-row-${p.product_id}`}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {p.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={NUM}>
                            {p.code} · {p.base_unit ?? "pcs"}
                          </Typography>
                        </TableCell>
                        {mode === "count" && showSystem && (
                          <TableCell align="right" sx={NUM}>
                            {formatQty(sys, p.allow_decimal !== false)}
                          </TableCell>
                        )}
                        <TableCell align="right" sx={{ p: 0.75 }}>
                          <InputBase
                            fullWidth
                            value={counts[p.product_id] ?? ""}
                            placeholder="—"
                            onChange={(e) => setCounts((cur) => ({ ...cur, [p.product_id]: e.target.value }))}
                            onKeyDown={(e) => handleCountKeyDown(e as KeyboardEvent<HTMLInputElement>, rowIdx)}
                            slotProps={{
                              input: {
                                inputMode: p.allow_decimal ? "decimal" : "numeric",
                                "aria-label": `${t("retail.count.counted")} ${p.name}`,
                                style: { textAlign: "right", fontWeight: 700, fontSize: 14, ...NUM },
                                ...({ "data-count-input": rowIdx } as Record<string, unknown>),
                              },
                            }}
                            sx={(theme) => ({
                              border: 1,
                              borderColor: (counts[p.product_id] ?? "").trim() !== "" ? "primary.main" : "divider",
                              borderRadius: 1,
                              px: 1,
                              py: 0.35,
                              bgcolor: (counts[p.product_id] ?? "").trim() !== "" ? alpha(theme.palette.primary.main, 0.08) : "background.default",
                            })}
                          />
                        </TableCell>
                        {mode === "opening" && canCost && (
                          <TableCell align="right" sx={{ p: 0.75 }}>
                            <InputBase
                              fullWidth
                              value={costs[p.product_id] ?? ""}
                              placeholder={p.avg_cost != null ? String(p.avg_cost) : "0"}
                              onChange={(e) => setCosts((cur) => ({ ...cur, [p.product_id]: e.target.value }))}
                              slotProps={{
                                input: {
                                  inputMode: "decimal",
                                  "aria-label": `${t("retail.item.cost")} ${p.name}`,
                                  style: { textAlign: "right", fontSize: 13, ...NUM },
                                },
                              }}
                              sx={{ border: 1, borderColor: "divider", borderRadius: 1, px: 1, py: 0.35, bgcolor: "background.default" }}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Stack>
        )}

        {step === 3 && (
          <Stack spacing={1.25} data-testid="count-review">
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {mode === "opening" ? t("retail.count.reviewOpening") : t("retail.count.reviewDiffs")}
              </Typography>
              {mode === "count" && (
                <Chip
                  size="small"
                  label={t("retail.count.diffSummary", { changed: review.differences.length, unchanged: review.unchangedCount })}
                  sx={NUM}
                />
              )}
            </Stack>

            {reviewRows.length === 0 ? (
              <Alert severity="success">{t("retail.count.noDifferences")}</Alert>
            ) : (
              <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>{t("retail.stock.colName")}</TableCell>
                      {mode === "count" && (
                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                          {t("retail.count.system")}
                        </TableCell>
                      )}
                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        {mode === "opening" ? t("retail.count.openingQty") : t("retail.count.counted")}
                      </TableCell>
                      {mode === "count" && (
                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                          {t("retail.count.difference")}
                        </TableCell>
                      )}
                      {canCost && (
                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                          {mode === "opening" ? t("retail.item.cost") : t("retail.count.valueImpact")}
                        </TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reviewRows.map((r) => (
                      <TableRow key={r.product.product_id} data-testid={`review-row-${r.product.product_id}`}>
                        <TableCell>{r.product.name}</TableCell>
                        {mode === "count" && (
                          <TableCell align="right" sx={NUM}>
                            {formatQty(r.systemQty, r.product.allow_decimal !== false)}
                          </TableCell>
                        )}
                        <TableCell align="right" sx={{ fontWeight: 700, ...NUM }}>
                          {formatQty(r.countedQty, r.product.allow_decimal !== false)}
                        </TableCell>
                        {mode === "count" && (
                          <TableCell
                            align="right"
                            sx={{ fontWeight: 800, color: r.diff > 0 ? "success.main" : "error.main", ...NUM }}
                          >
                            {formatSignedQty(r.diff, r.product.allow_decimal !== false)}
                          </TableCell>
                        )}
                        {canCost && (
                          <TableCell align="right" sx={NUM}>
                            {mode === "opening"
                              ? r.unitCost != null
                                ? formatRs(r.unitCost)
                                : "—"
                              : r.valueImpact != null
                                ? formatRs(r.valueImpact)
                                : "—"}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Stack>
        )}
      </Box>
    </Overlay>
  );
}

export default CountOverlay;
