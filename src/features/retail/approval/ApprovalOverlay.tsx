import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  IconButton,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import PinOutlinedIcon from "@mui/icons-material/PinOutlined";
import PasswordOutlinedIcon from "@mui/icons-material/PasswordOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Overlay, registerOverlay, type OverlayComponentProps } from "@/components/overlay";
import { connectSocket, getSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/useAuthStore";
import { resolveAvatarUrl } from "@/features/profile/api/me.api";
import { approveHere, fetchApprovers, requestApproval } from "../api/retail.api";
import type { ApprovalGrant, ApprovalRequestInput } from "../api/types";
import { useRetailSettings } from "../hooks/useRetailSettings";
import { parseApprovalError, type ApprovalError } from "./approvalErrors";
import { PinPad, PIN_MIN } from "./PinPad";

export const APPROVAL_OVERLAY_ID = "manager-approval";
/** A remote request expires after this long without an answer (plan §7.14). */
export const REMOTE_WAIT_MS = 5 * 60 * 1000;
const DEFAULT_LOCK_MS = 10 * 60 * 1000;

interface Props extends OverlayComponentProps {
  input: ApprovalRequestInput;
  resolve: (grant: ApprovalGrant | null) => void;
}

type Remote =
  | { state: "idle" }
  | { state: "waiting"; exceptionId: number; until: number }
  | { state: "declined" }
  | { state: "timeout" }
  | { state: "error"; message: string };

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function ApprovalOverlay({ input, resolve, onClose }: Props) {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.user);
  const { settings } = useRetailSettings();
  const approversQuery = useQuery({ queryKey: ["approvals", "approvers"], queryFn: fetchApprovers, staleTime: 60 * 1000 });
  // A cashier can't approve their own request.
  const approvers = useMemo(() => (approversQuery.data ?? []).filter((a) => a.id !== me?.id), [approversQuery.data, me?.id]);

  const [pickedId, setPickedId] = useState<number | null>(null);
  const approverId = pickedId ?? (approvers.length === 1 ? approvers[0].id : null);

  const method = settings.approvalMethod;
  const [credTab, setCredTab] = useState<"pin" | "password">("pin");
  const credential: "pin" | "password" = method === "pin" ? "pin" : method === "password" ? "password" : credTab;
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<ApprovalError | null>(null);
  const [locks, setLocks] = useState<Record<number, number>>({});
  const [now, setNow] = useState(() => Date.now());
  const [remote, setRemote] = useState<Remote>({ state: "idle" });
  const done = useRef(false);

  const finish = (grant: ApprovalGrant) => {
    if (done.current) return;
    done.current = true;
    resolve(grant);
    onClose();
  };

  // Tick once a second while something is counting down.
  const lockedUntil = approverId != null ? (locks[approverId] ?? 0) : 0;
  const isLocked = lockedUntil > now;
  const ticking = remote.state === "waiting" || isLocked;
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ticking]);

  const mutation = useMutation({
    mutationFn: () =>
      approveHere({
        ...input,
        approver_user_id: approverId as number,
        ...(credential === "pin" ? { pin } : { password }),
      }),
    onSuccess: (grant) => finish(grant),
    onError: (err) => {
      const parsed = parseApprovalError(err);
      setError(parsed);
      setPin("");
      setPassword("");
      if (parsed.kind === "locked" && approverId != null) {
        setNow(Date.now());
        setLocks((l) => ({ ...l, [approverId]: parsed.lockedUntil ?? Date.now() + DEFAULT_LOCK_MS }));
      }
    },
  });

  const credentialReady = credential === "pin" ? pin.length >= PIN_MIN : password.length > 0;
  const canSubmit = approverId != null && credentialReady && !isLocked && !mutation.isPending && remote.state !== "waiting";
  const submit = () => {
    if (!canSubmit) return;
    setError(null);
    mutation.mutate();
  };

  // ── Ask manager (remote) ────────────────────────────────────────────────────
  const ask = useMutation({
    mutationFn: () => requestApproval(input),
    onSuccess: (r) => setRemote({ state: "waiting", exceptionId: r.exception_id, until: Date.now() + REMOTE_WAIT_MS }),
    onError: (err: any) => setRemote({ state: "error", message: parseApprovalError(err).message }),
  });

  const waitingId = remote.state === "waiting" ? remote.exceptionId : null;
  const waitUntil = remote.state === "waiting" ? remote.until : 0;
  useEffect(() => {
    if (waitingId == null) return;
    connectSocket();
    const socket = getSocket();
    const onDecided = (p: { exception_id: number; approved: boolean; approval_token?: string }) => {
      if (p?.exception_id !== waitingId) return;
      if (p.approved && p.approval_token) finish({ approval_token: p.approval_token, exception_id: waitingId });
      else if (p.approved) setRemote({ state: "error", message: t("approval.noToken") });
      else setRemote({ state: "declined" });
    };
    socket.on("approval:decided", onDecided);
    const timer = setTimeout(() => setRemote({ state: "timeout" }), Math.max(0, waitUntil - Date.now()));
    return () => {
      socket.off("approval:decided", onDecided);
      clearTimeout(timer);
    };
    // finish is stable for the life of this overlay
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingId, waitUntil]);

  const remoteOpen = remote.state === "waiting";
  const lockMinutes = Math.max(1, Math.ceil((lockedUntil - now) / 60000));

  const footer = (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      {settings.askManagerRemote && !remoteOpen && (
        <Button
          variant="outlined"
          startIcon={<NotificationsActiveOutlinedIcon />}
          onClick={() => ask.mutate()}
          disabled={ask.isPending || mutation.isPending}
          sx={{ minHeight: 44, textTransform: "none", fontWeight: 700 }}
        >
          {t("approval.askManager")}
        </Button>
      )}
      <Box sx={{ flex: 1 }} />
      <Button
        variant="contained"
        disableElevation
        startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutlinedIcon />}
        disabled={!canSubmit}
        onClick={submit}
        sx={{ minHeight: 44, minWidth: 132, textTransform: "none", fontWeight: 800 }}
      >
        {t("approval.approve")}
      </Button>
    </Box>
  );

  return (
    <Overlay
      title={
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
          <LockOutlinedIcon fontSize="small" color="primary" />
          {t("approval.title")}
        </Box>
      }
      width={440}
      onConfirm={submit}
      footer={footer}
    >
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2, bgcolor: "action.hover" }}>
        <Typography variant="body1" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }} data-testid="approval-summary">
          {input.summary}
        </Typography>
      </Paper>

      {remoteOpen ? (
        <Box sx={{ textAlign: "center", py: 3 }} role="status">
          <CircularProgress size={36} />
          <Typography sx={{ mt: 2, fontWeight: 800 }}>{t("approval.waiting")}</Typography>
          <Typography variant="h5" sx={{ mt: 0.5, fontVariantNumeric: "tabular-nums", fontWeight: 800 }}>
            {clock(waitUntil - now)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t("approval.waitingHint")}
          </Typography>
          <Button onClick={() => setRemote({ state: "idle" })} sx={{ mt: 2, minHeight: 44, textTransform: "none" }}>
            {t("approval.cancelWait")}
          </Button>
        </Box>
      ) : (
        <>
          {remote.state === "declined" && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {t("approval.declined")}
            </Alert>
          )}
          {remote.state === "timeout" && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t("approval.timeout")}
            </Alert>
          )}
          {remote.state === "error" && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {remote.message || t("approval.requestFailed")}
            </Alert>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {t("approval.manager")}
          </Typography>
          {approversQuery.isLoading ? (
            <Box sx={{ py: 2, textAlign: "center" }}>
              <CircularProgress size={22} />
            </Box>
          ) : approvers.length === 0 ? (
            <Alert severity="warning" sx={{ mt: 0.5 }}>
              {t("approval.noManagers")}
            </Alert>
          ) : (
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 1, mt: 0.5, mb: 2 }}>
              {approvers.map((a) => {
                const selected = a.id === approverId;
                return (
                  <Button
                    key={a.id}
                    onClick={() => {
                      setPickedId(a.id);
                      setError(null);
                      setPin("");
                      setPassword("");
                    }}
                    aria-pressed={selected}
                    variant={selected ? "contained" : "outlined"}
                    disableElevation
                    sx={{
                      flexDirection: "column",
                      gap: 0.5,
                      py: 1,
                      minHeight: 76,
                      textTransform: "none",
                      fontWeight: 700,
                      lineHeight: 1.2,
                    }}
                  >
                    <Avatar src={resolveAvatarUrl(a.avatar_url ?? null) || undefined} sx={{ width: 32, height: 32, bgcolor: selected ? "background.paper" : "primary.main", color: selected ? "primary.main" : "primary.contrastText", fontWeight: 800 }}>
                      {a.display_name?.[0]?.toUpperCase()}
                    </Avatar>
                    <Box component="span" sx={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.display_name}
                    </Box>
                  </Button>
                );
              })}
            </Box>
          )}

          {method === "either" && (
            <Tabs
              value={credTab}
              onChange={(_, v) => {
                setCredTab(v);
                setError(null);
              }}
              variant="fullWidth"
              sx={{ mb: 1.5, minHeight: 40 }}
            >
              <Tab value="pin" icon={<PinOutlinedIcon fontSize="small" />} iconPosition="start" label={t("approval.pin")} sx={{ minHeight: 40, textTransform: "none" }} />
              <Tab value="password" icon={<PasswordOutlinedIcon fontSize="small" />} iconPosition="start" label={t("approval.password")} sx={{ minHeight: 40, textTransform: "none" }} />
            </Tabs>
          )}

          {isLocked && (
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              {t("approval.locked", { minutes: lockMinutes })}
            </Alert>
          )}
          {error && !isLocked && (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              {error.kind === "wrong"
                ? t(credential === "pin" ? "approval.wrongPin" : "approval.wrongPassword")
                : error.kind === "self"
                  ? t("approval.self")
                  : error.kind === "method"
                    ? t("approval.methodNotAllowed")
                    : error.message || t("approval.failed")}
            </Alert>
          )}

          {credential === "pin" ? (
            <PinPad value={pin} onChange={setPin} disabled={approverId == null || isLocked || mutation.isPending} autoFocus />
          ) : (
            <TextField
              fullWidth
              size="small"
              type={showPassword ? "text" : "password"}
              label={t("approval.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={approverId == null || isLocked || mutation.isPending}
              autoComplete="off"
              autoFocus
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPassword((v) => !v)} edge="end" aria-label={t("approval.showPassword")}>
                        {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          )}
        </>
      )}
    </Overlay>
  );
}

registerOverlay(APPROVAL_OVERLAY_ID, ApprovalOverlay);
export default ApprovalOverlay;
