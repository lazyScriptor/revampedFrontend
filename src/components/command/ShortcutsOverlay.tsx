import { useEffect, useState } from "react";
import { Box, Button, Chip, List, ListItem, ListItemText, Typography } from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { useTranslation } from "react-i18next";
import { Overlay, registerOverlay } from "@/components/overlay";
import { useUiPreference } from "@/features/preferences/useUiPreference";
import { SHORTCUT_DEFS, comboFromEvent, formatCombo } from "./shortcuts";
import { registerCommand } from "./commandRegistry";

export const SHORTCUTS_OVERLAY_ID = "shortcuts";

/** Lists every shortcut and lets the user press a new key for it (stored per user, with reset). */
function ShortcutsOverlay() {
  const { t } = useTranslation();
  const { value: overrides, set, reset, isDefault } = useUiPreference<Record<string, string>>("shortcuts", {});
  const [capturing, setCapturing] = useState<string | null>(null);

  useEffect(() => {
    if (!capturing) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") return setCapturing(null);
      const combo = comboFromEvent(e);
      if (!combo) return;
      set({ ...overrides, [capturing]: combo });
      setCapturing(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [capturing, overrides, set]);

  return (
    <Overlay
      title={t("shortcuts.title")}
      width={460}
      footer={
        <Button startIcon={<RestartAltIcon />} onClick={reset} disabled={isDefault} sx={{ textTransform: "none", minHeight: 44 }}>
          {t("common.reset")}
        </Button>
      }
    >
      <List dense disablePadding>
        {SHORTCUT_DEFS.map((def) => {
          const combo = overrides[def.id] || def.defaultCombo;
          return (
            <ListItem
              key={def.id}
              disableGutters
              secondaryAction={
                <Button size="small" onClick={() => setCapturing(def.id)} sx={{ textTransform: "none", minWidth: 96, fontVariantNumeric: "tabular-nums" }}>
                  {capturing === def.id ? t("shortcuts.pressKey") : formatCombo(combo)}
                </Button>
              }
            >
              <ListItemText primary={t(def.label)} />
              {def.pending && <Chip size="small" variant="outlined" label={t("shortcuts.soon")} sx={{ mr: 12 }} />}
            </ListItem>
          );
        })}
      </List>
      <Typography variant="caption" color="text.secondary" component={Box} sx={{ mt: 1, display: "block" }}>
        {t("shortcuts.hint")}
      </Typography>
    </Overlay>
  );
}

registerOverlay(SHORTCUTS_OVERLAY_ID, ShortcutsOverlay);

registerCommand({
  id: "shortcuts",
  label: "shortcuts.title",
  keywords: ["keys", "keyboard", "remap"],
  perform: ({ openOverlay }) => openOverlay(SHORTCUTS_OVERLAY_ID),
});
