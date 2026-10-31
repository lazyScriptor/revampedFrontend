import { useState } from "react";
import { Box, Button, Chip, CircularProgress, Paper, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import { NumberInput } from "@/components/ui/NumberInput";
import { formatDateTime } from "@/lib/dates";
import { useToast } from "@/components/ui/AppToast";
import { useLockerHistory, useReviewCount, useSetFloat } from "../hooks/useLocker";
import type { LockerCount } from "../api/locker.api";
import { isZero, money, personName, toNum } from "../lib/locker";

const num = { fontVariantNumeric: "tabular-nums", fontFamily: "'JetBrains Mono', monospace" } as const;

const KIND_LABEL: Record<LockerCount["kind"], string> = {
  START: "locker.kind.START",
  OPENING: "locker.kind.OPENING",
  CLOSING: "locker.kind.CLOSING",
};

function CountRow({ c }: { c: LockerCount }) {
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const review = useReviewCount();
  const dayWords = { today: t("time.today"), yesterday: t("time.yesterday") };
  const diff = toNum(c.difference);
  const mismatch = !isZero(diff);

  return (
    <Box sx={{ px: 1.5, py: 1.25, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 }, bgcolor: mismatch && !c.reviewed_at ? "rgba(245, 158, 11, 0.06)" : "transparent" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Chip size="small" label={t(KIND_LABEL[c.kind])} sx={{ fontWeight: 800 }} />
        <Typography variant="body2" sx={{ ...num, fontWeight: 700 }}>
          {formatDateTime(c.counted_at, dayWords)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {personName(c.CountedBy) || "—"}
        </Typography>
        <Box sx={{ flex: 1 }} />
        {mismatch ? (
          <Chip size="small" color="warning" label={t(diff < 0 ? "locker.diff.short" : "locker.diff.over", { amount: money(Math.abs(diff)) })} sx={{ fontWeight: 800, ...num }} />
        ) : (
          <Chip size="small" color="success" variant="outlined" label={t("locker.history.matched")} sx={{ fontWeight: 700 }} />
        )}
      </Box>
      <Typography variant="body2" sx={{ ...num, mt: 0.5 }}>
        {t("locker.history.counted", { amount: money(c.counted_amount) })}
        {c.expected_amount !== null ? ` · ${t("locker.history.expected", { amount: money(c.expected_amount) })}` : ""}
        {toNum(c.sent_home) > 0 ? ` · ${t("locker.history.sentHome", { amount: money(c.sent_home) })}` : ""}
        {` · ${t("locker.history.left", { amount: money(c.left_in_drawer) })}`}
      </Typography>
      {c.reason && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          {t("locker.history.reason", { reason: c.reason })}
        </Typography>
      )}
      {mismatch &&
        (c.reviewed_at ? (
          <Typography variant="caption" color="success.dark" sx={{ fontWeight: 700 }}>
            {t("locker.history.acceptedBy", { name: personName(c.ReviewedBy) || "—", time: formatDateTime(c.reviewed_at, dayWords) })}
          </Typography>
        ) : (
          <Button size="small" variant="outlined" color="warning" disabled={review.isPending} sx={{ mt: 0.75, fontWeight: 800 }} onClick={() => review.mutate({ count_id: c.count_id }, { onSuccess: () => showSuccess(t("locker.history.accepted")) })}>
            {t("locker.history.accept")}
          </Button>
        ))}
    </Box>
  );
}

/** Owner view: every count, what went home, and every difference with its reason. */
export function LockerHistory({ float }: { float: number }) {
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const { data, isLoading } = useLockerHistory(true);
  const setFloat = useSetFloat();
  const [draft, setDraft] = useState<number | "" | null>(null);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography sx={{ fontWeight: 800 }}>{t("locker.float")}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t("locker.floatHint")}
          </Typography>
        </Box>
        <NumberInput
          size="small"
          value={draft === null ? float : draft}
          onChange={setDraft}
          decimals
          label={t("locker.float")}
          sx={{ width: 160 }}
          slotProps={{ htmlInput: { "aria-label": t("locker.float"), style: { ...num, fontWeight: 700 } } }}
        />
        {draft !== null && draft !== "" && draft !== float && (
          <Button variant="contained" disableElevation size="small" disabled={setFloat.isPending} onClick={() => setFloat.mutate(draft as number, { onSuccess: () => { setDraft(null); showSuccess(t("locker.floatSaved")); } })}>
            {t("common.save")}
          </Button>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : !data?.rows.length ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            {t("locker.history.empty")}
          </Typography>
        ) : (
          data.rows.map((c) => <CountRow key={c.count_id} c={c} />)
        )}
      </Paper>
    </Box>
  );
}
