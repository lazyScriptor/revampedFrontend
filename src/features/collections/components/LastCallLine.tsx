import React from "react";
import { Box, Typography } from "@mui/material";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import type { LastCallSummary } from "../types";
import { dashboardTones } from "@/features/dashboard/_tokens";

interface LastCallLineProps {
  lastCall?: LastCallSummary | null;
  onOpenCallCard?: () => void;
}

function formatRelativeShort(iso?: string | null): string {
  if (!iso) return "";
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} h ago`;
  return dayjs(iso).format("D MMM");
}

function formatOrdinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export const LastCallLine: React.FC<LastCallLineProps> = ({ lastCall, onOpenCallCard }) => {
  const { t } = useTranslation();

  if (!lastCall || (!lastCall.started_at && !lastCall.outcome && !lastCall.needs_note && !lastCall.promise_status)) {
    return (
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontSize: "0.7rem",
          fontWeight: 500,
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
        }}
      >
        📞 {t("collections.callLine.notCalledYet", "Not called yet")}
      </Typography>
    );
  }

  if (lastCall.needs_note) {
    return (
      <Box
        component={onOpenCallCard ? "button" : "span"}
        type={onOpenCallCard ? "button" : undefined}
        onClick={(e: React.MouseEvent) => {
          if (onOpenCallCard) {
            e.stopPropagation();
            onOpenCallCard();
          }
        }}
        sx={{
          border: 0,
          background: "transparent",
          p: 0,
          cursor: onOpenCallCard ? "pointer" : "default",
          textAlign: "left",
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: dashboardTones.warning.strong,
            fontSize: "0.7rem",
            fontWeight: 800,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          📞 {t("collections.callLine.needsNote", "Call needs a note")}
        </Typography>
      </Box>
    );
  }

  if (lastCall.promise_status === "missed") {
    const amountText = lastCall.promise_amount
      ? `Rs ${Number(lastCall.promise_amount).toLocaleString("en-US")}`
      : "";
    const dateText = lastCall.promise_date ? dayjs(lastCall.promise_date).format("D MMM") : "";
    return (
      <Typography
        variant="caption"
        sx={{
          color: dashboardTones.danger.strong,
          fontSize: "0.7rem",
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        ⚠{" "}
        {t("collections.callLine.promiseMissed", {
          amount: amountText,
          date: dateText,
          defaultValue: `Promise missed (${amountText} due ${dateText})`,
        })}
      </Typography>
    );
  }

  if (lastCall.promise_status === "waiting" && lastCall.promise_amount && lastCall.promise_date) {
    const amountText = `Rs ${Number(lastCall.promise_amount).toLocaleString("en-US")}`;
    const dateText = dayjs(lastCall.promise_date).format("ddd D MMM");
    return (
      <Typography
        variant="caption"
        sx={{
          color: dashboardTones.accent.strong,
          fontSize: "0.7rem",
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        💰{" "}
        {t("collections.callLine.promised", {
          amount: amountText,
          date: dateText,
          defaultValue: `Promised ${amountText} by ${dateText}`,
        })}
      </Typography>
    );
  }

  const rel = formatRelativeShort(lastCall.started_at);

  if (lastCall.outcome === "no_answer" || lastCall.outcome === "unreachable") {
    const triesText =
      lastCall.tries_today && lastCall.tries_today > 1
        ? ` · ${formatOrdinal(lastCall.tries_today)} try today`
        : "";
    const label =
      lastCall.outcome === "unreachable"
        ? t("collections.callLine.unreachable", "Off / wrong number")
        : t("collections.callLine.noAnswer", "No answer");
    return (
      <Typography
        variant="caption"
        sx={{
          color: dashboardTones.danger.strong,
          fontSize: "0.7rem",
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        ❌ {label}
        {rel ? ` · ${rel}` : ""}
        {triesText}
      </Typography>
    );
  }

  if (lastCall.staff_name && lastCall.started_at) {
    const diffMin = Math.round((Date.now() - new Date(lastCall.started_at).getTime()) / 60_000);
    if (diffMin <= 120) {
      return (
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontSize: "0.7rem",
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          👥{" "}
          {t("collections.callLine.calledByStaff", {
            staff: lastCall.staff_name,
            ago: rel,
            defaultValue: `Called by ${lastCall.staff_name} ${rel}`,
          })}
        </Typography>
      );
    }
  }

  const timeText = lastCall.started_at
    ? dayjs(lastCall.started_at).isSame(dayjs(), "day")
      ? `today ${dayjs(lastCall.started_at).format("HH:mm")}`
      : dayjs(lastCall.started_at).format("D MMM HH:mm")
    : "";
  const resultText = lastCall.result_label || lastCall.result || "";

  return (
    <Typography
      variant="caption"
      sx={{
        color: dashboardTones.accent.strong,
        fontSize: "0.7rem",
        fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      ✅ {t("collections.callLine.answered", "Answered")}
      {timeText ? ` · ${timeText}` : ""}
      {resultText ? ` · ${resultText}` : ""}
    </Typography>
  );
};
