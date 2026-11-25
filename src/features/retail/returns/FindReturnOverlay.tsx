import { useEffect, useState } from "react";
import { Alert, Box, ButtonBase, Chip, CircularProgress, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Overlay, useOverlay, type OverlayComponentProps } from "@/components/overlay";
import type { CatalogProduct } from "../api/catalog.types";
import { errorMessage } from "../api/http";
import { RETURN_OVERLAY_ID } from "../catalog/overlayIds";
import { ItemFinder } from "../finder/ItemFinder";
import { formatQty, formatRs } from "../format";
import { fetchReturnFind, type FindReturnRow } from "./returns.api";

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

const useDebounced = <T,>(value: T, ms: number): T => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
};

/** Return an item when the customer has no receipt: pick the item and/or type a customer or bill, then tap the bill. */
function FindReturnOverlay(_props: OverlayComponentProps) {
  const { t } = useTranslation();
  const overlay = useOverlay();
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [picking, setPicking] = useState(false);
  const [text, setText] = useState("");
  const q = useDebounced(text.trim(), 250);
  const ready = !!product || q.length > 0;

  const results = useQuery({
    queryKey: ["retail", "sale-returns", "find", product?.product_id ?? null, q],
    queryFn: () => fetchReturnFind({ q, product_id: product?.product_id ?? null }),
    enabled: ready,
    staleTime: 15_000,
  });
  const rows: FindReturnRow[] = results.data ?? [];

  const open = (r: FindReturnRow) => overlay.open(RETURN_OVERLAY_ID, { invoiceId: r.invoice_id, saleLineId: r.sale_line_id });

  if (picking) {
    return (
      <Overlay title={t("retail.returns.findItem")} width={520}>
        <ItemFinder
          mode="pick"
          allowCreate={false}
          onPick={(p) => {
            setProduct(p);
            setPicking(false);
          }}
        />
      </Overlay>
    );
  }

  return (
    <Overlay title={t("retail.returns.findTitle")} width={520}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }} useFlexGap>
          <Chip
            clickable
            color={product ? "primary" : "default"}
            variant={product ? "filled" : "outlined"}
            label={product ? product.name : t("retail.returns.pickItem")}
            onClick={() => setPicking(true)}
            onDelete={product ? () => setProduct(null) : undefined}
            sx={{ fontWeight: 700, minHeight: 36 }}
          />
        </Stack>
        <TextField
          size="small"
          fullWidth
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("retail.returns.findPlaceholder")}
          slotProps={{
            input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> },
            htmlInput: { "aria-label": t("retail.returns.findPlaceholder") },
          }}
        />

        {!ready && <Alert severity="info">{t("retail.returns.findHint")}</Alert>}
        {results.isLoading && ready && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={22} />
          </Box>
        )}
        {results.isError && <Alert severity="error">{errorMessage(results.error, t("retail.returns.failed"))}</Alert>}
        {ready && !results.isLoading && !results.isError && rows.length === 0 && <Alert severity="warning">{t("retail.returns.findNone")}</Alert>}

        <Stack spacing={0.75} data-testid="return-find-results">
          {rows.map((r) => (
            <ButtonBase
              key={`${r.invoice_id}:${r.sale_line_id}`}
              onClick={() => open(r)}
              sx={{ display: "block", textAlign: "left", p: 1.25, borderRadius: 2, border: 1, borderColor: "divider", "&:hover": { borderColor: "primary.main" } }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
                  {r.description}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, ...NUM }}>
                  {formatRs(r.unit_price)}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={NUM}>
                {r.doc_number}
                {r.issued_date ? ` · ${String(r.issued_date).slice(0, 10)}` : ""}
                {r.customer_name ? ` · ${r.customer_name}` : ""}
              </Typography>
              <Typography variant="caption" sx={{ display: "block", fontWeight: 700, ...NUM }}>
                {t("retail.returns.returnable", { qty: formatQty(r.qty_returnable), sold: formatQty(r.qty_sold), unit: r.unit_label })}
              </Typography>
            </ButtonBase>
          ))}
        </Stack>
      </Stack>
    </Overlay>
  );
}

export default FindReturnOverlay;
