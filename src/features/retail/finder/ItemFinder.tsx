import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HistoryIcon from "@mui/icons-material/History";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useOverlay } from "@/components/overlay";
import { useToast } from "@/components/ui/AppToast";
import { errorMessage } from "../api/http";
import { fetchProduct, finderBrowse, finderSearch, lookupProduct } from "../api/catalog.api";
import type { CatalogProduct, CatalogUnit, FinderGroup } from "../api/catalog.types";
import { CatIcon } from "../components/CategoryIcon";
import { Tile } from "../components/Tile";
import { formatRs } from "../format";
import {
  browseView,
  lookupLocal,
  searchGroups,
  type BrowseNodeVM,
  type BrowseSelection,
  type ProductGroup,
} from "../catalog/catalogModel";
import { formatVariant } from "../catalog/names";
import { useLearnBarcode } from "../catalog/mutations";
import { useRetailCatalog, useRetailPermissions } from "../catalog/useRetailCatalog";
import { useScanDetector } from "../catalog/scanDetector";

import { NEW_ITEM_OVERLAY_ID } from "../catalog/overlayIds";

export interface ItemFinderProps {
  /** Called with the chosen item (and the pack unit when a pack barcode was scanned). */
  onPick: (product: CatalogProduct, unit?: CatalogUnit | null) => void;
  /** 'browse' shows prices and codes (Stock page); 'pick' is the compact chooser (Stock in, POS). */
  mode?: "browse" | "pick";
  /** Offer "Create here" when nothing matches. */
  allowCreate?: boolean;
  /** A scanned code to resolve as soon as the finder opens. */
  initialScan?: string;
  initialQuery?: string;
  autoFocus?: boolean;
}

/** One row of results, whether it came from the local index or the server fallback. */
interface Row {
  key: string;
  name: string;
  sub: string;
  variants: Array<{ id: number; label: string; price: number; code?: string; matched: boolean }>;
}

const rowFromGroup = (g: ProductGroup): Row => ({
  key: g.key,
  name: g.name,
  sub: [g.brandName, g.categoryPath].filter(Boolean).join(" · "),
  variants: g.products.map((p) => ({
    id: p.product_id,
    label: g.products.length === 1 && !p.variant_label ? "" : formatVariant(p.variant_label, g.optionUnit) || p.name,
    price: p.sell_price,
    code: p.code,
    matched: g.matchedIds.size === 0 || g.matchedIds.has(p.product_id),
  })),
});

const rowFromServer = (g: FinderGroup, i: number): Row => ({
  key: `s${g.family.id ?? i}-${g.variants[0]?.product_id ?? i}`,
  name: g.family.name,
  sub: [g.family.brand, g.family.category_path].filter(Boolean).join(" · "),
  variants: g.variants.map((v) => ({ id: v.product_id, label: v.variant_label ?? "", price: v.sell_price, code: v.code, matched: true })),
});

