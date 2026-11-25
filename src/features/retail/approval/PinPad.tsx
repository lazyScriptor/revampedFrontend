import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { Box, Button, IconButton } from "@mui/material";
import BackspaceOutlinedIcon from "@mui/icons-material/BackspaceOutlined";
import { useTranslation } from "react-i18next";

export const PIN_MIN = 4;
export const PIN_MAX = 6;

interface PinPadProps {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Shown above the pad, e.g. the approver's name. */
  label?: string;
}

/**
 * Big-button PIN entry (4-6 digits). The digit buttons never take focus, so Enter (confirm) and the
 * physical keyboard keep working on the pad itself after tapping.
 */
export function PinPad({ value, onChange, disabled, autoFocus, label }: PinPadProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement | null>(null);

  const add = (d: string) => {
    if (disabled || value.length >= PIN_MAX) return;
    onChange(value + d);
  };
  const back = () => {
    if (disabled) return;
    onChange(value.slice(0, -1));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      add(e.key);
    } else if (e.key === "Backspace") {
      e.preventDefault();
      back();
    }
  };

  const keep = (e: { preventDefault: () => void }) => e.preventDefault(); // don't steal focus from the pad

  return (
    <Box
      ref={ref}
      tabIndex={0}
      role="group"
      aria-label={label ?? t("approval.pin")}
      autoFocus={autoFocus}
      onKeyDown={onKeyDown}
      sx={{ outline: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}
    >
      <Box aria-live="polite" sx={{ display: "flex", gap: 1.25, height: 24, alignItems: "center" }} data-testid="pin-dots">
        {Array.from({ length: Math.max(PIN_MIN, value.length) }).map((_, i) => (
          <Box
            key={i}
            sx={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              border: 2,
              borderColor: i < value.length ? "primary.main" : "divider",
              bgcolor: i < value.length ? "primary.main" : "transparent",
            }}
          />
        ))}
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 72px)", gap: 1 }}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <Button
            key={d}
            variant="outlined"
            tabIndex={-1}
            disabled={disabled}
            onMouseDown={keep}
            onClick={() => add(d)}
            sx={{ height: 56, fontSize: "1.35rem", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
          >
            {d}
          </Button>
        ))}
        <Box />
        <Button
          variant="outlined"
          tabIndex={-1}
          disabled={disabled}
          onMouseDown={keep}
          onClick={() => add("0")}
          sx={{ height: 56, fontSize: "1.35rem", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
        >
          0
        </Button>
        <IconButton
          tabIndex={-1}
          disabled={disabled || value.length === 0}
          onMouseDown={keep}
          onClick={back}
          aria-label={t("approval.backspace")}
          sx={{ height: 56, borderRadius: 1 }}
        >
          <BackspaceOutlinedIcon />
        </IconButton>
      </Box>
    </Box>
  );
}
