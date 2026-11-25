import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  TextField,
  Tooltip,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import SendIcon from "@mui/icons-material/Send";
import { useTranslation } from "react-i18next";
import { eventSentence } from "@/features/activity/lib/eventSentence";
import { ACTIVITY_TYPE_META } from "../constants";
import type { ActivityEvent } from "../types";
import { ActivityTypeIcon } from "./ActivityTypeIcon";
import {
  useActivityComments,
  useAddActivityComment,
  useToggleCheckActivity,
} from "../hooks/useActivityHooks";
import { formatDateTime } from "@/lib/dates";

interface ActivityEventRowProps {
  event: ActivityEvent;
  seeAmounts: boolean;
  canCheck: boolean;
  onOpenBill: (invoiceId: number) => void;
  onMarkRead?: (eventId: number) => void;
}

export function ActivityEventRow({
  event,
  seeAmounts,
  canCheck,
  onOpenBill,
  onMarkRead,
}: ActivityEventRowProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const toggleCheck = useToggleCheckActivity();
  const { data: comments = [], isLoading: loadingComments } = useActivityComments(
    event.event_id,
    commentsOpen,
  );
  const addComment = useAddActivityComment(event.event_id);

  const meta = ACTIVITY_TYPE_META[event.type] ?? ACTIVITY_TYPE_META.system;
  const sentence = eventSentence(event, t(meta.labelKey));

  const isUnread = !event.is_read;
  const isChecked = Boolean(event.checked_at);

  const handleRowClick = () => {
    if (isUnread && onMarkRead) onMarkRead(event.event_id);
    if (event.invoice_id) onOpenBill(event.invoice_id);
  };

  const handleSendComment = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    addComment.mutate(trimmed, {
      onSuccess: () => setDraft(""),
    });
  };

  const timeStr = event.occurred_at
    ? new Date(event.occurred_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <Box
      data-testid={`activity-row-${event.event_id}`}
      sx={{
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: isUnread
          ? alpha(theme.palette.primary.main, isDark ? 0.08 : 0.04)
          : "background.paper",
        transition: "background-color 0.15s",
      }}
    >
      <Box
        onClick={handleRowClick}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          px: { xs: 1.5, sm: 2 },
          py: 1.25,
          cursor: event.invoice_id ? "pointer" : "default",
          flexWrap: { xs: "wrap", md: "nowrap" },
          "&:hover": {
            bgcolor: alpha(theme.palette.text.primary, 0.03),
          },
        }}
      >
        {/* Type icon */}
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            bgcolor: isDark ? meta.darkBg : meta.bg,
            color: meta.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ActivityTypeIcon type={event.type} fontSize="small" />
        </Box>

        {/* Amount first */}
        {seeAmounts && event.amount != null && Number(event.amount) !== 0 && (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 800,
              fontFamily: "'JetBrains Mono', monospace",
              fontVariantNumeric: "tabular-nums",
              color: "text.primary",
              flexShrink: 0,
              minWidth: 82,
            }}
          >
            Rs. {Number(event.amount).toLocaleString()}
          </Typography>
        )}

        {/* Main sentence + metadata */}
        <Box sx={{ flex: 1, minWidth: 160 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: isUnread ? 800 : 500,
              color: "text.primary",
              lineHeight: 1.35,
            }}
          >
            {sentence}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mt: 0.25 }}>
            {event.invoice_id && (
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: "primary.main", fontVariantNumeric: "tabular-nums" }}
              >
                {event.invoice_number || `INV-${event.invoice_id}`}
              </Typography>
            )}
            {event.customer_name && (
              <Typography variant="caption" color="text.secondary">
                · {event.customer_name}
              </Typography>
            )}
            {event.actor_name && (
              <Typography variant="caption" color="text.secondary">
                · {event.actor_name}
              </Typography>
            )}
            {timeStr && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontVariantNumeric: "tabular-nums" }}
              >
                · {timeStr}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Right badges & actions */}
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {event.after_hours && (
            <Tooltip title={t("activity.afterHours")}>
              <Chip
                size="small"
                label="🌙"
                sx={{ height: 22, fontSize: "0.75rem", minWidth: 28 }}
              />
            </Tooltip>
          )}
          {event.risk === "high" && (
            <Chip
              size="small"
              color="error"
              label={t("activity.high")}
              sx={{ height: 22, fontSize: "0.7rem", fontWeight: 800 }}
            />
          )}

          {/* Comments toggle */}
          <Button
            size="small"
            startIcon={<ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 15 }} />}
            onClick={() => {
              if (isUnread && onMarkRead) onMarkRead(event.event_id);
              setCommentsOpen((v) => !v);
            }}
            aria-label={t("activity.comments")}
            sx={{
              minWidth: 40,
              minHeight: 32,
              px: 1,
              textTransform: "none",
              fontVariantNumeric: "tabular-nums",
              color: event.comment_count > 0 ? "primary.main" : "text.secondary",
            }}
          >
            {event.comment_count || 0}
          </Button>

          {/* Shared Checked tick */}
          {canCheck ? (
            <Tooltip
              title={
                isChecked
                  ? t("activity.checkedBy", {
                      name: event.checked_by_name || "",
                      time: event.checked_at
                        ? formatDateTime(event.checked_at, {
                            today: t("time.today"),
                            yesterday: t("time.yesterday"),
                          })
                        : "",
                    })
                  : t("activity.markChecked")
              }
            >
              <IconButton
                size="small"
                aria-label={isChecked ? t("activity.uncheck") : t("activity.markChecked")}
                disabled={toggleCheck.isPending}
                onClick={() =>
                  toggleCheck.mutate({ eventId: event.event_id, checked: isChecked })
                }
                sx={{
                  minWidth: 36,
                  minHeight: 36,
                  color: isChecked ? "success.main" : "text.disabled",
                }}
              >
                {isChecked ? <CheckCircleIcon fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          ) : (
            isChecked && (
              <Chip
                size="small"
                icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                label={event.checked_by_name || t("activity.checked")}
                color="success"
                variant="outlined"
                sx={{ height: 22, fontSize: "0.68rem", fontWeight: 700 }}
              />
            )
          )}
        </Box>
      </Box>

      {/* Expandable comments thread */}
      <Collapse in={commentsOpen}>
        <Box
          sx={{
            px: { xs: 2, sm: 4 },
            pb: 1.5,
            pt: 0.75,
            bgcolor: alpha(theme.palette.text.primary, 0.02),
            borderTop: "1px dashed",
            borderColor: "divider",
          }}
        >
          {isChecked && event.checked_by_name && (
            <Typography variant="caption" color="success.main" sx={{ display: "block", mb: 0.75, fontWeight: 700 }}>
              ✓ {t("activity.checkedBy", {
                name: event.checked_by_name,
                time: event.checked_at
                  ? formatDateTime(event.checked_at, {
                      today: t("time.today"),
                      yesterday: t("time.yesterday"),
                    })
                  : "",
              })}
            </Typography>
          )}
          {loadingComments ? (
            <Typography variant="caption" color="text.secondary">
              {t("common.loading")}
            </Typography>
          ) : comments.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              {t("activity.noComments")}
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 1 }}>
              {comments.map((c) => (
                <Box key={c.comment_id} sx={{ display: "flex", gap: 1, alignItems: "baseline" }}>
                  <Typography variant="caption" sx={{ fontWeight: 800 }}>
                    {c.user_name || `#${c.user_id}`}:
                  </Typography>
                  <Typography variant="caption" sx={{ flex: 1, color: "text.primary" }}>
                    {c.body}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatDateTime(c.created_at, {
                      today: t("time.today"),
                      yesterday: t("time.yesterday"),
                    })}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
          <Box sx={{ display: "flex", gap: 1, mt: 0.75 }}>
            <TextField
              size="small"
              fullWidth
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
              placeholder={t("activity.addCommentPlaceholder")}
              slotProps={{
                htmlInput: { "aria-label": t("activity.addCommentPlaceholder") },
              }}
            />
            <IconButton
              color="primary"
              onClick={handleSendComment}
              disabled={!draft.trim() || addComment.isPending}
              aria-label={t("activity.sendComment")}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}
