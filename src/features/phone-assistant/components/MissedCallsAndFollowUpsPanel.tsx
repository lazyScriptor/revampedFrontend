import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import CallIcon from "@mui/icons-material/Call";
import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
import EventRepeatOutlinedIcon from "@mui/icons-material/EventRepeatOutlined";
import PhoneMissedOutlinedIcon from "@mui/icons-material/PhoneMissedOutlined";
import { useTranslation } from "react-i18next";
import {
  useDeviceFollowUps,
  useDeviceMissedCalls,
  useFollowUps,
  useMarkCallHandled,
  useMarkDeviceCallHandled,
  useMissedCalls,
  useUpdateDeviceFollowUp,
  useUpdateFollowUp,
} from "../hooks/useCalls";

function addDaysYmd(ymd: string, days: number) {
  const parts = ymd.split("-").map((n) => Number(n));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    const dt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return dt.toISOString().slice(0, 10);
  }
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days));
  return dt.toISOString().slice(0, 10);
}

export function MissedCallsAndFollowUpsPanel({
  mode = "staff",
}: {
  mode?: "staff" | "device";
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const surfaceBg = isDark ? "#0f172a" : "#ffffff";
  const rowBg = isDark ? "#1e293b" : "#f8fafc";
  const borderColor = isDark ? "#334155" : "#e2e8f0";
  const textPrimary = isDark ? "#f8fafc" : "#0f172a";
  const textSecondary = isDark ? "#94a3b8" : "#475569";

  const staffMissed = useMissedCalls(25, mode === "staff");
  const deviceMissed = useDeviceMissedCalls(25, mode === "device");
  const missedQuery = mode === "device" ? deviceMissed : staffMissed;

  const staffMarkHandled = useMarkCallHandled();
  const deviceMarkHandled = useMarkDeviceCallHandled();
  const markHandledMutation = mode === "device" ? deviceMarkHandled : staffMarkHandled;

  const staffFollowUps = useFollowUps({ status: "pending", limit: 25 }, mode === "staff");
  const deviceFollowUps = useDeviceFollowUps({ status: "pending", limit: 25 }, mode === "device");
  const followUpsQuery = mode === "device" ? deviceFollowUps : staffFollowUps;

  const staffUpdateFollowUp = useUpdateFollowUp();
  const deviceUpdateFollowUp = useUpdateDeviceFollowUp();
  const updateFollowUpMutation =
    mode === "device" ? deviceUpdateFollowUp : staffUpdateFollowUp;

  const missedItems = missedQuery.data?.items ?? [];
  const followUpItems = followUpsQuery.data?.items ?? [];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" },
        gap: 2.5,
      }}
    >
      {/* D2 Missed-call queue */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 2.5,
          border: `1px solid ${borderColor}`,
          bgcolor: surfaceBg,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
          <PhoneMissedOutlinedIcon sx={{ color: "error.main", fontSize: 20 }} />
          <Typography sx={{ fontWeight: 800, fontSize: 15, color: textPrimary }}>
            {t("phoneAssistant.missedCalls.title")}
          </Typography>
          <Chip
            size="small"
            label={missedItems.length}
            sx={{
              height: 20,
              fontSize: "0.72rem",
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
            }}
          />
        </Stack>

        {missedQuery.isLoading ? (
          <Box sx={{ py: 3, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={22} />
          </Box>
        ) : missedQuery.isError ? (
          <Alert severity="error">{t("phoneAssistant.missedCalls.loadFailed")}</Alert>
        ) : missedItems.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: textSecondary, py: 1.5 }}>
            {t("phoneAssistant.missedCalls.empty")}
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            {missedItems.map((item) => {
              const displayName =
                item.customer_name ||
                item.contact_name ||
                item.raw_number ||
                item.phone_e164 ||
                "Unknown caller";
              const dialPhone = item.phone_e164 ? `+${item.phone_e164}` : item.raw_number || "";
              return (
                <Paper
                  key={item.call_id}
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: rowBg,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: textPrimary }}>
                        {displayName}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 12,
                          color: textSecondary,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {item.raw_number || item.phone_e164 || "—"} ·{" "}
                        {new Date(item.started_at).toLocaleString()}
                      </Typography>
                      {item.brief?.summary_line && (
                        <Typography sx={{ fontSize: 12, color: textSecondary, mt: 0.35 }}>
                          {item.brief.summary_line}
                        </Typography>
                      )}
                    </Box>

                    <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                      {dialPhone && (
                        <Button
                          component="a"
                          href={`tel:${dialPhone}`}
                          size="small"
                          variant="outlined"
                          startIcon={<CallIcon fontSize="small" />}
                          sx={{ textTransform: "none", fontWeight: 700, minHeight: 34 }}
                        >
                          {t("phoneAssistant.missedCalls.callBack")}
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="contained"
                        disableElevation
                        disabled={markHandledMutation.isPending}
                        startIcon={<CheckOutlinedIcon fontSize="small" />}
                        onClick={() => markHandledMutation.mutate(item.call_id)}
                        sx={{ textTransform: "none", fontWeight: 700, minHeight: 34 }}
                      >
                        {t("phoneAssistant.missedCalls.markHandled")}
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Paper>

      {/* D3 Follow-ups */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 2.5,
          border: `1px solid ${borderColor}`,
          bgcolor: surfaceBg,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
          <EventRepeatOutlinedIcon sx={{ color: "warning.main", fontSize: 20 }} />
          <Typography sx={{ fontWeight: 800, fontSize: 15, color: textPrimary }}>
            {t("phoneAssistant.followUps.title")}
          </Typography>
          <Chip
            size="small"
            label={followUpItems.length}
            sx={{
              height: 20,
              fontSize: "0.72rem",
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
            }}
          />
        </Stack>

        {followUpsQuery.isLoading ? (
          <Box sx={{ py: 3, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={22} />
          </Box>
        ) : followUpsQuery.isError ? (
          <Alert severity="error">{t("phoneAssistant.followUps.loadFailed")}</Alert>
        ) : followUpItems.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: textSecondary, py: 1.5 }}>
            {t("phoneAssistant.followUps.empty")}
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            {followUpItems.map((item) => {
              const targetName =
                item.customer_name ||
                item.contact_name ||
                item.raw_number ||
                item.phone_e164 ||
                "Customer";
              const dueDate = item.follow_up_on || new Date().toISOString().slice(0, 10);
              return (
                <Paper
                  key={item.note_id}
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: rowBg,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: textPrimary }}>
                          {targetName}
                        </Typography>
                        <Chip
                          size="small"
                          label={t("phoneAssistant.followUps.dueLabel", { date: dueDate })}
                          sx={{
                            height: 20,
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            fontVariantNumeric: "tabular-nums",
                            bgcolor: "#fef3c7",
                            color: "#92400e",
                          }}
                        />
                        {item.tags.map((tag) => (
                          <Chip
                            key={tag}
                            size="small"
                            label={tag}
                            sx={{ height: 20, fontSize: "0.7rem" }}
                          />
                        ))}
                      </Stack>
                      {item.note && (
                        <Typography sx={{ fontSize: 12.5, color: textSecondary, mt: 0.35 }}>
                          {item.note}
                        </Typography>
                      )}
                    </Box>

                    <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={updateFollowUpMutation.isPending}
                        onClick={() =>
                          updateFollowUpMutation.mutate({
                            noteId: item.note_id,
                            body: { snooze_to: addDaysYmd(dueDate, 1) },
                          })
                        }
                        sx={{ textTransform: "none", fontWeight: 700, minHeight: 34 }}
                      >
                        {t("phoneAssistant.followUps.snoozeOneDay")}
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        disableElevation
                        disabled={updateFollowUpMutation.isPending}
                        startIcon={<CheckOutlinedIcon fontSize="small" />}
                        onClick={() =>
                          updateFollowUpMutation.mutate({
                            noteId: item.note_id,
                            body: { done: true },
                          })
                        }
                        sx={{ textTransform: "none", fontWeight: 700, minHeight: 34 }}
                      >
                        {t("phoneAssistant.followUps.markDone")}
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
