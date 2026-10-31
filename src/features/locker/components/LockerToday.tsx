import { useState } from "react";
import { Alert, Box, Button, Chip, MenuItem, Paper, TextField, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { useTranslation } from "react-i18next";

import { formatDateTime, formatDisplayDate } from "@/lib/dates";
import { useToast } from "@/components/ui/AppToast";
import { METHOD_LABELS, PAYMENT_METHODS } from "@/features/invoices/lib/paymentMethods";
import { useChangePaymentMethod } from "../hooks/useLocker";
import type { LockerStatus, Movement } from "../api/locker.api";
import { isZero, money, personName, toNum } from "../lib/locker";
import { OpeningDialog } from "./OpeningDialog";
import { CloseDayDialog } from "./CloseDayDialog";
import { LockerExpenseDialog } from "./LockerExpenseDialog";

const num = { fontVariantNumeric: "tabular-nums", fontFamily: "'JetBrains Mono', monospace" } as const;

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 2 }, borderRadius: 3, minWidth: 0 }}>
      <Typography sx={{ fontSize: { xs: "0.62rem", sm: "0.7rem" }, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "text.secondary" }}>{label}</Typography>
      <Typography sx={{ ...num, fontWeight: 900, fontSize: { xs: "1rem", sm: "1.6rem" }, color: tone, lineHeight: 1.2, mt: 0.5, wordBreak: "break-word" }}>{value}</Typography>
      {sub && (
        <Typography variant="caption" color="text.secondary" sx={{ ...num, display: { xs: "none", sm: "block" } }}>
          {sub}
        </Typography>
      )}
    </Paper>
  );
}

function MovementRow({ m }: { m: Movement }) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const change = useChangePaymentMethod();
  const dayWords = { today: t("time.today"), yesterday: t("time.yesterday") };
  const what =
    m.type === "expense"
      ? `${t("locker.move.expense")}${m.description ? ` · ${m.description}` : m.category ? ` · ${m.category}` : ""}`
      : `${t(`locker.move.${m.type}`)} · INV-${m.invoice_id}${m.customer_name ? ` · ${m.customer_name}` : ""}`;

  return (
    <Box sx={{ display: "flex", alignItems: "center", flexWrap: { xs: "wrap", sm: "nowrap" }, gap: 1, px: 1.5, py: 1, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 }, opacity: m.in_drawer ? 1 : 0.65 }}>
      {/* phones: description on its own line, method + amount below */}
      <Box sx={{ flexGrow: 1, flexBasis: { xs: "100%", sm: 0 }, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, ...num }}>
          {what}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={num}>
          {formatDateTime(m.at, dayWords)}
          {m.by ? ` · ${m.by}` : ""}
          {!m.in_drawer ? ` · ${t("locker.notInDrawer")}` : ""}
        </Typography>
      </Box>
      {m.payment_id ? (
        <TextField
          select
          size="small"
          value={(PAYMENT_METHODS as readonly string[]).includes(m.method) ? m.method : ""}
          onChange={(e) =>
            change.mutate(
              { payment_id: m.payment_id as number, method: e.target.value },
              { onSuccess: () => showSuccess(t("locker.methodChanged")), onError: (err: any) => showError(err?.message || t("locker.errors.saveFailed")) },
            )
          }
          disabled={change.isPending}
          slotProps={{ htmlInput: { "aria-label": t("locker.methodFor", { id: m.invoice_id }) } }}
          sx={{ width: 140, flexShrink: 0, "& .MuiSelect-select": { py: 0.5, fontSize: "0.8rem", fontWeight: 700 } }}
        >
          {!(PAYMENT_METHODS as readonly string[]).includes(m.method) && (
            <MenuItem value="" disabled>
              {m.method}
            </MenuItem>
          )}
          {PAYMENT_METHODS.map((pm) => (
            <MenuItem key={pm} value={pm}>
              {t(METHOD_LABELS[pm])}
            </MenuItem>
          ))}
        </TextField>
      ) : (
        <Chip size="small" label={t(METHOD_LABELS.Cash)} sx={{ fontWeight: 700 }} />
      )}
      <Typography sx={{ ...num, fontWeight: 800, width: 96, ml: "auto", textAlign: "right", color: m.amount < 0 ? "error.main" : "success.dark" }}>
        {m.amount < 0 ? "−" : "+"}
        {money(Math.abs(m.amount))}
      </Typography>
    </Box>
  );
}

