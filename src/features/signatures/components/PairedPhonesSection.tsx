// features/signatures/components/PairedPhonesSection.tsx
//
// POS-side management for paired phones. Lives inside the Signature tab in
// Profile. Shows the operator's currently paired phones + a dialog to mint
// a new pairing code the operator reads out to the phone user.

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import AddLinkIcon from '@mui/icons-material/AddLink';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import {
  useMyDevices,
  useMintPairingCode,
  useUnpairDevice,
} from '../hooks/useSignatures';
import { useTranslation } from "react-i18next";

export function PairedPhonesSection() {
  const { t } = useTranslation();
  const devices = useMyDevices();
  const mintMut = useMintPairingCode();
  const unpairMut = useUnpairDevice();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const handleOpenPair = async () => {
    setNotice(null);
    try {
      await mintMut.mutateAsync();
      setDialogOpen(true);
    } catch (err: any) {
      setNotice({ kind: 'error', text: err?.message || t("signatures.PairedPhonesSection.couldNotGenerateAPairing") });
    }
  };

  const code = mintMut.data?.code;
  const expiresAt = mintMut.data?.expires_at ? new Date(mintMut.data.expires_at) : null;

  const handleUnpair = async (id: number, label?: string | null) => {
    if (!confirm(t("signatures.PairedPhonesSection.confirmUnpair", { name: label || t("signatures.PairedPhonesSection.thisPhone") }))) return;
    try {
      await unpairMut.mutateAsync(id);
      setNotice({ kind: 'success', text: t("signatures.PairedPhonesSection.phoneUnpaired") });
    } catch (err: any) {
      setNotice({ kind: 'error', text: err?.message || t("signatures.PairedPhonesSection.couldNotUnpair") });
    }
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // ignore
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mt: 2,
        borderRadius: 2.5,
        border: '1px solid #e2e8f0',
        bgcolor: 'white',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <SmartphoneIcon sx={{ color: '#64748b' }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
            {t("signatures.PairedPhonesSection.pairedPhones")}
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#64748b' }}>
            {t("signatures.PairedPhonesSection.installTheAppOnA")}
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddLinkIcon />}
          onClick={handleOpenPair}
          disabled={mintMut.isPending}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {t("signatures.PairedPhonesSection.pairAPhone")}
        </Button>
      </Stack>

      {notice && (
        <Alert severity={notice.kind} onClose={() => setNotice(null)} sx={{ mb: 2 }}>
          {notice.text}
        </Alert>
      )}

      {devices.isLoading && <CircularProgress size={24} />}
      {devices.isError && (
        <Alert severity="error">{t("signatures.PairedPhonesSection.couldnTLoadPairedPhones")}</Alert>
      )}
      {devices.data?.devices.length === 0 && !devices.isLoading && (
        <Typography sx={{ fontSize: 13, color: '#94a3b8', py: 1 }}>
          {t("signatures.PairedPhonesSection.noPhonesPairedYet")}
        </Typography>
      )}
      {!!devices.data?.devices.length && (
        <Stack spacing={1}>
          {devices.data.devices.map((d) => (
            <Stack
              key={d.operator_device_id}
              direction="row"
              alignItems="center"
              spacing={2}
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <SmartphoneIcon sx={{ color: '#475569' }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                  {d.device_label || t("signatures.PairedPhonesSection.unlabelledPhone")}
                </Typography>
                <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                  {t("signatures.PairedPhonesSection.paired", { value: new Date(d.paired_at).toLocaleString() })}
                  {d.last_seen_at && ` · ${t("signatures.PairedPhonesSection.lastSeen", { value: new Date(d.last_seen_at).toLocaleString() })}`}
                </Typography>
              </Box>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleUnpair(d.operator_device_id, d.device_label)}
                disabled={unpairMut.isPending}
              >
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      )}

      {/* Pairing-code dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <SmartphoneIcon color="primary" />
            <span>{t("signatures.PairedPhonesSection.pairAPhone")}</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: '#64748b', mb: 2 }}>
            {t("signatures.PairedPhonesSection.onThePhoneInstallThis")}
          </Typography>

          <Box
            sx={{
              textAlign: 'center',
              bgcolor: '#f8fafc',
              border: '2px dashed #cbd5e1',
              borderRadius: 2,
              py: 3,
              mb: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: 44,
                fontWeight: 800,
                letterSpacing: 8,
                color: '#0f172a',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {code || '— — —'}
            </Typography>
            {expiresAt && (
              <Chip
                size="small"
                icon={<HourglassBottomIcon fontSize="small" />}
                label={t("signatures.PairedPhonesSection.expires", { value: expiresAt.toLocaleTimeString() })}
                sx={{ mt: 1.5, bgcolor: '#fef3c7', color: '#92400e' }}
              />
            )}
          </Box>

          <Button
            fullWidth
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={copyCode}
            disabled={!code}
            sx={{ textTransform: 'none' }}
          >
            {t("signatures.PairedPhonesSection.copyCode")}
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>
            {t("signatures.PairedPhonesSection.done")}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
