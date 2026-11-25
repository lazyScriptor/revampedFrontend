import { Box, Button, Chip, useTheme } from "@mui/material";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import { useTranslation } from "react-i18next";

export type SettlementStep = 1 | 2 | 3 | 4 | 5;

interface SettlementStepBarProps {
  activeStep: SettlementStep;
  onSelectStep: (step: SettlementStep) => void;
  hasCustomer: boolean;
  onSkipStep?: (step: 3 | 4) => void;
  isUpdating?: boolean;
}

export function SettlementStepBar({
  activeStep,
  onSelectStep,
  hasCustomer,
  onSkipStep,
  isUpdating = false,
}: SettlementStepBarProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const steps: Array<{ num: SettlementStep; label: string; skippable?: boolean }> = [
    { num: 1, label: t("settlement.steps.customer", "Customer") },
    { num: 2, label: t("settlement.steps.bills", "Bills") },
    { num: 3, label: t("settlement.steps.machinesBack", "Machines back"), skippable: true },
    { num: 4, label: t("settlement.steps.payment", "Payment"), skippable: true },
    { num: 5, label: t("settlement.steps.checkAndSave", "Check & save") },
  ];

  return (
    <Box
      data-testid="settlement-step-bar"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        px: { xs: 1, sm: 1.5 },
        py: 1,
        borderRadius: 2.5,
        bgcolor: isDark ? "#0f172a" : "#ffffff",
        border: "1px solid",
        borderColor: "divider",
        flexShrink: 0,
        overflowX: "auto",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "nowrap", minWidth: "max-content" }}>
        {steps.map((step, idx) => {
          const isActive = activeStep === step.num;
          const isCompleted = hasCustomer && step.num < activeStep;
          const disabled = step.num > 1 && !hasCustomer;

          return (
            <Box key={step.num} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Button
                size="small"
                data-testid={`settlement-step-${step.num}`}
                disabled={disabled}
                onClick={() => onSelectStep(step.num)}
                aria-current={isActive ? "step" : undefined}
                sx={{
                  minHeight: 36,
                  px: { xs: 1, sm: 1.5 },
                  py: 0.5,
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: isActive ? 800 : 600,
                  fontSize: "0.78rem",
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                  bgcolor: isActive
                    ? "#f59e0b"
                    : isCompleted
                      ? isDark
                        ? "rgba(16, 185, 129, 0.16)"
                        : "#ecfdf5"
                      : isDark
                        ? "#1e293b"
                        : "#f8fafc",
                  color: isActive
                    ? "#0f172a"
                    : isCompleted
                      ? isDark
                        ? "#34d399"
                        : "#047857"
                      : isDark
                        ? "#e2e8f0"
                        : "#0f172a",
                  border: "1px solid",
                  borderColor: isActive
                    ? "#d97706"
                    : isCompleted
                      ? isDark
                        ? "rgba(16, 185, 129, 0.35)"
                        : "#a7f3d0"
                      : isDark
                        ? "#334155"
                        : "#e2e8f0",
                  "&:hover": {
                    bgcolor: isActive
                      ? "#d97706"
                      : isDark
                        ? "#334155"
                        : "#f1f5f9",
                  },
                }}
              >
                <Box
                  component="span"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    mr: 0.75,
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    bgcolor: isActive
                      ? "#0f172a"
                      : isCompleted
                        ? "#10b981"
                        : isDark
                          ? "#334155"
                          : "#e2e8f0",
                    color: isActive || isCompleted ? "#ffffff" : isDark ? "#f8fafc" : "#0f172a",
                  }}
                >
                  {isCompleted ? <CheckCircleOutlinedIcon sx={{ fontSize: 13 }} /> : step.num}
                </Box>
                {step.label}
              </Button>

              {idx < steps.length - 1 && (
                <ArrowForwardIcon sx={{ fontSize: 14, color: "text.disabled", flexShrink: 0 }} />
              )}
            </Box>
          );
        })}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
        {isUpdating && (
          <Chip
            size="small"
            label={t("settlement.updating", "updating…")}
            sx={{
              height: 24,
              fontSize: "0.7rem",
              fontWeight: 700,
              bgcolor: isDark ? "rgba(245, 158, 11, 0.16)" : "#fffbeb",
              color: isDark ? "#fbbf24" : "#b45309",
            }}
          />
        )}
        {(activeStep === 3 || activeStep === 4) && onSkipStep && (
          <Button
            size="small"
            variant="text"
            endIcon={<SkipNextIcon fontSize="small" />}
            onClick={() => onSkipStep(activeStep)}
            sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.75rem", whiteSpace: "nowrap" }}
          >
            {t("settlement.skipStep", "Skip")}
          </Button>
        )}
      </Box>
    </Box>
  );
}
