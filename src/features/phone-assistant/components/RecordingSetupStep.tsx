import { Box, Button, Chip, Divider, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/useAuthStore";
import type { PhoneAssistantSetupStatus } from "../lib/nativeBridge";

const ADMIN_ROLES = ["admin", "administrator", "superadmin", "super_admin", "owner"];

interface Props {
  status: PhoneAssistantSetupStatus;
  busy: boolean;
  onGrant: () => void;
}

/**
 * The administrator's one-time setup for call recordings. It is never shown to a cashier: whoever is
 * signed in on the phone must be an administrator, or, with nobody signed in, the paired user must be.
 */
export function RecordingSetupStep({ status, busy, onGrant }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const viewerIsAdmin = user
    ? (user.roles ?? []).some((role) => ADMIN_ROLES.includes(role.toLowerCase()))
    : status.callRecordingSetupAllowed === true;

  if (!status.callRecordingEnabled || !viewerIsAdmin) return null;

  const manufacturer = status.manufacturer || "";
  const brandSteps = /samsung/i.test(manufacturer)
    ? t("phoneAssistant.recordingSetup.samsungSteps")
    : /vivo|iqoo/i.test(manufacturer)
      ? t("phoneAssistant.recordingSetup.vivoSteps")
      : t("phoneAssistant.recordingSetup.otherSteps");

  return (
    <Box data-testid="recording-setup-step">
      <Divider sx={{ my: 1.5 }} />
      <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "text.primary" }}>
        {t("phoneAssistant.recordingSetup.title")}
      </Typography>
      <Typography sx={{ fontSize: 11.5, color: "text.secondary", mb: 1 }}>
        {t("phoneAssistant.recordingSetup.adminOnly")}
      </Typography>

      <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary" }}>
        {t("phoneAssistant.recordingSetup.autoRecordTitle")}
      </Typography>
      <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1 }}>{brandSteps}</Typography>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary", minWidth: 0 }}>
          {t("phoneAssistant.recordingSetup.permissionTitle")}
        </Typography>
        {status.audioPermission ? (
          <Chip
            size="small"
            label={t("phoneAssistant.checklist.ready")}
            color="success"
            variant="outlined"
            sx={{ height: 24, fontWeight: 700, fontSize: "0.7rem" }}
          />
        ) : (
          <Button
            size="small"
            variant="contained"
            color="warning"
            disabled={busy}
            onClick={onGrant}
            sx={{ textTransform: "none", fontWeight: 700, minHeight: 32, px: 1.5, flexShrink: 0 }}
          >
            {t("phoneAssistant.checklist.fix")}
          </Button>
        )}
      </Stack>
      {!status.audioPermission && (
        <Typography sx={{ fontSize: 11.5, color: "text.secondary", mt: 0.5 }}>
          {t("phoneAssistant.recordingSetup.permissionHint")}
        </Typography>
      )}

      <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 1 }}>
        {t("phoneAssistant.recordingSetup.check")}
      </Typography>
    </Box>
  );
}
