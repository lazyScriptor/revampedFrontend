import { Box, Tab, Tabs, Typography } from "@mui/material";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import HistoryIcon from "@mui/icons-material/History";
import TodayIcon from "@mui/icons-material/Today";
import TuneIcon from "@mui/icons-material/Tune";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";

import { HistoryTab } from "@/features/whatsapp/components/HistoryTab";
import { TemplatesTab } from "@/features/whatsapp/components/TemplatesTab";
import { WorklistTab } from "@/features/whatsapp/components/WorklistTab";

export const MESSAGE_TABS = ["today", "templates", "history"] as const;
export type MessageTab = (typeof MESSAGE_TABS)[number];

// Messages: the free WhatsApp hub. Staff press Send in WhatsApp themselves; the system writes
// the message, finds the number, keeps the history and shows who to chase today.
export default function MessagesRoute() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { tab?: MessageTab };
  const tab: MessageTab = MESSAGE_TABS.includes(search.tab as MessageTab) ? (search.tab as MessageTab) : "today";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pb: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: "#25D366", color: "#062b12", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <WhatsAppIcon />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
            {t("whatsapp.page.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("whatsapp.page.subtitle")}
          </Typography>
        </Box>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, next: MessageTab) => navigate({ to: "/messages", search: { tab: next } as any })}
        variant="scrollable"
        scrollButtons="auto"
        aria-label={t("whatsapp.page.title")}
        sx={{ borderBottom: "1px solid", borderColor: "divider", minHeight: 44 }}
      >
        <Tab value="today" icon={<TodayIcon fontSize="small" />} iconPosition="start" label={t("whatsapp.page.tabToday")} sx={{ minHeight: 44, textTransform: "none", fontWeight: 700 }} />
        <Tab value="templates" icon={<TuneIcon fontSize="small" />} iconPosition="start" label={t("whatsapp.page.tabTemplates")} sx={{ minHeight: 44, textTransform: "none", fontWeight: 700 }} />
        <Tab value="history" icon={<HistoryIcon fontSize="small" />} iconPosition="start" label={t("whatsapp.page.tabHistory")} sx={{ minHeight: 44, textTransform: "none", fontWeight: 700 }} />
      </Tabs>

      {tab === "today" && <WorklistTab />}
      {tab === "templates" && <TemplatesTab />}
      {tab === "history" && <HistoryTab />}
    </Box>
  );
}
