import { useEffect, useSyncExternalStore } from "react";
import { Tooltip, ButtonBase, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import {
  installSinhalaTyping,
  isSinhalaTypingEnabled,
  setSinhalaTyping,
  subscribeSinhalaTyping,
} from "@/lib/singlishInput";

/** Top-bar switch for phonetic Sinhala typing (Singlish). Ctrl+Alt+S toggles it too. */
export function SinhalaTypingToggle() {
  const { t } = useTranslation();
  useEffect(() => installSinhalaTyping(), []);
  const on = useSyncExternalStore(subscribeSinhalaTyping, isSinhalaTypingEnabled, () => false);

  return (
    <Tooltip title={t(on ? "sinhalaTyping.tipOn" : "sinhalaTyping.tipOff")} arrow>
      <ButtonBase
        onClick={() => setSinhalaTyping(!on)}
        aria-pressed={on}
        aria-label={t("sinhalaTyping.label")}
        sx={{
          minWidth: 44,
          height: 32,
          px: 1.25,
          borderRadius: 2,
          border: "1px solid",
          borderColor: on ? "#f59e0b" : "#cbd5e1",
          bgcolor: on ? "#fef3c7" : "transparent",
          "&:focus-visible": { outline: "3px solid #f59e0b88", outlineOffset: 2 },
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: "0.82rem", color: on ? "#92400e" : "#475569" }}>
          {on ? "සිං" : "EN"}
        </Typography>
      </ButtonBase>
    </Tooltip>
  );
}
