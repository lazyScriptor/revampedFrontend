import { useEffect, useState } from "react";
import { TextField, TextFieldProps } from "@mui/material";
import { Control, FieldValues, Path, useController } from "react-hook-form";

type Props<T extends FieldValues> = Omit<TextFieldProps, "name" | "value" | "onChange" | "type" | "defaultValue"> & {
  control: Control<T>;
  name: Path<T>;
};

/**
 * Numeric input that can be cleared and retyped freely (a plain type="number" +
 * valueAsNumber field snaps back when emptied). Keeps the raw text locally and
 * pushes a number (or undefined when empty) into react-hook-form.
 */
export function NumberField<T extends FieldValues>({ control, name, slotProps, onFocus, ...rest }: Props<T>) {
  const { field } = useController({ control, name });
  const htmlInput = ((slotProps as any)?.htmlInput ?? {}) as Record<string, unknown>;
  const decimals = String(htmlInput.step ?? "").includes(".");

  const toText = (v: unknown) => (v === undefined || v === null || Number.isNaN(v) ? "" : String(v));
  const [text, setText] = useState(toText(field.value));

  // Re-sync when the form is reset/edited from outside, but never fight the user's typing.
  useEffect(() => {
    const current = text === "" || text === "." ? undefined : Number(text);
    const incoming = field.value === null || Number.isNaN(field.value) ? undefined : field.value;
    if (current !== incoming) setText(toText(field.value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.value]);

  return (
    <TextField
      {...rest}
      name={field.name}
      inputRef={field.ref}
      value={text}
      onBlur={field.onBlur}
      onFocus={(e) => {
        e.target.select();
        onFocus?.(e);
      }}
      onChange={(e) => {
        const next = e.target.value;
        if (!(decimals ? /^\d*\.?\d*$/ : /^\d*$/).test(next)) return;
        setText(next);
        field.onChange(next === "" || next === "." ? undefined : Number(next));
      }}
      slotProps={{
        ...(slotProps as any),
        htmlInput: { ...htmlInput, inputMode: decimals ? "decimal" : "numeric" },
      }}
    />
  );
}
