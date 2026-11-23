import { useState } from "react";
import { Alert, Box, Button, Checkbox, FormControlLabel, IconButton, Stack, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Overlay, type OverlayComponentProps } from "@/components/overlay";
import { createBrand, updateBrand } from "../api/catalog.api";
import { errorMessage } from "../api/http";
import { invalidateCatalog, useBrandsQuery, useRetailPermissions } from "../catalog/useRetailCatalog";

/** Brands: a plain list to add, rename and switch off. Brand is a field on an item, never a category. */
function BrandsOverlay(_props: OverlayComponentProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { canManage } = useRetailPermissions();
  const { data = [], isLoading } = useBrandsQuery();
  const [name, setName] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      invalidateCatalog(qc);
    } catch (err) {
      setError(errorMessage(err, t("retail.manage.saveFailed")));
    }
  };

  const add = () =>
    run(async () => {
      if (!name.trim()) return;
      await createBrand({ name: name.trim() });
      setName("");
    });

  return (
    <Overlay title={t("retail.manage.brands")} width={480} onConfirm={canManage && name.trim() ? () => void add() : undefined}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {canManage && (
          <Stack direction="row" spacing={1}>
            <TextField size="small" fullWidth autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t("retail.item.brandName")} slotProps={{ htmlInput: { "aria-label": t("retail.item.brandName") } }} />
            <Button variant="contained" startIcon={<AddIcon />} disabled={!name.trim()} onClick={() => void add()}>
              {t("common.add")}
            </Button>
          </Stack>
        )}
        {isLoading && <Typography variant="body2">{t("common.loading")}</Typography>}
        {[...data].sort((a, b) => a.name.localeCompare(b.name)).map((b) => (
          <Stack key={b.brand_id} direction="row" spacing={1} sx={{ alignItems: "center", borderBottom: 1, borderColor: "divider", py: 0.5, opacity: b.is_active === false ? 0.55 : 1 }} data-testid="brand-row">
            {editId === b.brand_id ? (
              <>
                <TextField
                  size="small"
                  fullWidth
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      void run(async () => {
                        await updateBrand(b.brand_id, { name: editName.trim() });
                        setEditId(null);
                      });
                    }
                  }}
                  slotProps={{ htmlInput: { "aria-label": t("retail.item.brandName") } }}
                />
                <IconButton
                  size="small"
                  aria-label={t("common.save")}
                  onClick={() =>
                    void run(async () => {
                      await updateBrand(b.brand_id, { name: editName.trim() });
                      setEditId(null);
                    })
                  }
                >
                  <CheckIcon fontSize="small" />
                </IconButton>
              </>
            ) : (
              <>
                <Typography variant="body2" sx={{ flex: 1, fontWeight: 700 }}>
                  {b.name}
                </Typography>
                {canManage && (
                  <>
                    <FormControlLabel
                      control={<Checkbox size="small" checked={b.is_active !== false} onChange={(e) => void run(() => updateBrand(b.brand_id, { is_active: e.target.checked }))} />}
                      label={t("retail.manage.active")}
                      sx={{ mr: 0 }}
                    />
                    <Tooltip title={t("common.edit")}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditId(b.brand_id);
                          setEditName(b.name);
                        }}
                        aria-label={`${t("common.edit")} ${b.name}`}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </>
            )}
          </Stack>
        ))}
      </Box>
    </Overlay>
  );
}

export default BrandsOverlay;
