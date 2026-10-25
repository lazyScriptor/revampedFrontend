import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useDeleteEquipment } from "../hooks/useEquipmentHooks";

interface EquipmentDeleteDialogProps {
  /** equipment_id to delete; null keeps the dialog closed */
  equipmentId: number | null;
  onClose: () => void;
}

// Shared by the table and the card view so both confirm deletes the same way.
export function EquipmentDeleteDialog({ equipmentId, onClose }: EquipmentDeleteDialogProps) {
  const { t } = useTranslation();
  const deleteMutation = useDeleteEquipment();

  const confirm = () => {
    if (equipmentId) {
      deleteMutation.mutate(equipmentId);
      onClose();
    }
  };

  return (
    <Dialog open={!!equipmentId} onClose={onClose}>
      <DialogTitle className="font-bold text-slate-800">{t("equipment.EquipmentTable.confirmDeletion")}</DialogTitle>
      <DialogContent>{t("equipment.EquipmentTable.areYouSureYouWant")}</DialogContent>
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={onClose} color="inherit">
          {t("common.cancel")}
        </Button>
        <Button onClick={confirm} color="error" variant="contained" disabled={deleteMutation.isPending} disableElevation>
          {deleteMutation.isPending ? t("customers.CustomerTable.deleting") : t("common.delete")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
