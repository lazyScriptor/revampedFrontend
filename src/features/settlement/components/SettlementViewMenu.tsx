import { useState } from "react";
import {
  Box,
  Button,
  Divider,
  FormControlLabel,
  Popover,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import { useTranslation } from "react-i18next";
import type {
  OpenBillsFilter,
  QueueRule,
  SettlementViewPreferences,
  SplitRule,
} from "../types";

interface SettlementViewMenuProps {
  prefs: SettlementViewPreferences;
  onUpdate: (patch: Partial<SettlementViewPreferences>) => void;
  onReset: () => void;
}

export function SettlementViewMenu({ prefs, onUpdate, onReset }: SettlementViewMenuProps) {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={<TuneOutlinedIcon fontSize="small" />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-label={t("settlement.viewMenu.button", "View")}
        sx={{
          minHeight: 36,
          textTransform: "none",
          fontWeight: 700,
          borderRadius: 2,
          whiteSpace: "nowrap",
        }}
      >
        {t("settlement.viewMenu.button", "View")}
      </Button>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
              width: { xs: 300, sm: 340 },
              borderRadius: 2.5,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
            },
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {t("settlement.viewMenu.title", "View & defaults")}
          </Typography>
          <Button size="small" onClick={onReset} sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.72rem" }}>
            {t("common.reset", "Reset")}
          </Button>
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>
            {t("settlement.viewMenu.cardSize", "Card size")}
          </Typography>
          <ToggleButtonGroup
            size="small"
            fullWidth
            exclusive
            value={prefs.cardSize}
            onChange={(_, val) => val && onUpdate({ cardSize: val })}
          >
            <ToggleButton value="compact">{t("settlement.viewMenu.compact", "Compact")}</ToggleButton>
            <ToggleButton value="normal">{t("settlement.viewMenu.normal", "Normal")}</ToggleButton>
            <ToggleButton value="detailed">{t("settlement.viewMenu.detailed", "Detailed")}</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Divider />

        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 0.25 }}>
            {t("settlement.viewMenu.showFields", "Show on cards")}
          </Typography>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={prefs.showMachineIcons}
                onChange={(e) => onUpdate({ showMachineIcons: e.target.checked })}
              />
            }
            label={<Typography variant="body2">{t("settlement.viewMenu.machineIcons", "Machine icons")}</Typography>}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={prefs.showPaymentHistory}
                onChange={(e) => onUpdate({ showPaymentHistory: e.target.checked })}
              />
            }
            label={<Typography variant="body2">{t("settlement.viewMenu.paymentHistory", "Payment history")}</Typography>}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={prefs.showDiscount}
                onChange={(e) => onUpdate({ showDiscount: e.target.checked })}
              />
            }
            label={<Typography variant="body2">{t("settlement.viewMenu.discount", "Discount")}</Typography>}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={prefs.showRunningCharge}
                onChange={(e) => onUpdate({ showRunningCharge: e.target.checked })}
              />
            }
            label={<Typography variant="body2">{t("settlement.viewMenu.runningCharge", "Running charge")}</Typography>}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={prefs.showDates}
                onChange={(e) => onUpdate({ showDates: e.target.checked })}
              />
            }
            label={<Typography variant="body2">{t("settlement.viewMenu.dates", "Dates")}</Typography>}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={prefs.groupByMonth}
                onChange={(e) => onUpdate({ groupByMonth: e.target.checked })}
              />
            }
            label={<Typography variant="body2">{t("settlement.viewMenu.groupByMonth", "Group bills by month")}</Typography>}
          />
        </Box>

        <Divider />

        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>
            {t("settlement.viewMenu.defaultSplitRule", "Default return split")}
          </Typography>
          <ToggleButtonGroup
            size="small"
            fullWidth
            exclusive
            value={prefs.defaultSplitRule}
            onChange={(_, val: SplitRule | null) => val && onUpdate({ defaultSplitRule: val })}
          >
            <ToggleButton value="oldest_first">{t("settlement.splitRule.oldestFirst", "Oldest first")}</ToggleButton>
            <ToggleButton value="cheaper_for_customer">{t("settlement.splitRule.cheaper", "Cheaper")}</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>
            {t("settlement.viewMenu.defaultQueueRule", "Default payment queue")}
          </Typography>
          <ToggleButtonGroup
            size="small"
            fullWidth
            exclusive
            value={prefs.defaultQueueRule}
            onChange={(_, val: QueueRule | null) => val && onUpdate({ defaultQueueRule: val })}
          >
            <ToggleButton value="fully_back_first">{t("settlement.queueRule.fullyBack", "Back first")}</ToggleButton>
            <ToggleButton value="biggest_balance">{t("settlement.queueRule.biggest", "Biggest")}</ToggleButton>
            <ToggleButton value="split_evenly">{t("settlement.queueRule.even", "Evenly")}</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>
            {t("settlement.viewMenu.defaultFilter", "Default bill filter")}
          </Typography>
          <ToggleButtonGroup
            size="small"
            fullWidth
            exclusive
            value={prefs.defaultFilter}
            onChange={(_, val: OpenBillsFilter | null) => val && onUpdate({ defaultFilter: val })}
          >
            <ToggleButton value="payment_due">{t("settlement.filters.paymentDue", "Payment due")}</ToggleButton>
            <ToggleButton value="machines_out">{t("settlement.filters.machinesOut", "Machines out")}</ToggleButton>
            <ToggleButton value="all">{t("settlement.filters.all", "All")}</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Popover>
    </>
  );
}
