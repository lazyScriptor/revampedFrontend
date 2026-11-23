import {
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { normalizeSaleLines } from "@/features/retail/api/pos.api";

interface Props {
  invoice: any;
  hideHeading?: boolean;
}

/** Displays sold hardware / unlisted / sundry items on Manage view and ReadOnlyInvoiceModal. */
export function ItemsSoldSection({ invoice, hideHeading = false }: Props) {
  const { t } = useTranslation();
  const saleLines = normalizeSaleLines(invoice);
  if (saleLines.length === 0) return null;

  const showTopBar = !hideHeading || Boolean(invoice?.job_site) || Boolean(invoice?.customer_po);

  return (
    <Box
      data-testid="items-sold-section"
      sx={{
        bgcolor: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 2.5,
        overflow: "hidden",
      }}
    >
      {showTopBar && (
        <Box
          sx={{
            px: 2,
            py: 1.5,
            bgcolor: "#f1f5f9",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          {!hideHeading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0f172a" }}>
                {t("invoices.sale.itemsSold")}
              </Typography>
              <Chip
                size="small"
                label={saleLines.length}
                sx={{ height: 18, fontSize: "0.68rem", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
              />
            </Box>
          )}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
            {invoice?.job_site && (
              <Chip
                size="small"
                variant="outlined"
                label={`${t("retail.pos.jobSite")}: ${invoice.job_site}`}
                sx={{ height: 20, fontSize: "0.68rem", fontWeight: 600 }}
              />
            )}
            {invoice?.customer_po && (
              <Chip
                size="small"
                variant="outlined"
                label={`${t("retail.pos.poNo")}: ${invoice.customer_po}`}
                sx={{ height: 20, fontSize: "0.68rem", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}
              />
            )}
          </Box>
        </Box>
      )}

      <Box sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#f8fafc" }}>
              <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "0.72rem" }}>
                {t("invoices.sale.colItem")}
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "0.72rem", textAlign: "right" }}>
                {t("common.qty")}
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "0.72rem", textAlign: "right" }}>
                {t("invoices.sale.colPrice")}
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "0.72rem", textAlign: "right" }}>
                {t("common.discount")}
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#475569", fontSize: "0.72rem", textAlign: "right" }}>
                {t("orders.ledger.colTotal")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {saleLines.map((line) => (
              <TableRow key={line.sale_line_id} hover sx={{ "&:last-child td": { borderBottom: 0 } }}>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                    {line.line_kind === "unlisted" && (
                      <Tooltip title={t("retail.pos.unlistedHint")}>
                        <Chip
                          size="small"
                          color="warning"
                          label="?"
                          data-testid="sold-unlisted-badge"
                          sx={{ height: 18, fontWeight: 900, fontSize: "0.7rem", "& .MuiChip-label": { px: 0.75 } }}
                        />
                      </Tooltip>
                    )}
                    {line.line_kind === "sundry" && (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={t("retail.pos.sundryBtn")}
                        sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }}
                      />
                    )}
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                      {line.description}
                    </Typography>
                  </Box>
                  {line.serials && line.serials.length > 0 && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.68rem" }}
                    >
                      S/N: {line.serials.join(", ")}
                    </Typography>
                  )}
                </TableCell>
                <TableCell
                  sx={{
                    textAlign: "right",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 700,
                    color: "#0f172a",
                    whiteSpace: "nowrap",
                  }}
                >
                  {line.qty} {line.unit_label}
                </TableCell>
                <TableCell
                  sx={{
                    textAlign: "right",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 600,
                    color: "#0f172a",
                    whiteSpace: "nowrap",
                  }}
                >
                  Rs. {line.unit_price.toLocaleString()}
                </TableCell>
                <TableCell
                  sx={{
                    textAlign: "right",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 600,
                    color: line.line_discount > 0 ? "#059669" : "text.disabled",
                    whiteSpace: "nowrap",
                  }}
                >
                  {line.line_discount > 0 ? `− Rs. ${line.line_discount.toLocaleString()}` : "—"}
                </TableCell>
                <TableCell
                  sx={{
                    textAlign: "right",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 800,
                    color: "#0f172a",
                    whiteSpace: "nowrap",
                  }}
                >
                  Rs. {line.line_total.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
