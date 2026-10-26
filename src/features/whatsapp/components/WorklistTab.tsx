import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Alert, Box, Button, Chip, IconButton, Paper, Skeleton, Tooltip, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import PaymentsIcon from "@mui/icons-material/Payments";
import PhoneDisabledIcon from "@mui/icons-material/PhoneDisabled";
import RefreshIcon from "@mui/icons-material/Refresh";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import TodayIcon from "@mui/icons-material/Today";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import DoneAllIcon from "@mui/icons-material/DoneAll";

import { ResponsiveKpiStrip } from "@/components/ui/ResponsiveKpiStrip";
import { KpiTile } from "@/components/reports/KpiTile";
import { formatDisplayDate } from "@/lib/dates";
import type { WorklistItem, WorklistSection } from "../api/whatsapp.api";
import { useWhatsAppWorklist } from "../hooks/useWhatsApp";
import { isBlocked, lacksNumber, timeAgo } from "../lib/whatsapp";
import { WA_GREEN, WA_GREEN_TEXT, WhatsAppSendDialog } from "./WhatsAppSendDialog";
import { WhatsAppQueueDialog } from "./WhatsAppQueueDialog";

const SECTION_ORDER: WorklistSection[] = ["overdue_returns", "returns_due_today", "returns_due_tomorrow", "payments_pending"];

const rs = (n: number | null) => `Rs. ${Number(n || 0).toLocaleString()}`;

/** "• 2 × Hammer Drill (EQ-1)\n• 1 × Ladder" → "2 × Hammer Drill (EQ-1), 1 × Ladder" */
const oneLine = (items: string) =>
  items
    .split("\n")
    .map((l) => l.replace(/^•\s*/, "").trim())
    .filter(Boolean)
    .join(", ");

// A customer who was already sent this kind of message in the last hours is shown as done.
const messagedRecently = (item: WorklistItem) => item.warnings.includes("messaged_recently");

export function WorklistTab() {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError, isFetching, refetch } = useWhatsAppWorklist();
  const [section, setSection] = useState<WorklistSection | null>(null);
  const [dialog, setDialog] = useState<WorklistItem | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);

  // land on the first section that has something in it
  const firstFilled = useMemo(() => (data ? SECTION_ORDER.find((s) => data.summary[s] > 0) ?? SECTION_ORDER[0] : SECTION_ORDER[0]), [data]);
  const active: WorklistSection = section ?? firstFilled;
  useEffect(() => {
    // if the chosen section empties out (everyone messaged / returned), fall back to the auto pick
    if (section && data && data.summary[section] === 0) setSection(null);
  }, [data, section]);

  const rows = data?.sections[active] ?? [];
  const queueable = rows.filter((r) => !isBlocked(r.warnings) && !lacksNumber(r.warnings) && !messagedRecently(r));

  const TILES: Record<WorklistSection, { label: string; hint: string; icon: ReactNode; tone: "error" | "warning" | "info" | "success" }> = {
    overdue_returns: { label: t("whatsapp.today.overdue"), hint: t("whatsapp.today.overdueHint"), icon: <EventBusyIcon />, tone: "error" },
    returns_due_today: { label: t("whatsapp.today.dueToday"), hint: t("whatsapp.today.dueTodayHint"), icon: <TodayIcon />, tone: "warning" },
    returns_due_tomorrow: { label: t("whatsapp.today.dueTomorrow"), hint: t("whatsapp.today.dueTomorrowHint"), icon: <EventAvailableIcon />, tone: "info" },
    payments_pending: { label: t("whatsapp.today.payments"), hint: data ? rs(data.summary.balance_pending) : "", icon: <PaymentsIcon />, tone: "success" },
  };

  if (isError) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => refetch()} startIcon={<RefreshIcon />}>
            {t("common.retry")}
          </Button>
        }
      >
        {t("whatsapp.today.loadFailed")}
      </Alert>
    );
  }

  const nothingAtAll = !!data && SECTION_ORDER.every((s) => data.summary[s] === 0);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <ResponsiveKpiStrip mobileLabel={t("whatsapp.today.title")}>
        {SECTION_ORDER.map((s) => (
          <KpiTile
            key={s}
            label={TILES[s].label}
            value={data ? data.summary[s] : "—"}
            hint={TILES[s].hint}
            icon={TILES[s].icon}
            tone={TILES[s].tone}
            loading={isLoading}
            active={active === s}
            onClick={() => setSection(s)}
            compact
          />
        ))}
      </ResponsiveKpiStrip>

      {nothingAtAll ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
          <DoneAllIcon sx={{ fontSize: 48, color: "success.main" }} />
          <Typography sx={{ fontWeight: 800, mt: 1 }}>{t("whatsapp.today.allClear")}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t("whatsapp.today.allClearHint")}
          </Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.25, borderBottom: "1px solid", borderColor: "divider", flexWrap: "wrap" }}>
            <Typography sx={{ fontWeight: 800, flexGrow: 1 }}>{TILES[active].label}</Typography>
            <Tooltip title={t("common.refresh")}>
              <span>
                <IconButton size="small" onClick={() => refetch()} disabled={isFetching} aria-label={t("common.refresh")}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Button
              size="small"
              variant="contained"
              disableElevation
              startIcon={<WhatsAppIcon />}
              disabled={queueable.length === 0}
              onClick={() => setQueueOpen(true)}
              sx={{ bgcolor: WA_GREEN, color: WA_GREEN_TEXT, fontWeight: 800, borderRadius: 2.5, textTransform: "none", "&:hover": { bgcolor: "#1fbd5b" } }}
            >
              {t("whatsapp.today.messageAll", { count: queueable.length })}
            </Button>
          </Box>

          {isLoading ? (
            <Box sx={{ p: 2 }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} variant="rounded" height={64} sx={{ mb: 1 }} />
              ))}
            </Box>
          ) : rows.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: "center" }}>
              {t("whatsapp.today.sectionEmpty")}
            </Typography>
          ) : (
            rows.map((item) => <WorklistRow key={`${item.template_key}-${item.invoice_id}`} item={item} onOpen={() => setDialog(item)} language={i18n.language} />)
          )}
        </Paper>
      )}

      {dialog && <WhatsAppSendDialog open onClose={() => setDialog(null)} invoiceId={dialog.invoice_id} templateKey={dialog.template_key} />}
      <WhatsAppQueueDialog open={queueOpen} onClose={() => setQueueOpen(false)} items={queueable} />
    </Box>
  );
}

