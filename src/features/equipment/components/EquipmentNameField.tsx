import type { ClipboardEventHandler } from "react";
import { Autocomplete, Box, TextField, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";

import { useDebounce } from "@/features/invoices/hooks/usePosSearch";
import { fetchEquipment } from "../api/equipment.api";
import type { Equipment } from "../schemas/equipment.schema";

interface Props {
  text: string;
  onTextChange: (text: string) => void;
  /** A machine was chosen from the list: the new machine follows it. */
  onPick: (machine: Equipment) => void;
  label?: string;
  ariaLabel?: string;
  error?: boolean;
  helperText?: string;
  onPaste?: ClipboardEventHandler;
}

/** Type "battery drill": the matching machines drop down, newest first. */
export function EquipmentNameField({ text, onTextChange, onPick, label, ariaLabel, error, helperText, onPaste }: Props) {
  const search = useDebounce(text.trim(), 200);
  const { data } = useQuery({
    queryKey: ["equipment-name-options", search],
    queryFn: () => fetchEquipment(1, 30, { search }),
    enabled: search.length >= 2,
    staleTime: 30 * 1000,
  });
  const options = search.length >= 2 ? (data?.equipment ?? []) : [];

  return (
    <Autocomplete<Equipment, false, false, true>
      freeSolo
      size="small"
      fullWidth
      options={options}
      value={null}
      inputValue={text}
      blurOnSelect
      filterOptions={(all) => all}
      onInputChange={(_, v, reason) => {
        if (reason === "input" || reason === "clear") onTextChange(v);
      }}
      onChange={(_, option) => {
        if (option && typeof option !== "string") onPick(option);
      }}
      getOptionLabel={(o) => (typeof o === "string" ? o : o.equipment_name)}
      getOptionKey={(o) => (typeof o === "string" ? o : o.equipment_id)}
      renderOption={({ key, ...props }, o) => (
        <li key={key} {...props}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {o.equipment_name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {[o.equipment_name_si, o.serial_number].filter(Boolean).join(" · ")}
            </Typography>
          </Box>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={error}
          helperText={helperText}
          onPaste={onPaste}
          slotProps={{ ...params.slotProps, htmlInput: { ...params.slotProps.htmlInput, "aria-label": ariaLabel } }}
        />
      )}
    />
  );
}
