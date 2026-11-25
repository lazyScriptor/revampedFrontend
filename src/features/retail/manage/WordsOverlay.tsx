import { useState } from "react";
import { Alert, Box, Button, IconButton, Stack, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Overlay, type OverlayComponentProps } from "@/components/overlay";
import { createAlias, deleteAlias } from "../api/catalog.api";
import { errorMessage } from "../api/http";
import { invalidateCatalog, useAliasesQuery, useRetailPermissions } from "../catalog/useRetailCatalog";

/** Shop words: "hss" means "steel", so search finds the item either way (plan §5.7). */
function WordsOverlay(_props: OverlayComponentProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { canManage } = useRetailPermissions();
  const { data = [], isLoading } = useAliasesQuery();
  const [term, setTerm] = useState("");
  const [means, setMeans] = useState("");
  const [filter, setFilter] = useState("");
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
      if (!term.trim() || !means.trim()) return;
      await createAlias({ term: term.trim(), means: means.trim() });
      setTerm("");
      setMeans("");
    });

  const f = filter.trim().toLowerCase();
  const rows = data.filter((a) => !f || a.term.toLowerCase().includes(f) || a.means.toLowerCase().includes(f));

  return (
    <Overlay title={t("retail.manage.words")} width={520} onConfirm={canManage && term.trim() && means.trim() ? () => void add() : undefined}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          {t("retail.manage.wordsHint")}
        </Typography>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {canManage && (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <TextField size="small" autoFocus value={term} onChange={(e) => setTerm(e.target.value)} placeholder={t("retail.manage.term")} slotProps={{ htmlInput: { "aria-label": t("retail.manage.term") } }} sx={{ flex: 1 }} />
            <ArrowForwardIcon fontSize="small" color="action" />
            <TextField size="small" value={means} onChange={(e) => setMeans(e.target.value)} placeholder={t("retail.manage.means")} slotProps={{ htmlInput: { "aria-label": t("retail.manage.means") } }} sx={{ flex: 1 }} />
            <Button variant="contained" startIcon={<AddIcon />} disabled={!term.trim() || !means.trim()} onClick={() => void add()}>
              {t("common.add")}
            </Button>
          </Stack>
        )}
        <TextField size="small" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t("common.search")} slotProps={{ htmlInput: { "aria-label": t("common.search") } }} />
        {isLoading && <Typography variant="body2">{t("common.loading")}</Typography>}
        {rows.map((a) => (
          <Stack key={a.alias_id} direction="row" spacing={1} sx={{ alignItems: "center", borderBottom: 1, borderColor: "divider", py: 0.5 }} data-testid="word-row">
            <Typography variant="body2" sx={{ flex: 1, fontWeight: 700 }}>
              {a.term}
            </Typography>
            <ArrowForwardIcon fontSize="small" color="action" />
            <Typography variant="body2" sx={{ flex: 1 }}>
              {a.means}
            </Typography>
            {canManage && (
              <Tooltip title={t("common.delete")}>
                <IconButton size="small" onClick={() => void run(() => deleteAlias(a.alias_id))} aria-label={`${t("common.delete")} ${a.term}`}>
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        ))}
      </Box>
    </Overlay>
  );
}

export default WordsOverlay;
