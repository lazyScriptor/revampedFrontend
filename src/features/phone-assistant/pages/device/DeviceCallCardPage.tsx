import { useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Paper, TextField, Typography } from "@mui/material";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import PhoneDisabledOutlinedIcon from "@mui/icons-material/PhoneDisabledOutlined";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DeviceShell } from "../../components/DeviceShell";
import { useDeviceCallCard, useSaveDeviceCallOutcome } from "../../hooks/useDeviceCalls";
import { formatCallLength, localDay } from "../../lib/callFormat";
import type { CallOutcome, DeviceCallCard } from "../../api/deviceCallApi";

const OUTCOMES = [
  { key: "answered", labelKey: "collections.callCard.answered", Icon: CheckCircleOutlinedIcon, color: "success" },
  { key: "no_answer", labelKey: "collections.callCard.noAnswer", Icon: CancelOutlinedIcon, color: "warning" },
  { key: "unreachable", labelKey: "collections.callCard.unreachable", Icon: PhoneDisabledOutlinedIcon, color: "error" },
] as const;

const QUICK_FOLLOW_UPS = [
  { days: 1, labelKey: "phoneShell.callCard.tomorrow" },
  { days: 3, labelKey: "phoneShell.callCard.in3Days" },
  { days: 7, labelKey: "phoneShell.callCard.in1Week" },
] as const;

const numeric = { fontVariantNumeric: "tabular-nums" } as const;

function CallCardForm({ clientCallId, card }: { clientCallId: string; card: DeviceCallCard }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const save = useSaveDeviceCallOutcome(clientCallId);
  const isSi = Boolean(i18n.language?.startsWith("si"));

  const [outcome, setOutcome] = useState<CallOutcome>(card.call.suggested_outcome ?? "answered");
  const [resultKey, setResultKey] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [promiseAmount, setPromiseAmount] = useState("");
  const [promiseDate, setPromiseDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [followUpOn, setFollowUpOn] = useState("");
  const [billIds, setBillIds] = useState<number[]>(() =>
    card.bills.filter((b) => b.selected).map((b) => b.invoice_id),
  );
  const [problem, setProblem] = useState<string | null>(null);

  const answered = outcome === "answered";
  const result = answered ? card.call_results.find((r) => r.key === resultKey) : undefined;
  const asksReturnDate = Boolean(result?.requires_date && !result.requires_promise);

  const toggleBill = (id: number) =>
    setBillIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const submit = () => {
    const amount = Number(promiseAmount);
    if (result?.requires_promise && (!(amount > 0) || !promiseDate)) {
      setProblem(t("collections.callCard.promiseRequired"));
      return;
    }
    if (asksReturnDate && !returnDate) {
      setProblem(t("phoneShell.callCard.returnDateRequired"));
      return;
    }
    if (result?.requires_note && !note.trim()) {
      setProblem(t("collections.callCard.noteRequiredForOther"));
      return;
    }
    setProblem(null);
    // The server keeps one reminder date, so the return date goes into the note when both are set.
    const returnLine =
      asksReturnDate && followUpOn && followUpOn !== returnDate
        ? t("phoneShell.callCard.returnNote", { date: returnDate })
        : "";
    save.mutate({
      outcome,
      result: result?.key ?? null,
      note: [note.trim(), returnLine].filter(Boolean).join(" · ") || null,
      promise_amount: result?.requires_promise ? amount : null,
      promise_date: result?.requires_promise ? promiseDate : null,
      follow_up_on: followUpOn || (asksReturnDate ? returnDate : "") || null,
      invoice_ids: billIds,
    });
  };

  const done = () => navigate({ to: "/device/calls" });

  if (save.isSuccess) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Alert severity="success">{t("phoneShell.callCard.saved")}</Alert>
        <Button variant="contained" size="large" onClick={done}>
          {t("common.close")}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {card.note && <Alert severity="info">{t("phoneShell.callCard.alreadyNoted")}</Alert>}

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1 }}>
        {OUTCOMES.map(({ key, labelKey, Icon, color }) => (
          <Button
            key={key}
            variant={outcome === key ? "contained" : "outlined"}
            color={color}
            aria-pressed={outcome === key}
            onClick={() => setOutcome(key)}
            sx={{ flexDirection: "column", gap: 0.5, minHeight: 72, textTransform: "none", fontWeight: 800, px: 0.5 }}
          >
            <Icon />
            {t(labelKey)}
          </Button>
        ))}
      </Box>

      {answered && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.75 }}>
            {t("collections.callCard.whatHappened")}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {card.call_results.map((r) => (
              <Chip
                key={r.key}
                clickable
                label={isSi ? r.label_si : r.label_en}
                color={resultKey === r.key ? "primary" : "default"}
                variant={resultKey === r.key ? "filled" : "outlined"}
                aria-pressed={resultKey === r.key}
                onClick={() => setResultKey((k) => (k === r.key ? null : r.key))}
                sx={{ minHeight: 40, fontWeight: 700 }}
              />
            ))}
          </Box>
        </Box>
      )}

      {result?.requires_promise && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <TextField
            type="number"
            label={t("collections.callCard.promiseAmount")}
            value={promiseAmount}
            onChange={(e) => setPromiseAmount(e.target.value)}
            slotProps={{ htmlInput: { min: 0, inputMode: "decimal", style: numeric } }}
            sx={{ flex: 1, minWidth: 140 }}
          />
          <TextField
            type="date"
            label={t("collections.callCard.promiseDate")}
            value={promiseDate}
            onChange={(e) => setPromiseDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: localDay(), style: numeric } }}
            sx={{ flex: 1, minWidth: 140 }}
          />
        </Box>
      )}

      {asksReturnDate && (
        <TextField
          type="date"
          label={t("collections.callCard.expectedReturnDate")}
          value={returnDate}
          onChange={(e) => setReturnDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: localDay(), style: numeric } }}
        />
      )}

      {card.bills.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.75 }}>
            {t("phoneShell.callCard.billsAbout")}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {card.bills.map((b) => {
              const on = billIds.includes(b.invoice_id);
              const label = [
                `INV-${b.invoice_id}`,
                b.owed !== null && b.owed > 0
                  ? t("phoneShell.callCard.owed", { amount: b.owed.toLocaleString() })
                  : "",
                b.units_out > 0 ? t("phoneShell.callCard.unitsOut", { count: b.units_out }) : "",
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <Chip
                  key={b.invoice_id}
                  clickable
                  label={label}
                  icon={on ? <CheckCircleOutlinedIcon /> : undefined}
                  color={on ? "primary" : "default"}
                  variant={on ? "filled" : "outlined"}
                  aria-pressed={on}
                  onClick={() => toggleBill(b.invoice_id)}
                  sx={{ minHeight: 40, fontWeight: 700, ...numeric }}
                />
              );
            })}
          </Box>
        </Box>
      )}

      <TextField
        label={result?.requires_note ? t("collections.callCard.noteRequired") : t("collections.callCard.noteOptional")}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        multiline
        minRows={2}
        slotProps={{ htmlInput: { maxLength: 1800 } }}
      />

      <Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1 }}>
          {QUICK_FOLLOW_UPS.map((q) => {
            const day = localDay(q.days);
            return (
              <Chip
                key={q.days}
                clickable
                label={t(q.labelKey)}
                color={followUpOn === day ? "primary" : "default"}
                variant={followUpOn === day ? "filled" : "outlined"}
                aria-pressed={followUpOn === day}
                onClick={() => setFollowUpOn((v) => (v === day ? "" : day))}
                sx={{ minHeight: 36, fontWeight: 700 }}
              />
            );
          })}
        </Box>
        <TextField
          fullWidth
          type="date"
          label={t("collections.callCard.callAgainOn")}
          value={followUpOn}
          onChange={(e) => setFollowUpOn(e.target.value)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: localDay(), style: numeric } }}
        />
      </Box>

      {problem && <Alert severity="warning">{problem}</Alert>}
      {save.isError && <Alert severity="error">{t("collections.callCard.saveFailed")}</Alert>}

      <Box sx={{ display: "flex", gap: 1 }}>
        <Button variant="text" color="inherit" size="large" onClick={done}>
          {t("phoneShell.callCard.later")}
        </Button>
        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={save.isPending}
          onClick={submit}
          sx={{ fontWeight: 800 }}
        >
          {save.isPending ? t("common.saving") : t("common.save")}
        </Button>
      </Box>
    </Box>
  );
}

