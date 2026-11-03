import { useEffect } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useToast } from "@/components/ui/AppToast";
import { useDeleteEquipment } from "../hooks/useEquipmentHooks";

interface EquipmentDeleteDialogProps {
  /** equipment_id to delete; null keeps the dialog closed */
  equipmentId: number | null;
  onClose: () => void;
}

// Shared by the table and the card view so both confirm deletes the same way.
export function EquipmentDeleteDialog({ equipmentId, onClose }: EquipmentDeleteDialogProps) {
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const deleteMutation = useDeleteEquipment();

  useEffect(() => {
    if (equipmentId) deleteMutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipmentId]);

  // Stays open until the server answers, so a refusal (e.g. still out on rent) is seen.
  const confirm = () => {
    if (!equipmentId) return;
    deleteMutation.mutate(equipmentId, {
      onSuccess: (res) => {
        showSuccess(res?.archived ? t("equipment.EquipmentTable.archived") : t("equipment.EquipmentTable.deleted"));
        onClose();
      },
    });
  };

  return (
    <Dialog open={!!equipmentId} onClose={onClose}>
      <DialogTitle className="font-bold text-slate-800">{t("equipment.EquipmentTable.confirmDeletion")}</DialogTitle>
      <DialogContent>
        {t("equipment.EquipmentTable.areYouSureYouWant")}
        {deleteMutation.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {(deleteMutation.error as any)?.message || t("equipment.EquipmentTable.deleteFailed")}
          </Alert>
        )}
      </DialogContent>
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
