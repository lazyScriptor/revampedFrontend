import { useMemo } from "react";
import { Autocomplete, TextField, createFilterOptions } from "@mui/material";
import { useTranslation } from "react-i18next";
import { stripNameNumber } from "../lib/equipmentNumbering";

export interface TypeOption {
  category_id: number;
  category_name: string;
}
type Option = TypeOption | { newName: string };

const filter = createFilterOptions<Option>({ stringify: (o) => ("newName" in o ? o.newName : o.category_name) });

interface Props {
  /** What the box shows. */
  text: string;
  onTextChange: (text: string) => void;
  types: TypeOption[];
  onPick: (type: TypeOption) => void;
  /** Without this, new types can't be added here. */
  onCreate?: (name: string) => void;
  label?: string;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
}

/** Type "drill": every matching machine type drops down; picking one fills in the rest. */
export function EquipmentTypeField({ text, onTextChange, types, onPick, onCreate, label, error, helperText, disabled }: Props) {
  const { t } = useTranslation();
  const query = useMemo(() => stripNameNumber(text), [text]);

  return (
    <Autocomplete<Option, false, false, true>
      freeSolo
      size="small"
      fullWidth
      disabled={disabled}
      options={types}
      value={null}
      inputValue={text}
      blurOnSelect
      onInputChange={(_, v, reason) => {
        if (reason === "input" || reason === "clear") onTextChange(v);
      }}
      onChange={(_, option) => {
        if (!option || typeof option === "string") return;
        if ("newName" in option) onCreate?.(option.newName);
        else onPick(option);
      }}
      getOptionLabel={(o) => (typeof o === "string" ? o : "newName" in o ? o.newName : o.category_name)}
      getOptionKey={(o) => (typeof o === "string" ? o : "newName" in o ? "new" : o.category_id)}
      filterOptions={(options, state) => {
        const found = filter(options, { ...state, inputValue: query });
        const exact = types.some((c) => c.category_name.toLowerCase() === query.toLowerCase());
        return onCreate && query.length >= 2 && !exact ? [...found, { newName: query }] : found;
      }}
      renderOption={({ key, ...props }, o) => (
        <li key={key} {...props}>
          {"newName" in o ? t("equipment.types.addNew", { name: o.newName }) : o.category_name}
        </li>
      )}
      renderInput={(params) => <TextField {...params} label={label} error={error} helperText={helperText} />}
    />
  );
}
