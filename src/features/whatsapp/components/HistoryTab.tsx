import { useState } from "react";
import { Alert, Box, Button, Chip, MenuItem, Paper, Skeleton, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";

import type { LogEntry, TemplateKey } from "../api/whatsapp.api";
import { useWhatsAppLog } from "../hooks/useWhatsApp";
import { TEMPLATE_I18N, timeAgo } from "../lib/whatsapp";

const PAGE = 30;
const ALL_TYPES = Object.keys(TEMPLATE_I18N) as TemplateKey[];

export function HistoryTab() {
  const { t, i18n } = useTranslation();
  const [type, setType] = useState<TemplateKey | "">("");
  const [limit, setLimit] = useState(PAGE);
  const { data, isLoading, isError, isFetching } = useWhatsAppLog({ template_key: type || undefined, limit });
  const [openId, setOpenId] = useState<number | null>(null);

  if (isError) return <Alert severity="error">{t("whatsapp.history.loadFailed")}</Alert>;

  const entries: LogEntry[] = data?.entries ?? [];
  const total = data?.total ?? 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
        <TextField
          select
          size="small"
          value={type}
          onChange={(e) => {
            setType(e.target.value as TemplateKey | "");
            setLimit(PAGE);
          }}
          label={t("whatsapp.history.filterType")}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">{t("whatsapp.history.allTypes")}</MenuItem>
          {ALL_TYPES.map((k) => (
            <MenuItem key={k} value={k}>
              {t(TEMPLATE_I18N[k])}
            </MenuItem>
          ))}
        </TextField>
        <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {t("whatsapp.history.count", { count: total })}
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        {isLoading ? (
          <Box sx={{ p: 2 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="rounded" height={56} sx={{ mb: 1 }} />
            ))}
          </Box>
        ) : entries.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
            <WhatsAppIcon sx={{ fontSize: 40, opacity: 0.5 }} />
            <Typography sx={{ fontWeight: 700 }}>{t("whatsapp.history.empty")}</Typography>
          </Box>
        ) : (
          entries.map((e) => {
            const expanded = openId === e.log_id;
            return (
              <Box
                key={e.log_id}
                data-testid="history-row"
                onClick={() => setOpenId(expanded ? null : e.log_id)}
                sx={{ px: 2, py: 1.25, borderBottom: "1px solid", borderColor: "divider", cursor: "pointer", "&:last-of-type": { borderBottom: 0 }, "&:hover": { bgcolor: "action.hover" } }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <Typography sx={{ fontWeight: 800 }}>{e.customer_name || "—"}</Typography>
                  {e.invoice_number && <Chip size="small" label={e.invoice_number} sx={{ height: 20, fontSize: "0.68rem", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }} />}
                  <Chip size="small" variant="outlined" label={t(TEMPLATE_I18N[e.template_key])} sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }} />
                  <Chip size="small" label={e.language === "si" ? "සිං" : "EN"} sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800 }} />
                  <Box sx={{ flexGrow: 1 }} />
                  <Chip
                    size="small"
                    icon={e.status === "sent" ? <CheckCircleIcon /> : <HourglassEmptyIcon />}
                    color={e.status === "sent" ? "success" : "default"}
                    variant={e.status === "sent" ? "filled" : "outlined"}
                    label={e.status === "sent" ? t("whatsapp.history.sent") : t("whatsapp.history.opened")}
                    sx={{ height: 22, fontSize: "0.68rem", fontWeight: 700 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                    {timeAgo(e.created_at, i18n.language)}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5, whiteSpace: expanded ? "pre-wrap" : "nowrap", overflow: "hidden", textOverflow: "ellipsis", wordBreak: "break-word" }}
                >
                  {expanded ? e.body : e.body.replace(/\s+/g, " ")}
                </Typography>
              </Box>
            );
          })
        )}
      </Paper>

      {entries.length < total && (
        <Box sx={{ textAlign: "center" }}>
          <Button onClick={() => setLimit((l) => l + PAGE)} disabled={isFetching} sx={{ fontWeight: 700, textTransform: "none" }}>
            {t("whatsapp.history.loadMore")}
          </Button>
        </Box>
      )}
    </Box>
  );
}
