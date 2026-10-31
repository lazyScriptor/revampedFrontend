import { useEffect, useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from "@mui/material";
import { useTranslation } from "react-i18next";

import { NumberInput } from "@/components/ui/NumberInput";
import { useToast } from "@/components/ui/AppToast";
import { tk } from "@/i18n/marker";
import { useRecordLockerExpense } from "../hooks/useLocker";
import { money } from "../lib/locker";

// Same categories as the Accounting expense screen (the backend validates the list).
const CATEGORIES = [
  { value: "Operational", label: tk("accounting.ExpensesTab.operational") },
  { value: "Fuel & Transport", label: tk("accounting.ExpensesTab.fuelTransport") },
  { value: "Repair", label: tk("accounting.ExpensesTab.repair") },
  { value: "Utilities", label: tk("accounting.ExpensesTab.utilities") },
  { value: "Salaries", label: tk("accounting.ExpensesTab.salaries") },
  { value: "Other", label: tk("common.other") },
];

/** Cash paid out of the drawer: saved as a normal expense that the locker subtracts. */
export function LockerExpenseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const expense = useRecordLockerExpense();
  const [amount, setAmount] = useState<number | "">("");
  const [category, setCategory] = useState("Operational");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setCategory("Operational");
    setDescription("");
    expense.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = () => {
    if (!amount) return;
    expense.mutate(
      { amount, category, description: description.trim() || undefined },
      {
        onSuccess: () => {
          showSuccess(t("locker.expense.saved", { amount: money(amount) }));
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ fontWeight: 800 }}>{t("locker.expense.title")}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
        <NumberInput
          autoFocus
          value={amount}
          onChange={setAmount}
          decimals
          label={t("common.amount")}
          slotProps={{ htmlInput: { "aria-label": t("common.amount"), inputMode: "decimal", style: { fontVariantNumeric: "tabular-nums", fontWeight: 800 } } }}
        />
        <TextField select size="small" label={t("common.category")} value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <MenuItem key={c.value} value={c.value}>
              {t(c.label)}
            </MenuItem>
          ))}
        </TextField>
        <TextField size="small" label={t("locker.expense.whatFor")} value={description} onChange={(e) => setDescription(e.target.value)} />
        {expense.isError && <Alert severity="error">{(expense.error as any)?.message || t("locker.errors.saveFailed")}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button variant="contained" disableElevation onClick={save} disabled={!amount || expense.isPending} sx={{ fontWeight: 800 }}>
          {t("common.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
