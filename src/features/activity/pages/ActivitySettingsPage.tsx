import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import AddIcon from "@mui/icons-material/Add";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  useActivitySettings,
  useUpdateActivitySettings,
} from "../hooks/useActivityHooks";
import {
  ACTIVITY_TYPE_META,
  ALL_ACTIVITY_TYPES,
  DEFAULT_ACTIVITY_SETTINGS,
} from "../constants";
import type {
  ActivityEventType,
  ActivitySettingsPayload,
  ReasonListKey,
} from "../types";
import { usePushRoles } from "@/features/phone-assistant/hooks/usePushSettings";

const TABS = ["reasons", "thresholds", "roles", "review_tags"] as const;
type TabKey = (typeof TABS)[number];
const REASON_LISTS: ReasonListKey[] = ["discount", "backdate", "refund", "void"];

export default function ActivitySettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { tab?: string };
  const activeTab: TabKey = (TABS as readonly string[]).includes(search.tab ?? "")
    ? (search.tab as TabKey)
    : "reasons";

  const { data: settings, isLoading } = useActivitySettings();
  const { data: roles = [] } = usePushRoles(true);
  const updateSettings = useUpdateActivitySettings();

  const [draft, setDraft] = useState<ActivitySettingsPayload>(DEFAULT_ACTIVITY_SETTINGS);
  const [selectedList, setSelectedList] = useState<ReasonListKey>("discount");
  const [newReasonEn, setNewReasonEn] = useState("");
  const [newReasonSi, setNewReasonSi] = useState("");
  const [newTagEn, setNewTagEn] = useState("");
  const [newTagSi, setNewTagSi] = useState("");
  const [newTagTone, setNewTagTone] = useState<"positive" | "negative">("positive");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  const handleSave = (patch: Partial<ActivitySettingsPayload>) => {
    setSavedMsg(null);
    updateSettings.mutate(patch, {
      onSuccess: () => setSavedMsg(t("activity.settings.saved")),
    });
  };

  if (isLoading && !settings) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const listItems = draft.reasons[selectedList] ?? [];

  const updateReasonItem = (
    idx: number,
    patch: Partial<{ label_en: string; label_si: string; active: boolean }>,
  ) => {
    setDraft((prev) => {
      const nextList = [...(prev.reasons[selectedList] ?? [])];
      nextList[idx] = { ...nextList[idx], ...patch };
      return { ...prev, reasons: { ...prev.reasons, [selectedList]: nextList } };
    });
  };

  const removeReasonItem = (idx: number) => {
    setDraft((prev) => {
      const nextList = (prev.reasons[selectedList] ?? []).filter(
        (item, i) => i !== idx || item.key === "other",
      );
      return { ...prev, reasons: { ...prev.reasons, [selectedList]: nextList } };
    });
  };

  const addReasonItem = () => {
    const en = newReasonEn.trim();
    if (!en) return;
    const key =
      en
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "") || `reason_${Date.now()}`;
    setDraft((prev) => {
      const curr = prev.reasons[selectedList] ?? [];
      const withoutOther = curr.filter((r) => r.key !== "other");
      const other = curr.find((r) => r.key === "other") ?? {
        key: "other",
        label_en: "Other",
        label_si: "වෙනත්",
        active: true,
      };
      return {
        ...prev,
        reasons: {
          ...prev.reasons,
          [selectedList]: [
            ...withoutOther,
            { key, label_en: en, label_si: newReasonSi.trim() || en, active: true },
            other,
          ],
        },
      };
    });
    setNewReasonEn("");
    setNewReasonSi("");
  };

  const toggleRoleType = (roleId: number, type: ActivityEventType) => {
    const k = String(roleId);
    setDraft((prev) => {
      const curr = prev.activity_roles[k] ?? { types: ALL_ACTIVITY_TYPES, see_amounts: true };
      const exists = curr.types.includes(type);
      const nextTypes = exists ? curr.types.filter((tp) => tp !== type) : [...curr.types, type];
      return {
        ...prev,
        activity_roles: {
          ...prev.activity_roles,
          [k]: { ...curr, types: nextTypes },
        },
      };
    });
  };

  const toggleRoleAmounts = (roleId: number, see: boolean) => {
    const k = String(roleId);
    setDraft((prev) => {
      const curr = prev.activity_roles[k] ?? { types: ALL_ACTIVITY_TYPES, see_amounts: true };
      return {
        ...prev,
        activity_roles: {
          ...prev.activity_roles,
          [k]: { ...curr, see_amounts: see },
        },
      };
    });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pb: 4, maxWidth: 960 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          {t("activity.settings.title")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("activity.settings.subtitle")}
        </Typography>
      </Box>

      {savedMsg && (
        <Alert severity="success" onClose={() => setSavedMsg(null)}>
          {savedMsg}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Tabs
          value={TABS.indexOf(activeTab)}
          onChange={(_, idx) =>
            navigate({
              to: "/settings/activity" as any,
              search: { tab: TABS[idx] } as any,
              replace: true,
            })
          }
          variant="scrollable"
          scrollButtons="auto"
          sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 700 } }}
        >
          <Tab label={t("activity.settings.tabReasons")} />
          <Tab label={t("activity.settings.tabThresholds")} />
          <Tab label={t("activity.settings.tabRoles")} />
          <Tab label={t("activity.settings.tabReviewTags")} />
        </Tabs>
      </Paper>

      {/* 1. Reason Lists */}
      {activeTab === "reasons" && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {REASON_LISTS.map((listKey) => (
              <Chip
                key={listKey}
                clickable
                label={t(`activity.settings.list_${listKey}`)}
                color={selectedList === listKey ? "warning" : "default"}
                variant={selectedList === listKey ? "filled" : "outlined"}
                onClick={() => setSelectedList(listKey)}
                sx={{ fontWeight: 700 }}
              />
            ))}
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            {listItems.map((item, idx) => {
              const isOther = item.key === "other";
              return (
                <Box
                  key={item.key}
                  sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}
                >
                  <TextField
                    size="small"
                    label={t("activity.settings.labelEn")}
                    value={item.label_en}
                    onChange={(e) => updateReasonItem(idx, { label_en: e.target.value })}
                    sx={{ flex: "1 1 180px" }}
                  />
                  <TextField
                    size="small"
                    label={t("activity.settings.labelSi")}
                    value={item.label_si}
                    onChange={(e) => updateReasonItem(idx, { label_si: e.target.value })}
                    sx={{ flex: "1 1 180px" }}
                  />
                  <Switch
                    checked={isOther ? true : item.active}
                    disabled={isOther}
                    onChange={(e) => updateReasonItem(idx, { active: e.target.checked })}
                    slotProps={{ input: { "aria-label": `${item.label_en} active` } }}
                  />
                  {!isOther && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeReasonItem(idx)}
                      aria-label={t("common.delete")}
                    >
                      <DeleteOutlinedIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              );
            })}
          </Box>

          <Divider />

          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <TextField
              size="small"
              label={t("activity.settings.newReasonEn")}
              value={newReasonEn}
              onChange={(e) => setNewReasonEn(e.target.value)}
              sx={{ flex: "1 1 180px" }}
            />
            <TextField
              size="small"
              label={t("activity.settings.newReasonSi")}
              value={newReasonSi}
              onChange={(e) => setNewReasonSi(e.target.value)}
              sx={{ flex: "1 1 180px" }}
            />
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addReasonItem}
              disabled={!newReasonEn.trim()}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              {t("common.add")}
            </Button>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              disableElevation
              disabled={updateSettings.isPending}
              onClick={() => handleSave({ reasons: draft.reasons })}
              sx={{ textTransform: "none", fontWeight: 800 }}
            >
              {t("common.save")}
            </Button>
          </Box>
        </Paper>
      )}

      {/* 2. Activity Thresholds */}
      {activeTab === "thresholds" && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <TextField
              size="small"
              type="number"
              label={t("activity.settings.discountHighPct")}
              value={draft.activity.discountHighPct}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  activity: { ...p.activity, discountHighPct: Number(e.target.value) || 0 },
                }))
              }
              slotProps={{ htmlInput: { min: 0, style: { fontVariantNumeric: "tabular-nums" } } }}
            />
            <TextField
              size="small"
              type="number"
              label={t("activity.settings.discountHighAmount")}
              value={draft.activity.discountHighAmount}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  activity: { ...p.activity, discountHighAmount: Number(e.target.value) || 0 },
                }))
              }
              slotProps={{ htmlInput: { min: 0, style: { fontVariantNumeric: "tabular-nums" } } }}
            />
            <TextField
              size="small"
              type="number"
              label={t("activity.settings.backdateHighDays")}
              value={draft.activity.backdateHighDays}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  activity: { ...p.activity, backdateHighDays: Number(e.target.value) || 0 },
                }))
              }
              slotProps={{ htmlInput: { min: 0, style: { fontVariantNumeric: "tabular-nums" } } }}
            />
            <TextField
              size="small"
              type="number"
              label={t("activity.settings.refundHighAmount")}
              value={draft.activity.refundHighAmount}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  activity: { ...p.activity, refundHighAmount: Number(e.target.value) || 0 },
                }))
              }
              slotProps={{ htmlInput: { min: 0, style: { fontVariantNumeric: "tabular-nums" } } }}
            />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              disableElevation
              disabled={updateSettings.isPending}
              onClick={() => handleSave({ activity: draft.activity })}
              sx={{ textTransform: "none", fontWeight: 800 }}
            >
              {t("common.save")}
            </Button>
          </Box>
        </Paper>
      )}

      {/* 3. Per-role notification types & see amounts */}
      {activeTab === "roles" && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
          {roles.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("activity.settings.noRoles")}
            </Typography>
          ) : (
            roles.map((role) => {
              const policy = draft.activity_roles[String(role.role_id)] ?? {
                types: ALL_ACTIVITY_TYPES,
                see_amounts: true,
              };
              return (
                <Box
                  key={role.role_id}
                  sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {role.role_name}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {t("activity.settings.seeAmounts")}
                      </Typography>
                      <Switch
                        size="small"
                        checked={policy.see_amounts}
                        onChange={(e) => toggleRoleAmounts(role.role_id, e.target.checked)}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                    {ALL_ACTIVITY_TYPES.map((tp) => {
                      const active = policy.types.includes(tp);
                      const meta = ACTIVITY_TYPE_META[tp];
                      return (
                        <Chip
                          key={tp}
                          size="small"
                          clickable
                          label={t(meta.labelKey)}
                          color={active ? "primary" : "default"}
                          variant={active ? "filled" : "outlined"}
                          onClick={() => toggleRoleType(role.role_id, tp)}
                          sx={{ fontWeight: 600 }}
                        />
                      );
                    })}
                  </Box>
                </Box>
              );
            })
          )}
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              disableElevation
              disabled={updateSettings.isPending}
              onClick={() => handleSave({ activity_roles: draft.activity_roles })}
              sx={{ textTransform: "none", fontWeight: 800 }}
            >
              {t("common.save")}
            </Button>
          </Box>
        </Paper>
      )}

      {/* 4. Review Tags */}
      {activeTab === "review_tags" && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
          {(["positive", "negative"] as const).map((tone) => (
            <Box key={tone} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {tone === "positive"
                  ? t("activity.settings.positiveTags")
                  : t("activity.settings.negativeTags")}
              </Typography>
              {(draft.review_tags[tone] ?? []).map((tag, idx) => (
                <Box key={tag.key} sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                  <TextField
                    size="small"
                    label={t("activity.settings.labelEn")}
                    value={tag.label_en}
                    onChange={(e) => {
                      setDraft((prev) => {
                        const list = [...prev.review_tags[tone]];
                        list[idx] = { ...list[idx], label_en: e.target.value };
                        return { ...prev, review_tags: { ...prev.review_tags, [tone]: list } };
                      });
                    }}
                    sx={{ flex: "1 1 180px" }}
                  />
                  <TextField
                    size="small"
                    label={t("activity.settings.labelSi")}
                    value={tag.label_si}
                    onChange={(e) => {
                      setDraft((prev) => {
                        const list = [...prev.review_tags[tone]];
                        list[idx] = { ...list[idx], label_si: e.target.value };
                        return { ...prev, review_tags: { ...prev.review_tags, [tone]: list } };
                      });
                    }}
                    sx={{ flex: "1 1 180px" }}
                  />
                  <Switch
                    checked={tag.active}
                    onChange={(e) => {
                      setDraft((prev) => {
                        const list = [...prev.review_tags[tone]];
                        list[idx] = { ...list[idx], active: e.target.checked };
                        return { ...prev, review_tags: { ...prev.review_tags, [tone]: list } };
                      });
                    }}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      setDraft((prev) => ({
                        ...prev,
                        review_tags: {
                          ...prev.review_tags,
                          [tone]: prev.review_tags[tone].filter((_, i) => i !== idx),
                        },
                      }));
                    }}
                  >
                    <DeleteOutlinedIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          ))}

          <Divider />

          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <Chip
              size="small"
              clickable
              label={t("activity.settings.positiveTags")}
              color={newTagTone === "positive" ? "success" : "default"}
              onClick={() => setNewTagTone("positive")}
            />
            <Chip
              size="small"
              clickable
              label={t("activity.settings.negativeTags")}
              color={newTagTone === "negative" ? "error" : "default"}
              onClick={() => setNewTagTone("negative")}
            />
            <TextField
              size="small"
              label={t("activity.settings.newReasonEn")}
              value={newTagEn}
              onChange={(e) => setNewTagEn(e.target.value)}
              sx={{ flex: "1 1 160px" }}
            />
            <TextField
              size="small"
              label={t("activity.settings.newReasonSi")}
              value={newTagSi}
              onChange={(e) => setNewTagSi(e.target.value)}
              sx={{ flex: "1 1 160px" }}
            />
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              disabled={!newTagEn.trim()}
              onClick={() => {
                const en = newTagEn.trim();
                if (!en) return;
                const key = en.toLowerCase().replace(/[^a-z0-9]+/g, "_") || `tag_${Date.now()}`;
                setDraft((prev) => ({
                  ...prev,
                  review_tags: {
                    ...prev.review_tags,
                    [newTagTone]: [
                      ...prev.review_tags[newTagTone],
                      { key, label_en: en, label_si: newTagSi.trim() || en, active: true },
                    ],
                  },
                }));
                setNewTagEn("");
                setNewTagSi("");
              }}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              {t("common.add")}
            </Button>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              disableElevation
              disabled={updateSettings.isPending}
              onClick={() => handleSave({ review_tags: draft.review_tags })}
              sx={{ textTransform: "none", fontWeight: 800 }}
            >
              {t("common.save")}
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
