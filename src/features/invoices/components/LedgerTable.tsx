import { Fragment, useState } from "react";
import { Box, Chip, Typography, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight";

import { formatDisplayDate } from "@/lib/dates";
import { EquipmentNumberBadge } from "@/features/equipment/components/EquipmentNumberBadge";
import type { LineToday } from "../lib/lineCost";

const MONO = "'JetBrains Mono', monospace";
const num = { fontFamily: MONO, fontVariantNumeric: "tabular-nums" } as const;
const money = (n: number) => Number((Number(n) || 0).toFixed(2)).toLocaleString(undefined, { maximumFractionDigits: 2 });

// Machine | Dates | Qty | Returned | Rate | Cost — one row per rented line, read left to right.
const COLUMNS = "minmax(130px, 2fr) 84px 36px 64px 92px 96px";

/** "20 Oct" for this year, "20 Oct 2025" otherwise — keeps the dates column narrow. */
const shortDate = (value: unknown) => {
  const full = formatDisplayDate(value as any);
  const year = String(new Date().getFullYear());
  return full && full.endsWith(year) ? full.slice(0, -year.length).trim() : full;
};

interface Iteration {
  date: string;
  good: number;
  defective: number;
}

/** The handovers that touched one line, oldest first, from the RETURN_PROCESSED traces. */
const iterationsFor = (lineId: number, returnTraces: any[]): Iteration[] =>
  returnTraces
    .map((trace) => {
      let payload = trace.state_payload || {};
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          payload = {};
        }
      }
      const rl = (payload.lines_returned || []).find((l: any) => l.line_id === lineId);
      if (rl && (Number(rl.good_qty) > 0 || Number(rl.defective_qty) > 0)) {
        return { date: trace.occurred_at || trace.createdAt, good: Number(rl.good_qty) || 0, defective: Number(rl.defective_qty) || 0 };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()) as Iteration[];

interface LedgerTableProps {
  lines: any[];
  infos: LineToday[];
  returnTraces: any[];
}

export function LedgerTable({ lines, infos, returnTraces }: LedgerTableProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [openId, setOpenId] = useState<number | null>(null);
  const border = (theme.palette as any).border?.subtle || theme.palette.divider;

  const totals = infos.reduce(
    (acc, i) => ({ qty: acc.qty + i.qty, returned: acc.returned + i.returned, cost: acc.cost + i.costToday }),
    { qty: 0, returned: 0, cost: 0 },
  );

  const head = (label: string, align: "left" | "right" | "center" = "left") => (
    <Typography component="div" role="columnheader" sx={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: "text.secondary", textAlign: align }}>
      {label}
    </Typography>
  );

  return (
    <Box sx={{ border: "1px solid", borderColor: border, borderRadius: 3, bgcolor: "background.paper", overflowX: "auto" }}>
      <Box role="table" aria-label={t("orders.ledger.tableLabel")} sx={{ minWidth: 520 }}>
        {/* header */}
        <Box role="row" sx={{ display: "grid", gridTemplateColumns: COLUMNS, gap: 1, alignItems: "center", px: 1.5, py: 1, bgcolor: "action.hover", borderBottom: "1px solid", borderColor: border }}>
          {head(t("orders.ledger.colMachine"))}
          {head(t("orders.ledger.colDates"))}
          {head(t("orders.ledger.colQty"), "center")}
          {head(t("orders.ledger.colReturned"), "center")}
          {head(t("orders.ledger.colRate"), "right")}
          {head(t("orders.ledger.colCost"), "right")}
        </Box>

        {lines.map((line, idx) => {
          const info = infos[idx];
          const eq = line.Equipment || {};
          const iterations = iterationsFor(line.line_id, returnTraces);
          const defective = Number(line.defective_returned_qty) || 0;
          const base = Number(line.locked_base_price) || 0;
          const extra = Number(line.locked_extra_daily_rate) || 0;
          const minDays = Number(line.locked_minimum_days) || 1;
          const daily = minDays <= 1 && base === extra;
          const backDate = !info.isActive ? line.actual_return_date || (iterations.length ? iterations[iterations.length - 1].date : null) : null;
          const expandable = iterations.length > 0 || info.isOverdue;
          const open = openId === line.line_id;

          const status = !info.isActive
            ? { label: t("invoices.returned"), color: "success" as const }
            : info.isOverdue
              ? { label: t("orders.ledger.lateBy", { count: info.daysLate }), color: "error" as const }
              : { label: info.returned > 0 ? t("orders.ledger.outPartial", { pending: info.pending, qty: info.qty }) : t("orders.ledger.statusOut"), color: "warning" as const };

          return (
            <Fragment key={line.line_id}>
              <Box
                role="row"
                data-testid="ledger-row"
                tabIndex={expandable ? 0 : undefined}
                aria-expanded={expandable ? open : undefined}
                onClick={expandable ? () => setOpenId(open ? null : line.line_id) : undefined}
                onKeyDown={(e) => {
                  if (expandable && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    setOpenId(open ? null : line.line_id);
                  }
                }}
                sx={{
                  display: "grid",
                  gridTemplateColumns: COLUMNS,
                  gap: 1,
                  alignItems: "center",
                  px: 1.5,
                  py: 1.25,
                  borderBottom: "1px solid",
                  borderColor: border,
                  cursor: expandable ? "pointer" : "default",
                  bgcolor: info.isOverdue ? "rgba(239, 68, 68, 0.04)" : "transparent",
                  "&:hover": expandable ? { bgcolor: "action.hover" } : undefined,
                  "&:focus-visible": { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 },
                }}
              >
                {/* machine */}
                <Box role="cell" sx={{ minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                    {eq.serial_number && <EquipmentNumberBadge value={eq.serial_number} size="sm" />}
                    <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.3 }}>
                      {eq.equipment_name || t("invoices.ManageInvoiceViews.unknownAsset")}
                    </Typography>
                  </Box>
                  {eq.equipment_name_si && (
                    <Typography variant="caption" sx={{ display: "block", color: "text.secondary", fontWeight: 600 }}>
                      {eq.equipment_name_si}
                    </Typography>
                  )}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                    <Chip size="small" color={status.color} variant={info.isActive ? "filled" : "outlined"} label={status.label} sx={{ height: 20, fontSize: "0.66rem", fontWeight: 800 }} />
                    {expandable && <ExpandMoreIcon sx={{ fontSize: 18, color: "text.secondary", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />}
                  </Box>
                </Box>

                {/* dates: out, then back / due */}
                <Box role="cell" sx={{ ...num, fontSize: "0.78rem", lineHeight: 1.45 }}>
                  <Box>
                    <Box component="span" sx={{ color: "text.secondary" }}>{t("orders.ledger.outShort")} </Box>
                    <Box component="span" sx={{ fontWeight: 700 }}>{info.outDate ? shortDate(info.outDate) : "—"}</Box>
                  </Box>
                  {backDate ? (
                    <Box>
                      <Box component="span" sx={{ color: "text.secondary" }}>{t("orders.ledger.backShort")} </Box>
                      <Box component="span" sx={{ fontWeight: 700, color: "success.dark" }}>{shortDate(backDate)}</Box>
                    </Box>
                  ) : info.tracked && info.dueDate ? (
                    <Box>
                      <Box component="span" sx={{ color: "text.secondary" }}>{t("orders.ledger.dueShort")} </Box>
                      <Box component="span" sx={{ fontWeight: 700, color: info.isOverdue ? "error.main" : "text.primary" }}>{shortDate(info.dueDate)}</Box>
                    </Box>
                  ) : null}
                </Box>

                {/* quantities */}
                <Typography role="cell" sx={{ ...num, fontWeight: 800, textAlign: "center" }}>
                  {info.qty}
                </Typography>
                <Box role="cell" sx={{ textAlign: "center" }}>
                  <Typography sx={{ ...num, fontWeight: 800, color: info.returned === info.qty ? "success.dark" : "text.primary" }}>{info.returned}</Typography>
                  {defective > 0 && (
                    <Typography sx={{ fontSize: "0.66rem", fontWeight: 700, color: "error.main" }}>{t("orders.ledger.damagedCount", { count: defective })}</Typography>
                  )}
                </Box>

                {/* rate */}
                <Box role="cell" sx={{ textAlign: "right", ...num, fontSize: "0.8rem", lineHeight: 1.4 }}>
                  {daily ? (
                    <>
                      <Box sx={{ fontWeight: 700 }}>Rs. {money(base)}</Box>
                      <Box sx={{ color: "text.secondary", fontSize: "0.7rem" }}>{t("orders.ledger.perDay")}</Box>
                    </>
                  ) : (
                    <>
                      <Box sx={{ fontWeight: 700 }}>Rs. {money(base)}</Box>
                      <Box sx={{ color: "text.secondary", fontSize: "0.7rem" }}>{t("orders.ledger.forDays", { count: minDays })}</Box>
                      <Box sx={{ color: "text.secondary", fontSize: "0.7rem" }}>{t("orders.ledger.thenPerDay", { rate: money(extra) })}</Box>
                    </>
                  )}
                </Box>

                {/* cost */}
                <Box role="cell" sx={{ textAlign: "right" }}>
                  <Typography sx={{ ...num, fontWeight: 900, color: info.isActive ? "text.primary" : "text.secondary" }}>Rs. {money(info.costToday)}</Typography>
                  {info.isOverdue && info.lateFee > 0 && (
                    <Typography sx={{ ...num, fontSize: "0.68rem", fontWeight: 700, color: "error.main" }}>{t("orders.ledger.inclLate", { fee: money(info.lateFee) })}</Typography>
                  )}
                </Box>
              </Box>

              {/* details: late-fee maths and every handover */}
              {expandable && open && (
                <Box sx={{ px: 2, py: 1.25, bgcolor: "action.hover", borderBottom: "1px solid", borderColor: border, display: "flex", flexDirection: "column", gap: 0.75 }}>
                  {info.isOverdue && (
                    <Typography variant="caption" sx={{ ...num, color: "text.secondary" }}>
                      {t("orders.ledger.lateFormula", { base: money(info.lockedCost), days: info.daysLate, rate: money(extra), pending: info.pending })}
                    </Typography>
                  )}
                  {iterations.length > 0 && (
                    <>
                      <Typography variant="caption" sx={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary", fontSize: "0.66rem" }}>
                        {t("orders.handoverHistory")}
                      </Typography>
                      {iterations.map((it, i) => (
                        <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                          <SubdirectoryArrowRightIcon sx={{ color: "text.disabled", fontSize: 15 }} />
                          <Typography variant="caption" sx={{ ...num, color: "text.secondary" }}>
                            {new Date(it.date).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                          </Typography>
                          {it.good > 0 && <Chip size="small" color="success" variant="outlined" label={t("invoices.ManageInvoiceViews.good", { good: it.good })} sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }} />}
                          {it.defective > 0 && <Chip size="small" color="error" label={t("invoices.ManageInvoiceViews.broken", { defective: it.defective })} sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }} />}
                        </Box>
                      ))}
                    </>
                  )}
                </Box>
              )}
            </Fragment>
          );
        })}

        {/* totals */}
        <Box role="row" data-testid="ledger-totals" sx={{ display: "grid", gridTemplateColumns: COLUMNS, gap: 1, alignItems: "center", px: 1.5, py: 1.25, bgcolor: "action.hover" }}>
          <Typography role="cell" sx={{ fontWeight: 800 }}>{t("orders.ledger.total")}</Typography>
          <Box role="cell" />
          <Typography role="cell" sx={{ ...num, fontWeight: 900, textAlign: "center" }}>{totals.qty}</Typography>
          <Typography role="cell" sx={{ ...num, fontWeight: 900, textAlign: "center" }}>{totals.returned}</Typography>
          <Box role="cell" />
          <Typography role="cell" sx={{ ...num, fontWeight: 900, textAlign: "right" }}>Rs. {money(totals.cost)}</Typography>
        </Box>
      </Box>
    </Box>
  );
}
