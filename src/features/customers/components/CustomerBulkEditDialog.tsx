import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Radio,
  RadioGroup,
  Rating,
  TextField,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import BusinessIcon from "@mui/icons-material/Business";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import EditNoteIcon from "@mui/icons-material/EditNote";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";

import {
  useBulkUpdateCustomers,
  useParentCustomerOptions,
} from "../hooks/useCustomerHooks";
import {
  FieldGrid,
  FormDialogShell,
  FormSection,
} from "@/components/forms/FormDialogShell";
import { useToast } from "@/components/ui/AppToast";
import { useTranslation } from "react-i18next";

interface CustomerBulkEditDialogProps {
  open: boolean;
  onClose: () => void;
  selectedIds: number[];
  onSuccess?: () => void;
}

export function CustomerBulkEditDialog({
  open,
  onClose,
  selectedIds,
  onSuccess,
}: CustomerBulkEditDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { showSuccess, showError } = useToast();
  const bulkUpdateMutation = useBulkUpdateCustomers();

  // Parent customer options for linking
  const { data: parentOptions = [], isLoading: isLoadingParents } =
    useParentCustomerOptions(null, open);

  // Field activation flags (Only checked fields will be applied)
  const [enableStatus, setEnableStatus] = useState(false);
  const [status, setStatus] = useState<"Active" | "Blacklisted">("Active");

  const [enableCustomerType, setEnableCustomerType] = useState(false);
  const [customerType, setCustomerType] = useState<"Individual" | "Business">("Individual");

  const [enableRating, setEnableRating] = useState(false);
  const [rating, setRating] = useState<number>(5);

  const [enableParent, setEnableParent] = useState(false);
  const [parentId, setParentId] = useState<number | "" | "none">("none");

  const [enableDeposit, setEnableDeposit] = useState(false);
  const [depositMode, setDepositMode] = useState<"set" | "add">("set");
  const [depositAmount, setDepositAmount] = useState<number | "">("");

  const [localError, setLocalError] = useState<string | null>(null);

  const resetForm = () => {
    setEnableStatus(false);
    setStatus("Active");
    setEnableCustomerType(false);
    setCustomerType("Individual");
    setEnableRating(false);
    setRating(5);
    setEnableParent(false);
    setParentId("none");
    setEnableDeposit(false);
    setDepositMode("set");
    setDepositAmount("");
    setLocalError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const hasAnyFieldSelected =
    enableStatus ||
    enableCustomerType ||
    enableRating ||
    enableParent ||
    enableDeposit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (selectedIds.length === 0) {
      setLocalError(t("customers.CustomerBulkEditDialog.noCustomerAccountsSelected"));
      return;
    }

    if (!hasAnyFieldSelected) {
      setLocalError(t("customers.CustomerBulkEditDialog.pleaseEnableAndConfigureAt"));
      return;
    }

    const updates: Record<string, any> = {};

    if (enableStatus) {
      updates.status = status;
    }

    if (enableCustomerType) {
      updates.customer_type = customerType;
    }

    if (enableRating) {
      updates.rating = rating;
    }

    if (enableParent) {
      if (parentId === "none") {
        updates.parent_customer_id = null;
      } else if (parentId !== "") {
        const numId = Number(parentId);
        if (selectedIds.includes(numId)) {
          setLocalError(t("customers.CustomerBulkEditDialog.cannotSetACustomerAs"));
          return;
        }
        updates.parent_customer_id = numId;
      }
    }

    if (enableDeposit) {
      const amt = Number(depositAmount);
      if (depositAmount === "" || isNaN(amt) || amt < 0) {
        setLocalError(t("customers.CustomerBulkEditDialog.pleaseEnterAValidDeposit"));
        return;
      }
      updates.deposit_balance_adjustment = {
        type: depositMode,
        value: amt,
      };
    }

    try {
      const result = await bulkUpdateMutation.mutateAsync({
        ids: selectedIds,
        updates,
      });

      showSuccess(
        t("customers.CustomerBulkEditDialog.successfullyUpdatedCustomerRecords", { value: result.data?.updatedCount || selectedIds.length }),
        t("customers.CustomerBulkEditDialog.bulkUpdateComplete")
      );
      resetForm();
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || t("customers.CustomerBulkEditDialog.failedToBulkUpdateCustomers");
      setLocalError(msg);
      showError(msg, t("customers.CustomerBulkEditDialog.bulkUpdateFailed"));
    }
  };

  const selectedCount = selectedIds.length;

  return (
    <FormDialogShell
      open={open}
      onClose={handleClose}
      maxWidth="md"
      eyebrow={t("customers.CustomerBulkEditDialog.batchCrmOperations")}
      title={t("customers.CustomerBulkEditDialog.bulkEditTitle", { count: selectedCount })}
      subtitle={t("customers.CustomerBulkEditDialog.selectivelyUpdateCustomerPropertiesAcros")}
      avatarIcon={<EditNoteIcon sx={{ fontSize: 28 }} />}
      headerChips={
        <>
          <Chip
            size="small"
            label={t("customers.CustomerBulkEditDialog.selected", { selectedCount })}
            color="primary"
            variant="filled"
            sx={{ fontWeight: 700, bgcolor: "rgba(255, 255, 255, 0.2)", color: "#fff" }}
          />
          <Chip
            size="small"
            icon={<CheckCircleOutlinedIcon sx={{ color: "#fff !important", fontSize: "14px !important" }} />}
            label={t("customers.CustomerBulkEditDialog.safeTransactionalUpdate")}
            sx={{ fontWeight: 600, bgcolor: "rgba(255, 255, 255, 0.12)", color: "#fff" }}
          />
        </>
      }
      footer={
        <>
          <Button onClick={handleClose} color="inherit" disabled={bulkUpdateMutation.isPending}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!hasAnyFieldSelected || bulkUpdateMutation.isPending}
            startIcon={
              bulkUpdateMutation.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : undefined
            }
            sx={{ fontWeight: 700, px: 3 }}
          >
            {bulkUpdateMutation.isPending
              ? t("customers.CustomerBulkEditDialog.applyingUpdates")
              : t("customers.CustomerBulkEditDialog.applyToClients", { count: selectedCount })}
          </Button>
        </>
      }
    >
      {localError && (
        <Alert severity="error" onClose={() => setLocalError(null)} sx={{ borderRadius: 2 }}>
          {localError}
        </Alert>
      )}

      {/* ── 1. Status & Classification ── */}
      <FormSection
        icon={<PersonOutlinedIcon />}
        title={t("customers.CustomerBulkEditDialog.statusAccountClassification")}
        hint={t("customers.CustomerBulkEditDialog.modifyAccessStatusCustomerCategorization")}
      >
        {/* Status Toggle */}
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: `1px solid ${enableStatus ? theme.palette.primary.main : theme.palette.border.subtle}`,
            bgcolor: enableStatus ? alpha(theme.palette.primary.main, 0.02) : "transparent",
            transition: "all 0.15s ease",
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={enableStatus}
                onChange={(e) => setEnableStatus(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t("customers.CustomerBulkEditDialog.updateAccountStatus")}
              </Typography>
            }
          />
          {enableStatus && (
            <Box sx={{ mt: 1.5, pl: { sm: 4 } }}>
              <RadioGroup
                row
                value={status}
                onChange={(e) => setStatus(e.target.value as "Active" | "Blacklisted")}
              >
                <FormControlLabel
                  value="Active"
                  control={<Radio size="small" color="success" />}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <VerifiedUserIcon sx={{ fontSize: 16, color: "success.main" }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{t("customers.CustomerBulkEditDialog.activeInGoodStanding")}</Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="Blacklisted"
                  control={<Radio size="small" color="error" />}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <WarningAmberIcon sx={{ fontSize: 16, color: "error.main" }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "error.main" }}>{t("customers.CustomerBulkEditDialog.blacklistedBlocked")}</Typography>
                    </Box>
                  }
                />
              </RadioGroup>
            </Box>
          )}
        </Box>

        {/* Customer Type Toggle */}
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: `1px solid ${enableCustomerType ? theme.palette.primary.main : theme.palette.border.subtle}`,
            bgcolor: enableCustomerType ? alpha(theme.palette.primary.main, 0.02) : "transparent",
            transition: "all 0.15s ease",
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={enableCustomerType}
                onChange={(e) => setEnableCustomerType(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t("customers.CustomerBulkEditDialog.updateCustomerType")}
              </Typography>
            }
          />
          {enableCustomerType && (
            <Box sx={{ mt: 1.5, pl: { sm: 4 } }}>
              <RadioGroup
                row
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as "Individual" | "Business")}
              >
                <FormControlLabel
                  value="Individual"
                  control={<Radio size="small" />}
                  label={<Typography variant="body2" sx={{ fontWeight: 600 }}>{t("customers.CustomerBulkEditDialog.individualRenter")}</Typography>}
                />
                <FormControlLabel
                  value="Business"
                  control={<Radio size="small" />}
                  label={<Typography variant="body2" sx={{ fontWeight: 600 }}>{t("customers.CustomerBulkEditDialog.corporateBusinessEntity")}</Typography>}
                />
              </RadioGroup>
            </Box>
          )}
        </Box>

        {/* Rating Toggle */}
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: `1px solid ${enableRating ? theme.palette.primary.main : theme.palette.border.subtle}`,
            bgcolor: enableRating ? alpha(theme.palette.primary.main, 0.02) : "transparent",
            transition: "all 0.15s ease",
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={enableRating}
                onChange={(e) => setEnableRating(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t("customers.CustomerBulkEditDialog.updateRatingTrustScore")}
              </Typography>
            }
          />
          {enableRating && (
            <Box sx={{ mt: 1.5, pl: { sm: 4 }, display: "flex", alignItems: "center", gap: 2 }}>
              <Rating
                value={rating}
                onChange={(_, val) => setRating(val || 1)}
                max={5}
                size="medium"
              />
              <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.secondary }}>
                {t("customers.CustomerBulkEditDialog.5Stars", { rating })}
              </Typography>
            </Box>
          )}
        </Box>
      </FormSection>

      {/* ── 2. Corporate Hierarchy (Parent Company) ── */}
      <FormSection
        icon={<BusinessIcon />}
        title={t("customers.CustomerBulkEditDialog.corporateHierarchyDelegation")}
        hint={t("customers.CustomerBulkEditDialog.linkSelectedCustomerProfilesUnder")}
      >
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: `1px solid ${enableParent ? theme.palette.primary.main : theme.palette.border.subtle}`,
            bgcolor: enableParent ? alpha(theme.palette.primary.main, 0.02) : "transparent",
            transition: "all 0.15s ease",
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={enableParent}
                onChange={(e) => setEnableParent(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t("customers.CustomerBulkEditDialog.assignOrClearParentCompany")}
              </Typography>
            }
          />
          {enableParent && (
            <Box sx={{ mt: 1.5, pl: { sm: 4 } }}>
              <TextField
                select
                fullWidth
                size="small"
                label={t("customers.CustomerBulkEditDialog.parentBusinessEntity")}
                value={parentId}
                onChange={(e) => setParentId(e.target.value as any)}
                disabled={isLoadingParents}
              >
                <MenuItem value="none">
                  <em>{t("customers.CustomerBulkEditDialog.noParentCompanyIndependentAccount")}</em>
                </MenuItem>
                {parentOptions.map((opt) => (
                  <MenuItem key={opt.customer_id} value={opt.customer_id}>
                    {opt.company_name || `${opt.first_name} ${opt.last_name}`} ({opt.phone_number || opt.nic_number || t("customers.CustomerBulkEditDialog.noContact")})
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          )}
        </Box>
      </FormSection>

      {/* ── 3. Deposit / Advance Balance ── */}
      <FormSection
        icon={<AccountBalanceWalletIcon />}
        title={t("customers.CustomerBulkEditDialog.advanceSecurityDepositBalance")}
        hint={t("customers.CustomerBulkEditDialog.setOrCreditAdvanceDeposit")}
      >
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: `1px solid ${enableDeposit ? theme.palette.primary.main : theme.palette.border.subtle}`,
            bgcolor: enableDeposit ? alpha(theme.palette.primary.main, 0.02) : "transparent",
            transition: "all 0.15s ease",
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={enableDeposit}
                onChange={(e) => setEnableDeposit(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t("customers.CustomerBulkEditDialog.updateDepositAdvanceHeld")}
              </Typography>
            }
          />

          {enableDeposit && (
            <Box sx={{ mt: 2, pl: { sm: 4 }, display: "flex", flexDirection: "column", gap: 2 }}>
              <RadioGroup
                row
                value={depositMode}
                onChange={(e) => setDepositMode(e.target.value as "set" | "add")}
              >
                <FormControlLabel
                  value="set"
                  control={<Radio size="small" />}
                  label={<Typography variant="body2" sx={{ fontWeight: 600 }}>{t("customers.CustomerBulkEditDialog.setFixedAmountOverride")}</Typography>}
                />
                <FormControlLabel
                  value="add"
                  control={<Radio size="small" />}
                  label={<Typography variant="body2" sx={{ fontWeight: 600 }}>{t("customers.CustomerBulkEditDialog.addCreditToCurrentBalance")}</Typography>}
                />
              </RadioGroup>

              <TextField
                type="number"
                size="small"
                label={depositMode === "set" ? t("customers.CustomerBulkEditDialog.newAdvanceBalanceRs") : t("customers.CustomerBulkEditDialog.creditAmountToAddRs")}
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value === "" ? "" : Number(e.target.value))}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                  },
                  htmlInput: { min: 0, step: "100" },
                }}
                sx={{ maxWidth: 300 }}
              />
            </Box>
          )}
        </Box>
      </FormSection>
    </FormDialogShell>
  );
}
