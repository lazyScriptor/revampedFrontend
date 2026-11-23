import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useApplyOrganize, useOrganizePreview } from "../hooks/useCategoryHooks";

interface Props {
  open: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** Shows how machine names would be grouped into families and sizes, and applies it on confirm. */
export function CategoryOrganizeDialog({ open, onClose, onDone }: Props) {
  const { t } = useTranslation();
  const { data: groups, isLoading, isError } = useOrganizePreview(open);
  const apply = useApplyOrganize();

  const submit = () =>
    apply.mutate(undefined, {
      onSuccess: (r) => {
        onDone(t("equipment.CategoryOrganize.done", { moved: r.moved, removed: r.removed }));
        onClose();
      },
    });

  return (
    <Dialog open={open} onClose={apply.isPending ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t("equipment.CategoryOrganize.title")}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t("equipment.CategoryOrganize.intro")}
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          {t("equipment.CategoryOrganize.confirmNote")}
        </Alert>
        {isLoading && <CircularProgress size={24} />}
        {isError && <Alert severity="error">{t("common.error")}</Alert>}
        {apply.isError && <Alert severity="error">{(apply.error as Error)?.message}</Alert>}
        {groups && groups.length === 0 && <Typography>{t("equipment.CategoryOrganize.empty")}</Typography>}
        {groups?.map((g) => (
          <Box key={g.family} sx={{ mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {t("equipment.CategoryOrganize.family", { family: g.family, count: g.machines })}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {[
                ...g.types.map((x) => `${x.name} (${x.machines})`),
                ...(g.direct && g.types.length ? [t("equipment.CategoryOrganize.loose", { count: g.direct })] : []),
              ].join(" · ")}
            </Typography>
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={apply.isPending}>
          {t("common.cancel")}
        </Button>
        <Button variant="contained" onClick={submit} disabled={apply.isPending || !groups?.length}>
          {apply.isPending ? t("equipment.CategoryOrganize.applying") : t("equipment.CategoryOrganize.apply")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
