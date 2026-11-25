import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Popover,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import PhoneDisabledOutlinedIcon from "@mui/icons-material/PhoneDisabledOutlined";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_CALL_RESULTS,
  type CallOutcome,
  type CallResultOption,
  type LastCallSummary,
} from "../types";
import { useCollectionsSettings, useSaveCallOutcome } from "../hooks/useCollections";

interface CallCardPopoverProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  customerId: number;
  customerName: string;
  phone?: string | null;
  invoiceIds?: number[];
  initialCall?: LastCallSummary | null;
  onSaved?: () => void;
}

export const CallCardPopover: React.FC<CallCardPopoverProps> = ({
  anchorEl,
  open,
  onClose,
  customerId,
  customerName,
  phone,
  invoiceIds,
  initialCall,
  onSaved,
}) => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const settingsQuery = useCollectionsSettings();
  const saveMutation = useSaveCallOutcome();

  const resultsList: CallResultOption[] = (
    settingsQuery.data?.call_results?.length ? settingsQuery.data.call_results : DEFAULT_CALL_RESULTS
  ).filter((r) => r.active !== false);

  const [outcome, setOutcome] = useState<CallOutcome>("answered");
  const [result, setResult] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [promiseAmount, setPromiseAmount] = useState<string>("");
  const [promiseDate, setPromiseDate] = useState<string>("");
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>("");
  const [callAgainOn, setCallAgainOn] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const pre =
      initialCall?.outcome ??
      initialCall?.suggested_outcome ??
      "answered";
    setOutcome(pre);
    setResult(initialCall?.result ?? "");
    setNote(initialCall?.note ?? "");
    setPromiseAmount(initialCall?.promise_amount ? String(initialCall.promise_amount) : "");
    setPromiseDate(initialCall?.promise_date ? initialCall.promise_date.slice(0, 10) : "");
    setExpectedReturnDate("");
    setCallAgainOn(initialCall?.call_again_on ? initialCall.call_again_on.slice(0, 10) : "");
    setError(null);
  }, [open, initialCall]);

  // What the chosen result asks for comes from the shop's list, as on the phone.
  const chosen = outcome === "answered" ? resultsList.find((r) => r.key === result) : undefined;
  const asksPromise = Boolean(chosen?.requires_promise);
  const asksReturnDate = Boolean(chosen?.requires_date && !chosen.requires_promise);
  const asksNote = Boolean(chosen?.requires_note);

  const handleSave = async () => {
    if (asksNote && !note.trim()) {
      setError(t("collections.callCard.noteRequiredForOther", "Please enter a short note for Other."));
      return;
    }
    if (asksPromise && (!(Number(promiseAmount) > 0) || !promiseDate)) {
      setError(t("collections.callCard.promiseRequired", "Please enter promise amount and date."));
      return;
    }
    // The server keeps one reminder date, so the return date goes into the note when both are set.
    const returnDate = asksReturnDate ? expectedReturnDate : "";
    const returnLine =
      returnDate && callAgainOn && callAgainOn !== returnDate
        ? t("phoneShell.callCard.returnNote", { date: returnDate })
        : "";

    setError(null);
    try {
      await saveMutation.mutateAsync({
        call_id: initialCall?.call_id ?? null,
        customer_id: customerId,
        // An empty list would unlink every bill from the call, so it is left out.
        invoice_ids: invoiceIds?.length ? invoiceIds : undefined,
        phone: phone ?? null,
        outcome,
        result: chosen?.key ?? null,
        note: [note.trim(), returnLine].filter(Boolean).join(" · ") || null,
        promise_amount: asksPromise ? Number(promiseAmount) : null,
        promise_date: asksPromise ? promiseDate : null,
        expected_return_date: returnDate || null,
        call_again_on: callAgainOn || null,
      });
      onSaved?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || t("collections.callCard.saveFailed", "Could not save call."));
    }
  };

  const isSi = i18n.language?.startsWith("si");

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "calc(100vw - 24px)", sm: 420 },
            maxWidth: "100vw",
            p: 2,
            borderRadius: 2.5,
            bgcolor: isDark ? "#0f172a" : "#ffffff",
            color: isDark ? "#f8fafc" : "#0f172a",
            border: "1px solid",
            borderColor: "divider",
          },
        },
      }}
    >
      <Stack spacing={1.5} onClick={(e) => e.stopPropagation()}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {t("collections.callCard.title", "Log call")} · {customerName}
          </Typography>
          {phone && (
            <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {phone}
            </Typography>
          )}
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ py: 0.25 }}>
            {error}
          </Alert>
        )}

        {/* Three big outcome buttons */}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
          <Button
            variant={outcome === "answered" ? "contained" : "outlined"}
            color="success"
            onClick={() => setOutcome("answered")}
            startIcon={<CheckCircleOutlinedIcon />}
            sx={{ textTransform: "none", fontWeight: 700, py: 1, fontSize: "0.78rem" }}
          >
            {t("collections.callCard.answered", "Answered")}
          </Button>
          <Button
            variant={outcome === "no_answer" ? "contained" : "outlined"}
            color="error"
            onClick={() => setOutcome("no_answer")}
            startIcon={<CancelOutlinedIcon />}
            sx={{ textTransform: "none", fontWeight: 700, py: 1, fontSize: "0.78rem" }}
          >
            {t("collections.callCard.noAnswer", "No answer")}
          </Button>
          <Button
            variant={outcome === "unreachable" ? "contained" : "outlined"}
            color="warning"
            onClick={() => setOutcome("unreachable")}
            startIcon={<PhoneDisabledOutlinedIcon />}
            sx={{ textTransform: "none", fontWeight: 700, py: 1, fontSize: "0.75rem" }}
          >
            {t("collections.callCard.unreachable", "Off / wrong")}
          </Button>
        </Box>

        {/* Spread-out result chips when answered */}
        {outcome === "answered" && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.75 }}>
              {t("collections.callCard.whatHappened", "What happened?")}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {resultsList.map((opt) => {
                const selected = result === opt.key;
                const label = isSi ? opt.label_si : opt.label_en;
                return (
                  <Chip
                    key={opt.key}
                    clickable
                    label={label}
                    onClick={() => setResult(selected ? "" : opt.key)}
                    color={selected ? "warning" : "default"}
                    variant={selected ? "filled" : "outlined"}
                    sx={{ fontWeight: selected ? 800 : 600 }}
                  />
                );
              })}
            </Box>
          </Box>
        )}

        {/* Promise fields */}
        {asksPromise && (
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
            <TextField
              size="small"
              type="number"
              label={t("collections.callCard.promiseAmount", "Promise amount (Rs)")}
              value={promiseAmount}
              onChange={(e) => setPromiseAmount(e.target.value)}
              slotProps={{ htmlInput: { min: 1, style: { fontVariantNumeric: "tabular-nums" } } }}
            />
            <TextField
              size="small"
              type="date"
              label={t("collections.callCard.promiseDate", "Promise date")}
              value={promiseDate}
              onChange={(e) => setPromiseDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { style: { fontVariantNumeric: "tabular-nums" } } }}
            />
          </Box>
        )}

        {/* Return date field */}
        {asksReturnDate && (
          <TextField
            size="small"
            type="date"
            label={t("collections.callCard.expectedReturnDate", "Expected return date")}
            value={expectedReturnDate}
            onChange={(e) => setExpectedReturnDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { style: { fontVariantNumeric: "tabular-nums" } } }}
          />
        )}

        {/* One-line note */}
        <TextField
          size="small"
          fullWidth
          label={
            asksNote
              ? t("collections.callCard.noteRequired", "Note (required)")
              : t("collections.callCard.noteOptional", "Short note (optional)")
          }
          value={note}
          onChange={(e) => setNote(e.target.value)}
          required={asksNote}
        />

        {/* Call again on */}
        <TextField
          size="small"
          type="date"
          label={t("collections.callCard.callAgainOn", "Call again on (optional)")}
          value={callAgainOn}
          onChange={(e) => setCallAgainOn(e.target.value)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { style: { fontVariantNumeric: "tabular-nums" } } }}
        />

        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem", lineHeight: 1.3 }}>
          {t(
            "collections.callCard.pairedPhoneHint",
            "Only your paired phone is tracked automatically; landline or WhatsApp calls are logged by hand.",
          )}
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button size="small" onClick={onClose} sx={{ textTransform: "none" }}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            size="small"
            variant="contained"
            disableElevation
            disabled={saveMutation.isPending}
            onClick={handleSave}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {saveMutation.isPending ? t("common.saving", "Saving...") : t("common.save", "Save")}
          </Button>
        </Box>
      </Stack>
    </Popover>
  );
};
