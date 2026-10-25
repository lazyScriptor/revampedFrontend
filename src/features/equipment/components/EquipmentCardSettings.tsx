import { useState } from "react";
import type { ElementType } from "react";
import { Box, Button, IconButton, Popover, Switch, Typography, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

import {
  CARD_FIELDS,
  CARD_GROUP_LABEL_KEYS,
  type CardConfig,
  type CardFieldGroup,
  type CardFieldKey,
} from "../lib/equipmentCardFields";

interface EquipmentCardSettingsProps {
  config: CardConfig;
  onToggle: (key: CardFieldKey) => void;
  onReset: () => void;
}

const GROUPS: CardFieldGroup[] = ["identity", "pricing", "stock", "other"];

// "Card details": the card view's counterpart of the table's Columns menu.
export function EquipmentCardSettings({ config, onToggle, onReset }: EquipmentCardSettingsProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const shown = CARD_FIELDS.filter((f) => config[f.key]).length;

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        color="inherit"
        startIcon={<TuneRoundedIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label={t("equipment.cards.details")}
        sx={{
          textTransform: "none",
          fontWeight: 700,
          borderRadius: 2,
          height: 32,
          borderColor: (theme.palette as any).border?.subtle || theme.palette.divider,
          color: "text.secondary",
          whiteSpace: "nowrap",
        }}
      >
        {t("equipment.cards.details")}
        <Box
          component="span"
          sx={{ ml: 0.75, px: 0.75, borderRadius: 2, bgcolor: "action.selected", fontSize: "0.7rem", fontVariantNumeric: "tabular-nums" }}
        >
          {shown}
        </Box>
      </Button>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 320, maxWidth: "calc(100vw - 24px)", maxHeight: "70vh", borderRadius: 3 } } }}
      >
        <Box sx={{ display: "flex", alignItems: "center", px: 2, py: 1.25 }}>
          <Typography sx={{ fontWeight: 800, flexGrow: 1 }}>{t("equipment.cards.details")}</Typography>
          <IconButton size="small" onClick={onReset} aria-label={t("equipment.cards.reset")} title={t("equipment.cards.reset")}>
            <RestartAltIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ px: 2, pb: 1.5 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {t("equipment.cards.alwaysShown")}
          </Typography>
          {GROUPS.map((g) => (
            <Box key={g} sx={{ mt: 1.25 }}>
              <Typography sx={{ fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "text.disabled" }}>
                {t(CARD_GROUP_LABEL_KEYS[g])}
              </Typography>
              {CARD_FIELDS.filter((f) => f.group === g).map((f) => {
                const Icon = f.icon as ElementType;
                return (
                  <Box key={f.key} sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 0.25 }}>
                    <Icon sx={{ fontSize: 20, color: config[f.key] ? "primary.main" : "text.disabled" }} />
                    <Typography sx={{ flexGrow: 1, fontSize: "0.85rem", fontWeight: 600 }}>{t(f.labelKey)}</Typography>
                    <Switch
                      size="small"
                      checked={config[f.key]}
                      onChange={() => onToggle(f.key)}
                      slotProps={{ input: { "aria-label": t(f.labelKey) } }}
                    />
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      </Popover>
    </>
  );
}
