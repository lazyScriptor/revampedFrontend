import { Box, Chip } from "@mui/material";
import { useTranslation } from "react-i18next";
import { METHOD_LABELS, PAYMENT_METHODS, type PaymentMethod } from "../lib/paymentMethods";

interface Props {
  value: string;
  onChange: (method: PaymentMethod) => void;
  /** "dark" for the POS checkout panel, "light" everywhere else. */
  tone?: "light" | "dark";
  label?: string;
}

/** One tap to say how the money was paid. */
export function PaymentMethodChips({ value, onChange, tone = "light", label }: Props) {
  const { t } = useTranslation();
  const dark = tone === "dark";
  return (
    <Box role="radiogroup" aria-label={label} sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
      {PAYMENT_METHODS.map((m) => {
        const selected = value === m;
        return (
          <Chip
            key={m}
            role="radio"
            aria-checked={selected}
            size="small"
            clickable
            label={t(METHOD_LABELS[m])}
            onClick={() => onChange(m)}
            color={selected ? "primary" : "default"}
            variant={selected ? "filled" : "outlined"}
            sx={{
              fontWeight: 700,
              ...(dark && !selected ? { color: "#cbd5e1", borderColor: "#475569" } : {}),
            }}
          />
        );
      })}
    </Box>
  );
}
