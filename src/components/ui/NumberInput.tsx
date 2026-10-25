import { useEffect, useState } from "react";
import { TextField, TextFieldProps } from "@mui/material";

type Props = Omit<TextFieldProps, "value" | "onChange" | "type" | "defaultValue"> & {
  value: number | "";
  onChange: (value: number | "") => void;
  min?: number;
  max?: number;
  /** allow a decimal point (money). Default: whole numbers only */
  decimals?: boolean;
  /** when the field is left empty, turn it into 0 (quantities) instead of keeping it empty (optional amounts) */
  emptyAsZeroOnBlur?: boolean;
};

/**
 * A number field you can actually type into: it can be emptied and retyped freely, values are clamped to
 * [min, max] as you type, and it selects its content on focus so typing replaces the old value.
 */
export function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  decimals = false,
  emptyAsZeroOnBlur = false,
  onBlur,
  onFocus,
  slotProps,
  ...rest
}: Props) {
  const [text, setText] = useState(value === "" ? "" : String(value));

  // follow outside changes (e.g. a "All" button) without fighting the user's own typing
  useEffect(() => {
    const current = text === "" || text === "." ? "" : Number(text);
    if (current !== value) setText(value === "" ? "" : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const htmlInput = ((slotProps as any)?.htmlInput ?? {}) as Record<string, unknown>;

  return (
    <TextField
      {...rest}
      value={text}
      onFocus={(e) => {
        e.target.select();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        if (text === "" && emptyAsZeroOnBlur) {
          setText(String(min));
          onChange(min);
        } else if (text.endsWith(".")) {
          setText(text.slice(0, -1));
        }
        onBlur?.(e);
      }}
      onChange={(e) => {
        const next = e.target.value;
        if (!(decimals ? /^\d*\.?\d*$/ : /^\d*$/).test(next)) return;
        if (next === "" || next === ".") {
          setText(next);
          onChange("");
          return;
        }
        let n = Number(next);
        let shown = next;
        if (max !== undefined && n > max) {
          n = max;
          shown = String(max);
        } else if (n < min) {
          n = min;
          shown = String(min);
        }
        setText(shown);
        onChange(n);
      }}
      slotProps={{
        ...(slotProps as any),
        htmlInput: { ...htmlInput, inputMode: decimals ? "decimal" : "numeric", autoComplete: "off" },
      }}
    />
  );
}
