import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CallOutlinedIcon from "@mui/icons-material/CallOutlined";
import CallMadeIcon from "@mui/icons-material/CallMade";
import CallMissedIcon from "@mui/icons-material/CallMissed";
import CallReceivedIcon from "@mui/icons-material/CallReceived";
import NoteAddOutlinedIcon from "@mui/icons-material/NoteAddOutlined";
import { useTranslation } from "react-i18next";
import {
  useCallList,
  useCreateCallNote,
} from "@/features/phone-assistant/hooks/useCalls";
import type { CallListItem } from "@/features/phone-assistant/api/phoneAssistantApi";

const QUICK_CALL_TAGS = [
  "Booking",
  "Payment promise",
  "Extension",
  "Complaint",
  "Price enquiry",
  "Wrong number",
] as const;

function directionChipColor(direction: CallListItem["direction"]) {
  if (direction === "MISSED") {
    return { bg: "#fee2e2", fg: "#b91c1c", border: "#fca5a5" };
  }
  if (direction === "OUTGOING") {
    return { bg: "#e0f2fe", fg: "#0369a1", border: "#7dd3fc" };
  }
  return { bg: "#dcfce7", fg: "#15803d", border: "#86efac" };
}

function directionIcon(direction: CallListItem["direction"]) {
  if (direction === "MISSED") return <CallMissedIcon sx={{ fontSize: 15 }} />;
  if (direction === "OUTGOING") return <CallMadeIcon sx={{ fontSize: 15 }} />;
  return <CallReceivedIcon sx={{ fontSize: 15 }} />;
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${String(secs).padStart(2, "0")}s` : `${secs}s`;
}

export function CustomerCallsTab({ customerId }: { customerId: number }) {
  const { t } = useTranslation();
  const callsQuery = useCallList({ customer_id: customerId, page: 1, limit: 50 });
  const createNote = useCreateCallNote();

  const [composingCallId, setComposingCallId] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [noteText, setNoteText] = useState("");
  const [followUpOn, setFollowUpOn] = useState("");

  const resetComposer = () => {
    setComposingCallId(null);
    setSelectedTags([]);
    setNoteText("");
    setFollowUpOn("");
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
    );
  };

  const handleSaveNote = async (callId: number) => {
    await createNote.mutateAsync({
      callId,
      body: {
        tags: selectedTags,
        note: noteText.trim() ? noteText.trim() : null,
        follow_up_on: followUpOn.trim() ? followUpOn.trim() : null,
      },
    });
    resetComposer();
  };

  if (callsQuery.isLoading) {
    return (
      <Box sx={{ py: 5, display: "flex", justifyContent: "center" }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (callsQuery.isError) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        {t("phoneAssistant.callsTab.loadFailed")}
      </Alert>
    );
  }

  const calls = callsQuery.data?.calls ?? [];

  if (calls.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 4,
          textAlign: "center",
          borderRadius: 2.5,
          border: "1px dashed #cbd5e1",
          bgcolor: "#ffffff",
        }}
      >
        <CallOutlinedIcon sx={{ fontSize: 34, color: "#94a3b8", mb: 1 }} />
        <Typography sx={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
          {t("phoneAssistant.callsTab.emptyTitle")}
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: "#475569", mt: 0.5 }}>
          {t("phoneAssistant.callsTab.emptyHint")}
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={1.75}>
      {calls.map((call) => {
        const palette = directionChipColor(call.direction);
        const notes = call.notes ?? [];
        const isComposing = composingCallId === call.call_id;

        return (
          <Paper
            key={call.call_id}
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.75 }}>
                <Chip
                  size="small"
                  icon={directionIcon(call.direction)}
                  label={t(`phoneAssistant.callsTab.directions.${call.direction}`)}
                  sx={{
                    bgcolor: palette.bg,
                    color: palette.fg,
                    border: `1px solid ${palette.border}`,
                    fontWeight: 700,
                    fontSize: "0.72rem",
                    "& .MuiChip-icon": { color: palette.fg },
                  }}
                />
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: 13.5,
                    color: "#0f172a",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {call.raw_number || call.phone_e164 || "—"}
                </Typography>
                {call.device_label && (
                  <Typography sx={{ fontSize: 12, color: "#475569" }}>
                    · {call.device_label}
                  </Typography>
                )}
                {call.sim_label && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={call.sim_label}
                    sx={{ height: 20, fontSize: "0.7rem", color: "#475569", borderColor: "#cbd5e1" }}
                  />
                )}
              </Stack>

              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Typography
                  sx={{
                    fontSize: 12,
                    color: "#475569",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {new Date(call.started_at).toLocaleString()} · {formatDuration(call.duration_seconds)}
                </Typography>
                {!isComposing && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<NoteAddOutlinedIcon fontSize="small" />}
                    onClick={() => {
                      setComposingCallId(call.call_id);
                      setSelectedTags([]);
                      setNoteText("");
                      setFollowUpOn("");
                    }}
                    sx={{ textTransform: "none", fontWeight: 700, minHeight: 32 }}
                  >
                    {t("phoneAssistant.callsTab.addNote")}
                  </Button>
                )}
              </Stack>
            </Stack>

            {notes.length > 0 && (
              <Stack spacing={1} sx={{ mt: 1.5, pt: 1.25, borderTop: "1px solid #f1f5f9" }}>
                {notes.map((n) => (
                  <Box
                    key={n.note_id}
                    sx={{
                      p: 1.25,
                      borderRadius: 1.5,
                      bgcolor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.5, mb: n.note ? 0.75 : 0 }}>
                      {n.tags.map((tag) => (
                        <Chip
                          key={tag}
                          size="small"
                          label={tag}
                          sx={{
                            height: 22,
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            bgcolor: "#e0f2fe",
                            color: "#0369a1",
                          }}
                        />
                      ))}
                      {n.follow_up_on && (
                        <Chip
                          size="small"
                          label={t("phoneAssistant.callsTab.followUpBadge", {
                            date: n.follow_up_on,
                          })}
                          sx={{
                            height: 22,
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            fontVariantNumeric: "tabular-nums",
                            bgcolor: n.follow_up_done_at ? "#dcfce7" : "#fef3c7",
                            color: n.follow_up_done_at ? "#15803d" : "#b45309",
                          }}
                        />
                      )}
                    </Stack>
                    {n.note && (
                      <Typography sx={{ fontSize: 13, color: "#0f172a" }}>{n.note}</Typography>
                    )}
                    <Typography
                      sx={{
                        fontSize: 11.5,
                        color: "#64748b",
                        mt: 0.5,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {n.author_name || "Staff"} · {new Date(n.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}

            {isComposing && (
              <Box
                sx={{
                  mt: 1.5,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "#f8fafc",
                  border: "1px solid #cbd5e1",
                }}
              >
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#334155", mb: 0.75 }}>
                  {t("phoneAssistant.callsTab.quickTagsLabel")}
                </Typography>
                <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75, mb: 1.25 }}>
                  {QUICK_CALL_TAGS.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <Chip
                        key={tag}
                        size="small"
                        clickable
                        label={tag}
                        onClick={() => toggleTag(tag)}
                        sx={{
                          fontWeight: 700,
                          bgcolor: active ? "#0284c7" : "#ffffff",
                          color: active ? "#ffffff" : "#0f172a",
                          border: `1px solid ${active ? "#0284c7" : "#cbd5e1"}`,
                        }}
                      />
                    );
                  })}
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mb: 1.25 }}>
                  <TextField
                    size="small"
                    fullWidth
                    label={t("phoneAssistant.callsTab.noteLabel")}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    slotProps={{
                      input: { sx: { bgcolor: "#ffffff", color: "#0f172a" } },
                    }}
                  />
                  <TextField
                    size="small"
                    type="date"
                    label={t("phoneAssistant.callsTab.followUpDateLabel")}
                    value={followUpOn}
                    onChange={(e) => setFollowUpOn(e.target.value)}
                    slotProps={{
                      inputLabel: { shrink: true },
                      input: { sx: { bgcolor: "#ffffff", color: "#0f172a" } },
                      htmlInput: { style: { fontVariantNumeric: "tabular-nums" } },
                    }}
                    sx={{ minWidth: { sm: 185 } }}
                  />
                </Stack>

                <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                  <Button
                    size="small"
                    onClick={resetComposer}
                    disabled={createNote.isPending}
                    sx={{ textTransform: "none" }}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    disableElevation
                    disabled={
                      createNote.isPending ||
                      (selectedTags.length === 0 && !noteText.trim() && !followUpOn.trim())
                    }
                    onClick={() => handleSaveNote(call.call_id)}
                    sx={{ textTransform: "none", fontWeight: 700 }}
                  >
                    {t("phoneAssistant.callsTab.saveNote")}
                  </Button>
                </Stack>
              </Box>
            )}
          </Paper>
        );
      })}
    </Stack>
  );
}
