import { Alert, Box, Button, Chip, CircularProgress, Paper, Typography } from "@mui/material";
import AddCircleOutlinedIcon from "@mui/icons-material/AddCircleOutlined";
import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import { useTranslation } from "react-i18next";
import { useOverlay } from "@/components/overlay";
import { formatDateTime } from "@/lib/dates";
import { FINDER_OVERLAY_ID, NEW_ITEM_OVERLAY_ID } from "../catalog/overlayIds";
import { useCanSortUnlisted, useCreateUnlisted, useLinkUnlisted, useOneOffUnlisted, useToSortList } from "./useDesk";

export function ToSortTab() {
  const { t } = useTranslation();
  const { open } = useOverlay();
  const canSort = useCanSortUnlisted();
  const { data, isLoading, isError } = useToSortList(canSort);

  const linkMut = useLinkUnlisted();
  const createMut = useCreateUnlisted();
  const oneOffMut = useOneOffUnlisted();

  if (!canSort) {
    return (
      <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
        <InboxOutlinedIcon sx={{ fontSize: 40, mb: 1 }} />
        <Typography variant="body2">{t("desk.sortLater")}</Typography>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (isError) return <Alert severity="error">{t("desk.loadFailed")}</Alert>;

  const groups = data?.groups ?? [];
  if (groups.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
        <InboxOutlinedIcon sx={{ fontSize: 40, mb: 1 }} />
        <Typography variant="body2">{t("desk.sortLater")}</Typography>
      </Box>
    );
  }

  const busy = linkMut.isPending || createMut.isPending || oneOffMut.isPending;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {(linkMut.isError || createMut.isError || oneOffMut.isError) && (
        <Alert severity="error">{t("desk.decideFailed")}</Alert>
      )}
      {groups.map((g) => (
        <Paper key={g.key} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }} data-testid="to-sort-row">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap", mb: 0.75 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="body1" sx={{ fontWeight: 800 }}>
                {g.description}
              </Typography>
              <Chip
                size="small"
                color="warning"
                label={`×${g.count}`}
                sx={{ height: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
              />
              {g.scanned_barcode && (
                <Chip
                  size="small"
                  variant="outlined"
                  icon={<QrCodeScannerIcon sx={{ fontSize: 13 }} />}
                  label={g.scanned_barcode}
                  sx={{ height: 20, fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem" }}
                />
              )}
            </Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}
            >
              Rs {g.last_price.toLocaleString()}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 1.25 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {t("retail.pos.totalQtyShort", { qty: g.total_qty })}
              {g.last_date ? ` · ${formatDateTime(g.last_date)}` : ""}
            </Typography>
            {g.bills.slice(0, 4).map((b) => (
              <Chip
                key={b.invoice_id}
                size="small"
                variant="outlined"
                label={b.doc_number || `INV-${b.invoice_id}`}
                sx={{ height: 18, fontSize: "0.66rem", fontFamily: "'JetBrains Mono', monospace" }}
              />
            ))}
            {g.bills.length > 4 && (
              <Typography variant="caption" color="text.secondary">
                +{g.bills.length - 4}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<LinkOutlinedIcon />}
              disabled={busy}
              onClick={() =>
                open(FINDER_OVERLAY_ID, {
                  initialQuery: g.description,
                  onPick: (product: { product_id: number }) => {
                    void linkMut.mutateAsync({
                      sale_line_ids: g.sale_line_ids,
                      product_id: product.product_id,
                    });
                  },
                })
              }
              sx={{ minHeight: 38, textTransform: "none", fontWeight: 700 }}
            >
              {t("desk.toSort.link")}
            </Button>
            <Button
              size="small"
              variant="contained"
              disableElevation
              startIcon={<AddCircleOutlinedIcon />}
              disabled={busy}
              onClick={() =>
                open(NEW_ITEM_OVERLAY_ID, {
                  prefillWords: g.description,
                  prefillPrice: g.last_price,
                  prefillBarcode: g.scanned_barcode,
                  showOpeningQty: true,
                  onSubmitPayload: async ({
                    item,
                    opening_qty,
                  }: {
                    item: any;
                    isFamily: boolean;
                    opening_qty?: number | null;
                  }) => {
                    const res = await createMut.mutateAsync({
                      sale_line_ids: g.sale_line_ids,
                      item,
                      ...(opening_qty != null ? { opening_qty } : {}),
                    });
                    return res.products;
                  },
                })
              }
              sx={{ minHeight: 38, textTransform: "none", fontWeight: 800 }}
            >
              {t("desk.toSort.create")}
            </Button>
            <Button
              size="small"
              variant="text"
              color="inherit"
              startIcon={<CheckOutlinedIcon />}
              disabled={busy}
              onClick={() => void oneOffMut.mutateAsync({ sale_line_ids: g.sale_line_ids })}
              sx={{ minHeight: 38, textTransform: "none", fontWeight: 700, ml: "auto" }}
            >
              {t("desk.toSort.oneOff")}
            </Button>
          </Box>
        </Paper>
      ))}
    </Box>
  );
}
