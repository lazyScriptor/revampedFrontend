import { Box, Chip, Paper, Typography } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useDeviceCallsToNote } from "../hooks/useDeviceCalls";
import { formatCallLength } from "../lib/callFormat";

/** Calls from this phone, with a customer who owes money or has machines out, still without a note. */
export function CallsToNoteList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data, isError } = useDeviceCallsToNote();
  const items = data?.items ?? [];

  if (isError) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t("phoneShell.toNote.loadFailed")}
      </Typography>
    );
  }
  if (!data) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }} data-testid="calls-to-note">
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: items.length ? 1 : 0.5 }}>
        <Typography sx={{ fontWeight: 800 }}>{t("phoneShell.toNote.title")}</Typography>
        <Chip
          size="small"
          color={items.length ? "warning" : "default"}
          label={items.length}
          sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 800 }}
        />
      </Box>
      {items.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          {t("phoneShell.toNote.empty")}
        </Typography>
      )}
      {items.map((c) => (
        <Box
          key={c.client_call_id}
          component="button"
          type="button"
          onClick={() => navigate({ to: "/device/call/$callId", params: { callId: c.client_call_id } })}
          sx={{
            display: "block",
            width: "100%",
            textAlign: "left",
            bgcolor: "transparent",
            color: "text.primary",
            font: "inherit",
            border: 0,
            borderTop: 1,
            borderColor: "divider",
            py: 1.25,
            px: 0,
            minHeight: 56,
            cursor: "pointer",
          }}
        >
          <Typography sx={{ fontWeight: 700 }}>{c.customer_name || c.raw_number}</Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            {new Date(c.started_at).toLocaleString(i18n.language)} ·{" "}
            {c.suggested_outcome === "answered"
              ? `${t("collections.callCard.answered")} · ${formatCallLength(t, c.duration_seconds)}`
              : t("collections.callCard.noAnswer")}{" "}
            · {t("phoneShell.toNote.openBills", { count: c.open_bills })}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
}