/** The call card shown on the phone after a call (spec §9.2.1, §9.2.7). */
export function DeviceCallCardPage({ clientCallId }: { clientCallId: string }) {
  const { t } = useTranslation();
  const query = useDeviceCallCard(clientCallId);
  const card = query.data;

  return (
    <DeviceShell active="calls" title={t("collections.callCard.title")}>
      <Box sx={{ p: 1.5 }}>
        {query.isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={26} />
          </Box>
        )}
        {query.isError && (
          <Alert
            severity="warning"
            action={
              <Button color="inherit" size="small" onClick={() => void query.refetch()}>
                {t("common.retry")}
              </Button>
            }
          >
            {t("phoneShell.callCard.notFound")}
          </Alert>
        )}
        {card && (
          <>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, mb: 1.5 }}>
              <Typography sx={{ fontWeight: 800, fontSize: "1.1rem" }}>
                {card.call.customer_name || card.call.raw_number || t("phoneShell.callCard.unknown")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={numeric} data-testid="call-summary">
                {t(`phoneShell.callCard.direction_${card.call.direction}`)} ·{" "}
                {card.call.suggested_outcome === "answered"
                  ? `${t("collections.callCard.answered")} · ${formatCallLength(t, card.call.duration_seconds)}`
                  : t("collections.callCard.noAnswer")}
              </Typography>
            </Paper>
            <CallCardForm key={card.call.client_call_id} clientCallId={clientCallId} card={card} />
          </>
        )}
      </Box>
    </DeviceShell>
  );
}