function WorklistRow({ item, onOpen, language }: { item: WorklistItem; onOpen: () => void; language: string }) {
  const { t } = useTranslation();
  const isPayment = item.template_key === "payment_reminder";
  const done = messagedRecently(item);
  const blocked = isBlocked(item.warnings);
  const noNumber = lacksNumber(item.warnings);

  return (
    <Box
      data-testid="worklist-row"
      sx={{
        display: "flex",
        alignItems: { xs: "flex-start", sm: "center" },
        gap: 1.5,
        px: 2,
        py: 1.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        opacity: done || blocked ? 0.65 : 1,
        "&:last-of-type": { borderBottom: 0 },
      }}
    >
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography sx={{ fontWeight: 800 }} noWrap>
            {item.customer.name}
          </Typography>
          <Chip size="small" label={item.invoice_number} sx={{ height: 20, fontSize: "0.68rem", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }} />
          {isPayment ? (
            <Chip size="small" color="error" variant="outlined" label={rs(item.balance)} sx={{ height: 20, fontSize: "0.7rem", fontWeight: 800, fontVariantNumeric: "tabular-nums" }} />
          ) : item.days_late > 0 ? (
            <Chip size="small" color="error" label={t("whatsapp.today.daysLate", { count: item.days_late })} sx={{ height: 20, fontSize: "0.7rem", fontWeight: 800 }} />
          ) : null}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: 0.5, rowGap: 0, mt: 0.25, color: "text.secondary" }}>
          {item.customer.phone.valid ? <SmartphoneIcon sx={{ fontSize: 14, color: "success.main" }} /> : <PhoneDisabledIcon sx={{ fontSize: 14, color: "warning.main" }} />}
          <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, whiteSpace: "nowrap" }}>
            {item.customer.phone.display || t("whatsapp.dialog.noNumber")}
          </Typography>
          {item.due_date && (
            <Typography variant="caption" sx={{ ml: 1, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
              · {t("whatsapp.today.due", { date: formatDisplayDate(item.due_date) })}
            </Typography>
          )}
          {blocked && <Chip size="small" label={t("whatsapp.today.optedOut")} sx={{ ml: 1, height: 18, fontSize: "0.62rem", fontWeight: 700 }} />}
        </Box>
        {item.items && (
          <Typography variant="caption" sx={{ color: "text.secondary", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {oneLine(item.items)}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
        {done && item.last_message && (
          <Tooltip title={t("whatsapp.today.messagedAgo", { when: timeAgo(item.last_message.created_at, language) })}>
            <CheckCircleIcon sx={{ color: "success.main", fontSize: 20 }} aria-label={t("whatsapp.today.messaged")} />
          </Tooltip>
        )}
        <Button
          size="small"
          variant={done ? "outlined" : "contained"}
          disableElevation
          disabled={blocked}
          onClick={onOpen}
          startIcon={<WhatsAppIcon />}
          aria-label={`${t("whatsapp.button.send")}: ${item.customer.name}`}
          sx={
            done || blocked
              ? { fontWeight: 800, borderRadius: 2.5, textTransform: "none" }
              : { bgcolor: WA_GREEN, color: WA_GREEN_TEXT, fontWeight: 800, borderRadius: 2.5, textTransform: "none", "&:hover": { bgcolor: "#1fbd5b" } }
          }
        >
          <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
            {noNumber ? t("whatsapp.today.pickContact") : t("whatsapp.today.message")}
          </Box>
        </Button>
      </Box>
    </Box>
  );
}
