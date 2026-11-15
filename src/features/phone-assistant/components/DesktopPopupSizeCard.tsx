import { useState } from "react";
import { Box, MenuItem, Paper, Select, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { POPUP_SIZE_KEY, readPopupSizeOverride, type PopupSize } from "./IncomingCallToast";

/** Per-user override of the desktop incoming-call popup size (the shop sets the default). */
export function DesktopPopupSizeCard() {
  const { t } = useTranslation();
  const [value, setValue] = useState<PopupSize | "shop">(readPopupSizeOverride() ?? "shop");
  const change = (next: PopupSize | "shop") => {
    setValue(next);
    try {
      if (next === "shop") window.localStorage.removeItem(POPUP_SIZE_KEY);
      else window.localStorage.setItem(POPUP_SIZE_KEY, next);
    } catch {
      // Private mode: the choice lasts until the page reloads
    }
  };
  return (
    <Paper elevation={0} sx={{ p: 2.5, border: 1, borderColor: "divider", borderRadius: 2.5, bgcolor: "background.paper" }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
        <Box>
          <Typography sx={{ fontWeight: 800 }}>{t("phoneAssistant.settings.popupSizeMine")}</Typography>
          <Typography variant="body2" color="text.secondary">{t("phoneAssistant.settings.popupSizeMineHint")}</Typography>
        </Box>
        <Select
          size="small"
          value={value}
          onChange={(e) => change(e.target.value as PopupSize | "shop")}
          slotProps={{ input: { "aria-label": t("phoneAssistant.settings.popupSizeMine") } as any }}
          sx={{ minWidth: 190 }}
        >
          <MenuItem value="shop">{t("phoneAssistant.settings.popupShopDefault")}</MenuItem>
          {(["compact", "standard", "large"] as const).map((s) => (
            <MenuItem key={s} value={s}>{t(`phoneAssistant.settings.popup_${s}`)}</MenuItem>
          ))}
        </Select>
      </Box>
    </Paper>
  );
}
