import { useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton,
  MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { api } from "@/lib/api";
import { useToast } from "@/components/ui/AppToast";
import { useAuthStore } from "@/stores/useAuthStore";

interface Location {
  warehouse_id: number;
  location_name: string;
  address?: string | null;
  contact_number?: string | null;
}
interface Usage {
  machines: number;
  staff: number;
  expenses: number;
}

const num = { fontVariantNumeric: "tabular-nums" } as const;

/** The shop's locations: add, rename and remove. Removing moves what is there somewhere else first. */
export default function LocationsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const canManage = useAuthStore((s) => s.hasPermission("warehouse:manage"));
  const plan = useAuthStore((s) => s.user?.plan);
  const limit = plan?.limits?.max_locations ?? null;

  const { data: locations = [], isLoading, isError, error } = useQuery({
    queryKey: ["warehouse-options", "manage"],
    queryFn: async () => {
      const body: any = await api.get("/warehouses", { params: { limit: 1000 } });
      return (body?.data?.warehouses ?? []) as Location[];
    },
  });

  const [form, setForm] = useState<{ id?: number; location_name: string; address: string; contact_number: string } | null>(null);
  const [removing, setRemoving] = useState<Location | null>(null);
  const [moveTo, setMoveTo] = useState<number | "">("");

  const atLimit = limit !== null && locations.length >= limit;

  const refresh = () => qc.invalidateQueries({ queryKey: ["warehouse-options"] });

  const save = useMutation({
    mutationFn: async () => {
      if (!form) return;
      const body = { location_name: form.location_name.trim(), address: form.address.trim() || null, contact_number: form.contact_number.trim() || null };
      return form.id ? api.put(`/warehouses/${form.id}`, body) : api.post("/warehouses", body);
    },
    onSuccess: () => {
      toast.showSuccess(t("locations.saved"));
      setForm(null);
      refresh();
    },
  });

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["warehouse-usage", removing?.warehouse_id],
    enabled: !!removing,
    gcTime: 0,
    queryFn: async () => {
      const body: any = await api.get(`/warehouses/${removing!.warehouse_id}/usage`);
      return body?.data?.usage as Usage;
    },
  });
  const inUse = !!usage && usage.machines + usage.staff + usage.expenses > 0;
  const others = locations.filter((l) => l.warehouse_id !== removing?.warehouse_id);

  const remove = useMutation({
    mutationFn: async () => api.delete(`/warehouses/${removing!.warehouse_id}`, { data: inUse ? { move_to_id: moveTo } : {} }),
    onSuccess: () => {
      toast.showSuccess(t("locations.removed"));
      setRemoving(null);
      setMoveTo("");
      refresh();
      qc.invalidateQueries({ queryKey: ["equipment"] });
    },
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pb: 4, maxWidth: 900 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.1 }}>{t("locations.title")}</Typography>
          <Typography variant="body2" color="text.secondary">{t("locations.subtitle")}</Typography>
        </Box>
        {limit !== null && <Chip label={t("locations.usage", { used: locations.length, limit })} color={atLimit ? "warning" : "default"} variant="outlined" sx={{ fontWeight: 700, ...num }} />}
        {canManage && (
          <Tooltip title={atLimit ? t("locations.limitHint", { tier: plan?.tier ?? "", limit }) : ""}>
            <span>
              <Button variant="contained" disableElevation startIcon={<AddIcon />} disabled={atLimit} onClick={() => setForm({ location_name: "", address: "", contact_number: "" })} sx={{ textTransform: "none", fontWeight: 800 }}>
                {t("locations.add")}
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>

      {atLimit && canManage && <Alert severity="info">{t("locations.limitHint", { tier: plan?.tier ?? "", limit })}</Alert>}
      {isError && <Alert severity="error">{(error as any)?.message || t("locations.loadFailed")}</Alert>}

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small" aria-label={t("locations.title")}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>{t("locations.name")}</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>{t("locations.address")}</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>{t("locations.contact")}</TableCell>
              {canManage && <TableCell />}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} align="center"><CircularProgress size={24} /></TableCell>
              </TableRow>
            )}
            {locations.map((l) => (
              <TableRow key={l.warehouse_id} hover>
                <TableCell sx={{ fontWeight: 700 }}>{l.location_name}</TableCell>
                <TableCell>{l.address || "—"}</TableCell>
                <TableCell sx={num}>{l.contact_number || "—"}</TableCell>
                {canManage && (
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    <Tooltip title={t("locations.edit")}>
                      <IconButton size="small" aria-label={`${t("locations.edit")} ${l.location_name}`} onClick={() => setForm({ id: l.warehouse_id, location_name: l.location_name, address: l.address ?? "", contact_number: l.contact_number ?? "" })}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={locations.length <= 1 ? t("locations.lastOne") : t("locations.remove")}>
                      <span>
                        <IconButton size="small" aria-label={`${t("locations.remove")} ${l.location_name}`} disabled={locations.length <= 1} onClick={() => { setRemoving(l); setMoveTo(""); remove.reset(); }}>
                          <DeleteOutlinedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!form} onClose={() => !save.isPending && setForm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{form?.id ? t("locations.edit") : t("locations.add")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: "8px !important" }}>
          <TextField size="small" autoFocus required label={t("locations.name")} value={form?.location_name ?? ""} onChange={(e) => setForm((f) => f && { ...f, location_name: e.target.value })} />
          <TextField size="small" multiline minRows={2} label={t("locations.address")} value={form?.address ?? ""} onChange={(e) => setForm((f) => f && { ...f, address: e.target.value })} />
          <TextField size="small" label={t("locations.contact")} value={form?.contact_number ?? ""} onChange={(e) => setForm((f) => f && { ...f, contact_number: e.target.value })} slotProps={{ htmlInput: { style: num, "data-no-sinhala": "" } }} />
          {save.isError && <Alert severity="error">{(save.error as any)?.message || t("locations.saveFailed")}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" disabled={save.isPending} onClick={() => setForm(null)} sx={{ textTransform: "none" }}>{t("common.cancel")}</Button>
          <Button variant="contained" disableElevation disabled={!form?.location_name.trim() || save.isPending} onClick={() => save.mutate()} sx={{ textTransform: "none", fontWeight: 800 }}>{t("common.save")}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!removing} onClose={() => !remove.isPending && setRemoving(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{t("locations.removeTitle", { name: removing?.location_name })}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {usageLoading || !usage ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}><CircularProgress size={24} /></Box>
          ) : inUse ? (
            <>
              <DialogContentText sx={num}>{t("locations.inUse", { machines: usage.machines, staff: usage.staff, expenses: usage.expenses })}</DialogContentText>
              <TextField select size="small" label={t("locations.moveTo")} value={moveTo} onChange={(e) => setMoveTo(Number(e.target.value))}>
                {others.map((l) => <MenuItem key={l.warehouse_id} value={l.warehouse_id}>{l.location_name}</MenuItem>)}
              </TextField>
            </>
          ) : (
            <DialogContentText>{t("locations.notInUse")}</DialogContentText>
          )}
          {remove.isError && <Alert severity="error">{(remove.error as any)?.message || t("locations.saveFailed")}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" disabled={remove.isPending} onClick={() => setRemoving(null)} sx={{ textTransform: "none" }}>{t("common.cancel")}</Button>
          <Button variant="contained" color="error" disableElevation disabled={!usage || (inUse && moveTo === "") || remove.isPending} onClick={() => remove.mutate()} sx={{ textTransform: "none", fontWeight: 800 }}>
            {inUse ? t("locations.moveAndRemove") : t("locations.remove")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
