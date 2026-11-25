import React, { useRef, useState } from "react";
import { Box, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import GavelIcon from "@mui/icons-material/Gavel";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/useAuthStore";
import { fetchCallRecordingUrl } from "../api/collectionsApi";
import { useSetCallDisputeHold } from "../hooks/useCollections";

interface RecordingPlayerProps {
  callId: number;
  recordingId?: number | null;
  durationSeconds?: number | null;
  disputeHold?: boolean;
  showNoRecordingLabel?: boolean;
}

const SPEEDS = [1, 1.5, 2] as const;

function formatDuration(sec?: number | null): string {
  if (!sec || sec <= 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Audio player for call recordings.
 * Strictly hidden unless the user holds the `calls:listen` permission:
 * cashiers without `calls:listen` see zero sign that a recording exists.
 */
export const RecordingPlayer: React.FC<RecordingPlayerProps> = ({
  callId,
  recordingId,
  durationSeconds,
  disputeHold = false,
  showNoRecordingLabel = true,
}) => {
  const { t } = useTranslation();
  const canListen = useAuthStore((s) => s.hasPermission("calls:listen"));
  const disputeMutation = useSetCallDisputeHold();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(0);

  if (!canListen) return null;

  if (!recordingId) {
    if (!showNoRecordingLabel) return null;
    return (
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.72rem" }}>
        {t("collections.recording.noRecording", "No recording")}
      </Typography>
    );
  }

  const togglePlay = async () => {
    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }

    let url = audioUrl;
    if (!url) {
      setLoading(true);
      try {
        const res = await fetchCallRecordingUrl(callId);
        url = res.url;
        setAudioUrl(url);
      } finally {
        setLoading(false);
      }
    }

    if (url && audioRef.current) {
      if (audioRef.current.src !== url) {
        audioRef.current.src = url;
      }
      audioRef.current.playbackRate = SPEEDS[speedIdx];
      await audioRef.current.play().catch(() => {});
      setPlaying(true);
    }
  };

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = SPEEDS[next];
    }
  };

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1,
        py: 0.35,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "action.hover",
      }}
    >
      <audio
        ref={audioRef}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
      />
      <IconButton
        size="small"
        disabled={loading}
        onClick={togglePlay}
        aria-label={playing ? t("collections.recording.pause", "Pause recording") : t("collections.recording.play", "Play recording")}
        sx={{ width: 28, height: 28 }}
      >
        {playing ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
      </IconButton>
      <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
        {formatDuration(durationSeconds)}
      </Typography>
      <Chip
        size="small"
        clickable
        label={`${SPEEDS[speedIdx]}×`}
        onClick={cycleSpeed}
        sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
      />
      <Tooltip
        title={
          disputeHold
            ? t("collections.recording.disputeHoldOn", "Dispute hold active (kept until removed)")
            : t("collections.recording.disputeHoldOff", "Mark dispute hold to keep recording")
        }
      >
        <Chip
          size="small"
          clickable
          icon={<GavelIcon sx={{ fontSize: "13px !important" }} />}
          label={disputeHold ? t("collections.recording.held", "Dispute hold") : t("collections.recording.hold", "Hold")}
          color={disputeHold ? "warning" : "default"}
          variant={disputeHold ? "filled" : "outlined"}
          onClick={() => disputeMutation.mutate({ callId, disputeHold: !disputeHold })}
          sx={{ height: 20, fontSize: "0.66rem", fontWeight: 700 }}
        />
      </Tooltip>
    </Box>
  );
};