export function ItemFinder({ onPick, mode = "pick", allowCreate = true, initialScan, initialQuery = "", autoFocus = true }: ItemFinderProps) {
  const { t } = useTranslation();
  const overlay = useOverlay();
  const toast = useToast();
  const { canManage, canLearnBarcode } = useRetailPermissions();
  const { catalog, index, ready, isError } = useRetailCatalog();
  const learn = useLearnBarcode();

  const [query, setQuery] = useState(initialQuery);
  const deferred = useDeferredValue(query);
  const [sel, setSel] = useState<BrowseSelection>({});
  const [notFound, setNotFound] = useState<string | null>(null);
  /** A barcode we do not know: the next item chosen gets it. */
  const [learning, setLearning] = useState<{ barcode: string; product?: CatalogProduct } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scanned = useRef(false);

  const words = deferred.trim();

  // ── Results ────────────────────────────────────────────────────────────────
  const localRows = useMemo<Row[] | null>(
    () => (ready && words ? searchGroups(index, words, { limit: 40 }).map(rowFromGroup) : null),
    [ready, words, index],
  );
  const serverSearch = useQuery({
    queryKey: ["retail", "finder-search", words],
    queryFn: () => finderSearch(words),
    enabled: !ready && words.length >= 2,
    staleTime: 30_000,
  });
  const rows: Row[] = localRows ?? (serverSearch.data ?? []).map(rowFromServer);
  const searching = !!words && !ready && serverSearch.isFetching;

  // ── Tap-through ────────────────────────────────────────────────────────────
  const localBrowse = useMemo(() => (ready ? browseView(index, sel) : null), [ready, index, sel]);
  const serverBrowse = useQuery({
    queryKey: ["retail", "finder-browse", sel],
    queryFn: () => finderBrowse({ category_id: sel.subCategory ?? sel.category ?? undefined, brand_id: sel.brand ?? undefined }),
    enabled: !ready && isError,
    staleTime: 60_000,
  });
  const browse = localBrowse
    ? { level: localBrowse.level, nodes: localBrowse.nodes, rows: localBrowse.groups.map(rowFromGroup) }
    : serverBrowse.data
      ? {
          level: serverBrowse.data.level,
          nodes: serverBrowse.data.nodes.map<BrowseNodeVM>((n) => ({ id: n.id, name: n.name, icon: n.icon, image_url: n.image_url, count: n.count ?? 0 })),
          rows: serverBrowse.data.groups.map(rowFromServer),
        }
      : null;

  const recent = useMemo(() => {
    if (!ready) return [] as CatalogProduct[];
    const stamp = (p: CatalogProduct) => Math.max(Date.parse(p.last_sold_at ?? "") || 0, Date.parse(p.last_received_at ?? "") || 0);
    return catalog.products
      .filter((p) => stamp(p) > 0)
      .sort((a, b) => stamp(b) - stamp(a))
      .slice(0, 8);
  }, [ready, catalog.products]);

  // ── Choosing ───────────────────────────────────────────────────────────────
  const finish = (product: CatalogProduct, unit?: CatalogUnit | null) => {
    setLearning(null);
    onPick(product, unit ?? null);
  };

  const learnInto = async (product: CatalogProduct, unit: CatalogUnit | null) => {
    if (!learning) return;
    setBusy(true);
    setError(null);
    try {
      await learn.mutateAsync({ barcode: learning.barcode, product_id: product.product_id, unit_id: unit?.unit_id ?? null });
      toast.showSuccess(t("retail.finder.barcodeSaved", { name: product.name }));
      finish(product, unit);
    } catch (err: any) {
      // 409: the barcode is already on another item; the server names it.
      const other = err?.response?.data?.product_name ?? err?.response?.data?.data?.name;
      setError(
        err?.response?.status === 409
          ? t("retail.finder.barcodeTaken", { name: other ?? errorMessage(err, "") })
          : errorMessage(err, t("retail.finder.barcodeFailed")),
      );
    } finally {
      setBusy(false);
    }
  };

  const choose = async (id: number) => {
    let product = index.byId.get(id);
    if (!product) {
      try {
        product = await fetchProduct(id);
      } catch (err) {
        setError(errorMessage(err, t("retail.finder.loadFailed")));
        return;
      }
    }
    if (learning) {
      if (product.units && product.units.length > 0) setLearning({ ...learning, product });
      else await learnInto(product, null);
      return;
    }
    finish(product, null);
  };

  // ── Scanning ───────────────────────────────────────────────────────────────
  const handleScan = async (code: string) => {
    setQuery("");
    setError(null);
    setNotFound(null);
    const local = ready ? lookupLocal(index, code) : null;
    let found: { product: CatalogProduct; unit: CatalogUnit | null } | null = null;
    if (local) {
      found = { product: local.product, unit: local.unit_id != null ? (local.product.units ?? []).find((u) => u.unit_id === local.unit_id) ?? null : null };
    } else {
      try {
        found = await lookupProduct(code);
      } catch (err) {
        setError(errorMessage(err, t("retail.finder.loadFailed")));
        return;
      }
    }
    if (found) finish(found.product, found.unit);
    else if (canLearnBarcode) setLearning({ barcode: code });
    else setNotFound(code);
  };
  useScanDetector((code) => void handleScan(code));

  useEffect(() => {
    if (initialScan && !scanned.current && (ready || isError)) {
      scanned.current = true;
      void handleScan(initialScan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialScan, ready, isError]);

  const createHere = () =>
    overlay.open(NEW_ITEM_OVERLAY_ID, {
      prefillWords: query.trim(),
      onCreated: (products: CatalogProduct[]) => {
        if (products.length === 1) finish(products[0], null);
      },
    });

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    // A scanner's Enter is handled (and stopped) by the scan detector before it gets here.
    const first = rows[0];
    if (!first) return;
    e.preventDefault();
    const v = first.variants.find((x) => x.matched) ?? first.variants[0];
    if (v) void choose(v.id);
  };

  // ── Rendering ──────────────────────────────────────────────────────────────
  const renderRow = (r: Row) => (
    <Box
      key={r.key}
      data-testid="finder-row"
      sx={{ py: 1, borderBottom: 1, borderColor: "divider", display: "flex", flexDirection: "column", gap: 0.5 }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
          {r.name}
        </Typography>
        {r.sub && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {r.sub}
          </Typography>
        )}
      </Stack>
      <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
        {r.variants.map((v) => (
          <Tooltip key={v.id} title={[formatRs(v.price), v.code].filter(Boolean).join(" · ")}>
            <Chip
              clickable
              disabled={busy}
              onClick={() => void choose(v.id)}
              color={v.matched ? "primary" : "default"}
              variant={v.matched ? "filled" : "outlined"}
              label={
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {v.label || formatRs(v.price)}
                  {mode === "browse" && v.label ? <span style={{ opacity: 0.75 }}>{`  ${formatRs(v.price)}`}</span> : null}
                </span>
              }
              sx={{ minHeight: 32, fontWeight: 700 }}
            />
          </Tooltip>
        ))}
      </Stack>
    </Box>
  );

  const crumbs = [
    sel.category != null ? (index.ctx.categories.get(sel.category)?.name ?? "") : "",
    sel.subCategory != null ? (index.ctx.categories.get(sel.subCategory)?.name ?? "") : "",
    sel.brand != null ? (sel.brand === 0 ? t("retail.finder.noBrand") : (index.ctx.brands.get(sel.brand)?.name ?? "")) : "",
  ].filter(Boolean);

  const goBack = () => {
    if (sel.brand != null) setSel({ ...sel, brand: null });
    else if (sel.subCategory != null) setSel({ category: sel.category });
    else setSel({});
  };

  const pickNode = (n: BrowseNodeVM) => {
    const level = browse?.level;
    if (level === "categories") setSel({ category: n.id });
    else if (level === "subcategories") setSel({ category: sel.category, subCategory: n.id });
    else if (level === "brands") setSel({ ...sel, brand: n.id });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {learning && (
        <Alert severity="info" icon={<QrCodeScannerIcon />} data-testid="learn-banner" action={<Button size="small" onClick={() => setLearning(null)}>{t("common.cancel")}</Button>}>
          <Typography variant="body2" sx={{ fontWeight: 800 }}>
            {t("retail.finder.newBarcode")}
          </Typography>
          <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {learning.barcode}
          </Typography>
        </Alert>
      )}
      {notFound && (
        <Alert severity="warning" onClose={() => setNotFound(null)}>
          {t("retail.finder.unknownBarcode", { code: notFound })}
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {learning?.product ? (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 800, mb: 1 }}>
            {learning.product.name}: {t("retail.finder.barcodeIsFor")}
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
            <Chip clickable color="primary" label={t("retail.finder.single")} onClick={() => void learnInto(learning.product!, null)} sx={{ minHeight: 36, fontWeight: 700 }} />
            {(learning.product.units ?? []).map((u) => (
              <Chip key={u.unit_name} clickable variant="outlined" label={`${u.unit_name} (${u.factor})`} onClick={() => void learnInto(learning.product!, u)} sx={{ minHeight: 36, fontWeight: 700, fontVariantNumeric: "tabular-nums" }} />
            ))}
          </Stack>
        </Box>
      ) : (
        <>
          <TextField
            autoFocus={autoFocus}
            fullWidth
            size="small"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("retail.finder.placeholder")}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: searching ? <CircularProgress size={16} /> : (
                  <Tooltip title={t("retail.finder.scanHint")}>
                    <QrCodeScannerIcon fontSize="small" color="action" />
                  </Tooltip>
                ),
              },
              htmlInput: { "data-scan": "true", "aria-label": t("retail.finder.placeholder"), autoComplete: "off" },
            }}
          />

          {words ? (
            rows.length > 0 ? (
              <Box data-testid="finder-results">{rows.map(renderRow)}</Box>
            ) : searching ? null : (
              <Box sx={{ textAlign: "center", py: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {t("retail.finder.nothing")}
                </Typography>
                {allowCreate && canManage && (
                  <Button variant="contained" startIcon={<AddIcon />} onClick={createHere}>
                    {t("retail.finder.createHere")}
                  </Button>
                )}
              </Box>
            )
          ) : (
            <Box>
              {recent.length > 0 && !crumbs.length && (
                <Box sx={{ mb: 1.5 }}>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", mb: 0.5, color: "text.secondary" }}>
                    <HistoryIcon sx={{ fontSize: 16 }} />
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {t("retail.finder.recent")}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
                    {recent.map((p) => (
                      <Chip key={p.product_id} clickable size="small" variant="outlined" label={p.name} onClick={() => void choose(p.product_id)} />
                    ))}
                  </Stack>
                </Box>
              )}
              {crumbs.length > 0 && (
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", mb: 1 }}>
                  <Button size="small" startIcon={<ArrowBackIcon />} onClick={goBack}>
                    {t("common.back")}
                  </Button>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {crumbs.join(" › ")}
                  </Typography>
                </Stack>
              )}
              {!browse ? (
                <Box sx={{ textAlign: "center", py: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : browse.level === "items" ? (
                <Box data-testid="finder-results">{browse.rows.map(renderRow)}</Box>
              ) : browse.nodes.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                  {t("retail.finder.empty")}
                </Typography>
              ) : (
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }} data-testid="browse-nodes">
                  {browse.nodes.map((n) => (
                    <Tile
                      key={n.id}
                      dense
                      label={n.name || t("retail.finder.noBrand")}
                      count={n.count}
                      imageUrl={n.image_url}
                      media={<CatIcon name={n.icon} fontSize="medium" />}
                      onClick={() => pickNode(n)}
                    />
                  ))}
                </Stack>
              )}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
