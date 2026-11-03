import { Autocomplete, TextField, createFilterOptions } from "@mui/material";
import { useTranslation } from "react-i18next";

export interface CategoryOption {
  category_id: number;
  category_name: string;
}
type Option = CategoryOption | { newName: string };

const filter = createFilterOptions<Option>({ stringify: (o) => ("newName" in o ? o.newName : o.category_name) });

interface Props {
  text: string;
  onTextChange: (text: string) => void;
  categories: CategoryOption[];
  onPick: (category: CategoryOption) => void;
  /** Without this, new categories can't be added here. */
  onCreate?: (name: string) => void;
  error?: boolean;
  helperText?: string;
  ariaLabel?: string;
}

/** Choose a category, or add a new one. Only sets the category: the machine's name is separate. */
export function EquipmentCategoryField({ text, onTextChange, categories, onPick, onCreate, error, helperText, ariaLabel }: Props) {
  const { t } = useTranslation();

  return (
    <Autocomplete<Option, false, false, true>
      freeSolo
      size="small"
      fullWidth
      options={categories}
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
        const query = text.trim();
        const found = filter(options, { ...state, inputValue: query });
        const exact = categories.some((c) => c.category_name.toLowerCase() === query.toLowerCase());
        return onCreate && query.length >= 2 && !exact ? [...found, { newName: query }] : found;
      }}
      renderOption={({ key, ...props }, o) => (
        <li key={key} {...props}>
          {"newName" in o ? t("equipment.types.addNew", { name: o.newName }) : o.category_name}
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          error={error}
          helperText={helperText}
          slotProps={{ ...params.slotProps, htmlInput: { ...params.slotProps.htmlInput, "aria-label": ariaLabel } }}
        />
      )}
    />
  );
}