export function LockerToday({ status }: { status: LockerStatus }) {
  const { t } = useTranslation();
  const [openingOpen, setOpeningOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const dayWords = { today: t("time.today"), yesterday: t("time.yesterday") };

  const expected = status.expected_now ?? 0;
  const sendHome = status.send_home ?? 0;
  const opening = status.opening;
  const lastClose = [...status.todays_counts].reverse().find((c) => c.kind === "CLOSING");
  const openDiff = opening ? toNum(opening.difference) : 0;
  const allBack = status.held.filter((h) => h.all_back);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* opening status */}
      {opening ? (
        <Alert severity={isZero(openDiff) ? "success" : "warning"} icon={<LockOpenOutlinedIcon />} sx={num}>
          {t("locker.openedBy", { time: formatDateTime(opening.counted_at, dayWords), name: personName(opening.CountedBy) || "—", amount: money(opening.counted_amount) })}
          {!isZero(openDiff) && ` · ${t(openDiff < 0 ? "locker.diff.short" : "locker.diff.over", { amount: money(Math.abs(openDiff)) })}`}
        </Alert>
      ) : (
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={() => setOpeningOpen(true)} sx={{ fontWeight: 800 }}>
              {t("locker.enterOpening")}
            </Button>
          }
        >
          {t("locker.notOpened")}
        </Alert>
      )}
      {lastClose && (
        <Alert severity={isZero(lastClose.difference) ? "success" : "warning"} icon={<LockOutlinedIcon />} sx={num}>
          {t("locker.closedBy", { time: formatDateTime(lastClose.counted_at, dayWords), name: personName(lastClose.CountedBy) || "—", sent: money(lastClose.sent_home) })}
        </Alert>
      )}

      {/* the three numbers */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: { xs: 1, sm: 2 } }}>
        <Tile label={t("locker.drawerShouldHave")} value={`Rs. ${money(expected)}`} sub={t("locker.sinceLastCount", { time: formatDateTime(status.since, dayWords) })} />
        <Tile label={t("locker.keepInDrawer")} value={`Rs. ${money(status.keep)}`} sub={t("locker.keepBreakdown", { float: money(status.float), advances: money(status.held_total), count: status.held.length })} />
        <Tile
          label={sendHome < 0 ? t("locker.topUpLabel") : t("locker.sendHome")}
          value={`Rs. ${money(Math.abs(sendHome))}`}
          tone={sendHome < 0 ? "warning.dark" : "success.dark"}
          sub={sendHome < 0 ? t("locker.topUpHint") : t("locker.sendHomeHint")}
        />
      </Box>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button variant="contained" disableElevation startIcon={<LockOutlinedIcon />} onClick={() => setCloseOpen(true)} sx={{ fontWeight: 800 }}>
          {t("locker.closeDay")}
        </Button>
        <Button variant="outlined" startIcon={<ReceiptLongOutlinedIcon />} onClick={() => setExpenseOpen(true)} sx={{ fontWeight: 700 }}>
          {t("locker.payExpense")}
        </Button>
        {!opening && (
          <Button variant="outlined" startIcon={<LockOpenOutlinedIcon />} onClick={() => setOpeningOpen(true)} sx={{ fontWeight: 700 }}>
            {t("locker.enterOpening")}
          </Button>
        )}
      </Box>

      {allBack.length > 0 && (
        <Alert severity="warning">
          {t("locker.completeThese", { count: allBack.length, list: allBack.map((h) => `INV-${h.invoice_id}`).join(", ") })}
        </Alert>
      )}

      {/* cash entries since the last count */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Box sx={{ px: 1.5, py: 1.25, bgcolor: "action.hover", display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
          <Typography sx={{ fontWeight: 800 }}>{t("locker.entriesTitle")}</Typography>
          <Typography sx={{ ...num, fontWeight: 800 }}>
            {status.drawer_change < 0 ? "−" : "+"}Rs. {money(Math.abs(status.drawer_change))}
          </Typography>
        </Box>
        {status.movements.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            {t("locker.noEntries")}
          </Typography>
        ) : (
          status.movements.map((m) => <MovementRow key={m.id} m={m} />)
        )}
      </Paper>

      {/* advances held in the drawer */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Box sx={{ px: 1.5, py: 1.25, bgcolor: "action.hover", display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
          <Typography sx={{ fontWeight: 800 }}>{t("locker.heldTitle")}</Typography>
          <Typography sx={{ ...num, fontWeight: 800 }}>Rs. {money(status.held_total)}</Typography>
        </Box>
        {status.held.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            {t("locker.noHeld")}
          </Typography>
        ) : (
          status.held.map((h) => (
            <Box key={h.invoice_id} sx={{ display: "flex", alignItems: "center", flexWrap: { xs: "wrap", sm: "nowrap" }, gap: 1, px: 1.5, py: 1, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
              <Box sx={{ flexGrow: 1, flexBasis: { xs: "60%", sm: 0 }, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, ...num }}>
                  INV-{h.invoice_id} · {h.customer_name || "—"}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={num}>
                  {formatDisplayDate(h.issued_date)}
                  {h.refunded > 0 ? ` · ${t("locker.refundedPart", { amount: money(h.refunded) })}` : ""}
                </Typography>
              </Box>
              {h.all_back && <Chip size="small" color="warning" label={t("locker.allBack")} sx={{ fontWeight: 700 }} />}
              <Typography sx={{ ...num, fontWeight: 800, width: 96, ml: "auto", textAlign: "right" }}>{money(h.held)}</Typography>
            </Box>
          ))
        )}
      </Paper>

      <OpeningDialog open={openingOpen} status={status} onClose={() => setOpeningOpen(false)} />
      <CloseDayDialog open={closeOpen} status={status} onClose={() => setCloseOpen(false)} />
      <LockerExpenseDialog open={expenseOpen} onClose={() => setExpenseOpen(false)} />
    </Box>
  );
}
