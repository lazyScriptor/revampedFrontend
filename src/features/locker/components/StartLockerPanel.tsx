import { useMemo, useState } from "react";
import { Alert, Box, Button, Checkbox, CircularProgress, Paper, TextField, Typography } from "@mui/material";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutlined";
import { useTranslation } from "react-i18next";

import { NumberInput } from "@/components/ui/NumberInput";
import { useToast } from "@/components/ui/AppToast";
import { formatDisplayDate } from "@/lib/dates";
import { useSetFloat, useStartLocker, useStartPreview } from "../hooks/useLocker";
import { money } from "../lib/locker";

const num = { fontVariantNumeric: "tabular-nums", fontFamily: "'JetBrains Mono', monospace" } as const;

/**
 * One-time start in the middle of the month: the open invoices' cash advances plus the float should
 * be in the drawer. Advances that already went home are ticked off; one count starts the locker.
 */
export function StartLockerPanel() {
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const { data, isLoading } = useStartPreview(true);
  const start = useStartLocker();
  const setFloat = useSetFloat();
  const [atHome, setAtHome] = useState<number[]>([]);
  const [counted, setCounted] = useState<number | "">("");
  const [floatDraft, setFloatDraft] = useState<number | "" | null>(null);
  const [note, setNote] = useState("");

  const float = data?.float ?? 0;
  const held = data?.held ?? [];
  const keep = useMemo(() => float + held.filter((h) => !atHome.includes(h.invoice_id)).reduce((s, h) => s + h.held, 0), [float, held, atHome]);
  const short = counted !== "" && counted < keep;
  const extra = counted === "" ? 0 : Math.max(0, counted - keep);

  if (isLoading || !data) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const toggle = (id: number) => setAtHome((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = () => {
    if (counted === "") return;
    start.mutate(
      { counted, at_home_invoice_ids: atHome, sent_home: extra, reason: note.trim() || undefined },
      { onSuccess: () => showSuccess(t("locker.start.started")) },
    );
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {t("locker.start.title")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("locker.start.intro")}
        </Typography>
      </Box>

      {/* 1. float */}
      <Box>
        <Typography sx={{ fontWeight: 800, mb: 1 }}>{t("locker.start.step1")}</Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <NumberInput
            size="small"
            value={floatDraft === null ? float : floatDraft}
            onChange={setFloatDraft}
            decimals
            label={t("locker.float")}
            sx={{ width: 180 }}
            slotProps={{ htmlInput: { "aria-label": t("locker.float"), style: { ...num, fontWeight: 700 } } }}
          />
          {floatDraft !== null && floatDraft !== "" && floatDraft !== float && (
            <Button size="small" variant="outlined" disabled={setFloat.isPending} onClick={() => setFloat.mutate(floatDraft as number, { onSuccess: () => setFloatDraft(null) })}>
              {t("common.save")}
            </Button>
          )}
        </Box>
      </Box>

      {/* 2. advances */}
      <Box>
        <Typography sx={{ fontWeight: 800 }}>{t("locker.start.step2")}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t("locker.start.step2Hint")}
        </Typography>
        {held.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t("locker.start.noAdvances")}
          </Typography>
        ) : (
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
            {held.map((h) => {
              const home = atHome.includes(h.invoice_id);
              return (
                <Box
                  key={h.invoice_id}
                  sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 0.75, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 }, opacity: home ? 0.6 : 1 }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, ...num }}>
                      INV-{h.invoice_id} · {h.customer_name || "—"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={num}>
                      {formatDisplayDate(h.issued_date)}
                      {h.all_back ? ` · ${t("locker.allBack")}` : ""}
                    </Typography>
                  </Box>
                  <Typography sx={{ ...num, fontWeight: 800, textDecoration: home ? "line-through" : "none" }}>Rs. {money(h.held)}</Typography>
                  <Box component="label" sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                    <Checkbox size="small" checked={home} onChange={() => toggle(h.invoice_id)} slotProps={{ input: { "aria-label": t("locker.start.atHomeFor", { id: h.invoice_id }) } }} />
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {t("locker.start.atHome")}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* 3. count */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        <Typography sx={{ fontWeight: 800 }}>{t("locker.start.step3")}</Typography>
        <Box sx={{ display: "flex", justifyContent: "space-between", ...num }}>
          <Typography variant="body2" color="text.secondary">
            {t("locker.start.shouldHold")}
          </Typography>
          <Typography sx={{ ...num, fontWeight: 900 }}>Rs. {money(keep)}</Typography>
        </Box>
        <NumberInput
          value={counted}
          onChange={setCounted}
          decimals
          label={t("locker.start.countedLabel")}
          slotProps={{ htmlInput: { "aria-label": t("locker.start.countedLabel"), inputMode: "decimal", style: { ...num, fontWeight: 800, fontSize: "1.2rem" } } }}
        />
        {counted !== "" &&
          (short ? (
            <>
              <Alert severity="warning" sx={num}>
                {t("locker.start.short", { amount: money(keep - counted) })}
              </Alert>
              <TextField size="small" required label={t("locker.start.noteLabel")} value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} />
            </>
          ) : extra > 0 ? (
            <Alert severity="info" sx={num}>
              {t("locker.start.extra", { amount: money(extra), keep: money(keep) })}
            </Alert>
          ) : (
            <Alert severity="success">{t("locker.close.matches")}</Alert>
          ))}
        {start.isError && <Alert severity="error">{(start.error as any)?.message || t("locker.errors.saveFailed")}</Alert>}
        <Box>
          <Button
            variant="contained"
            disableElevation
            startIcon={<PlayCircleOutlineIcon />}
            onClick={save}
            disabled={counted === "" || (short && !note.trim()) || start.isPending}
            sx={{ fontWeight: 800 }}
          >
            {t("locker.start.button")}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
