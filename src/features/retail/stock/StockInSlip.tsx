import { createPortal } from "react-dom";
import { Box, Divider, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { StockDocument } from "../api/stock.types";
import { formatQty, formatRs } from "../format";

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

interface Props {
  doc: StockDocument | null;
  canCost: boolean;
}

/**
 * Print-only A4 Goods Received Note / Stock-In slip.
 * Rendered via portal into document.body under `.retail-print-portal`; visible only when
 * `body.retail-printing` is active during `window.print()`, so normal app & invoice thermal
 * printing stay unaffected.
 */
export function StockInSlip({ doc, canCost }: Props) {
  const { t } = useTranslation();
  if (!doc || typeof document === "undefined") return null;

  return createPortal(
    <Box className="retail-print-portal" sx={{ display: "none", "@media print": { display: "block", p: 3, color: "#000", bgcolor: "#fff" } }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {t("retail.stockIn.slipTitle")}
          </Typography>
          <Typography variant="body2" sx={NUM}>
            {doc.doc_no}
          </Typography>
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Typography variant="body2">
            {t("retail.stockIn.supplier")}: <strong>{doc.supplier_name || "—"}</strong>
          </Typography>
          {doc.supplier_ref && (
            <Typography variant="body2" sx={NUM}>
              {t("retail.stockIn.billNo")}: {doc.supplier_ref}
            </Typography>
          )}
          <Typography variant="body2">
            {t("retail.stock.location")}: {doc.location_name || `#${doc.warehouse_id}`}
          </Typography>
          <Typography variant="body2" sx={NUM}>
            {new Date(doc.occurred_at).toLocaleDateString()}
          </Typography>
        </Box>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>{t("retail.stock.colName")}</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              {t("retail.stockIn.qtyRow")}
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              {t("retail.stockIn.baseQty")}
            </TableCell>
            {canCost && (
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                {t("retail.stockIn.costLabel")}
              </TableCell>
            )}
            {canCost && (
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                {t("retail.stockIn.lineTotal")}
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {doc.lines.map((l, idx) => (
            <TableRow key={l.line_id ?? idx}>
              <TableCell>
                {l.product_name ?? `#${l.product_id}`}
                {l.product_code ? ` (${l.product_code})` : ""}
              </TableCell>
              <TableCell align="right" sx={NUM}>
                {formatQty(l.qty)} {l.unit_name ?? l.base_unit ?? ""}
              </TableCell>
              <TableCell align="right" sx={NUM}>
                {formatQty(l.base_qty)} {l.base_unit ?? ""}
              </TableCell>
              {canCost && (
                <TableCell align="right" sx={NUM}>
                  {l.entered_unit_cost != null ? formatRs(l.entered_unit_cost) : "—"}
                </TableCell>
              )}
              {canCost && (
                <TableCell align="right" sx={NUM}>
                  {l.entered_unit_cost != null ? formatRs(l.qty * l.entered_unit_cost) : "—"}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {canCost && (
        <Box sx={{ mt: 2, textAlign: "right" }}>
          {doc.delivery_charge != null && doc.delivery_charge > 0 && (
            <Typography variant="body2" sx={NUM}>
              {t("retail.stockIn.deliveryCharge")}: {formatRs(doc.delivery_charge)}
            </Typography>
          )}
          <Typography variant="subtitle1" sx={{ fontWeight: 800, ...NUM }}>
            {t("retail.stockIn.totalCost")}: {doc.total_cost != null ? formatRs(doc.total_cost) : "—"}
          </Typography>
        </Box>
      )}
    </Box>,
    document.body,
  );
}
