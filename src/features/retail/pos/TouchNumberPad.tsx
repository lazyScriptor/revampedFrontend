import { Box, Button } from "@mui/material";
import BackspaceOutlinedIcon from "@mui/icons-material/BackspaceOutlined";

interface Props {
  value: string;
  onChange: (next: string) => void;
  allowDecimal?: boolean;
}

const KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "back"] as const;

/** Compact 3x4 touch keypad shared across price, unlisted item, sundry and qty overlays. */
export function TouchNumberPad({ value, onChange, allowDecimal = true }: Props) {
  const press = (k: (typeof KEYS)[number]) => {
    if (k === "back") {
      onChange(value.slice(0, -1));
      return;
    }
    if (k === ".") {
      if (!allowDecimal || value.includes(".")) return;
      onChange(value === "" ? "0." : `${value}.`);
      return;
    }
    onChange(value === "0" ? k : `${value}${k}`);
  };

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 0.75,
        mt: 1,
      }}
    >
      {KEYS.map((k) => {
        const disabled = k === "." && !allowDecimal;
        return (
          <Button
            key={k}
            variant="outlined"
            color="inherit"
            disabled={disabled}
            onClick={() => press(k)}
            aria-label={k === "back" ? "Backspace" : k}
            sx={{
              minHeight: 42,
              fontWeight: 800,
              fontSize: "1rem",
              fontVariantNumeric: "tabular-nums",
              borderColor: "divider",
            }}
          >
            {k === "back" ? <BackspaceOutlinedIcon fontSize="small" /> : k}
          </Button>
        );
      })}
    </Box>
  );
}
