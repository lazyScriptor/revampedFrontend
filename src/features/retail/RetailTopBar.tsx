import { Badge, IconButton, Tooltip } from "@mui/material";
import RoomServiceOutlinedIcon from "@mui/icons-material/RoomServiceOutlined";
import SearchIcon from "@mui/icons-material/Search";
import { useTranslation } from "react-i18next";
import { useOverlay } from "@/components/overlay";
import { COMMAND_BAR_ID } from "@/components/command/CommandBar";
import { formatCombo } from "@/components/command/shortcuts";
import { useRetailEnabled } from "./useRetailEnabled";
import { MANAGER_DESK_ID } from "./desk/ManagerDesk";
import { useWaitingCount } from "./desk/useDesk";
import { RetailCatalogHost } from "./catalog/RetailCatalogHost";

/** Top-bar additions for retail shops: the command bar button and the manager desk badge. */
export function RetailTopBar() {
  const { t } = useTranslation();
  const retail = useRetailEnabled();
  const { open } = useOverlay();
  const desk = useWaitingCount();
  if (!retail) return null;
  return (
    <>
      <RetailCatalogHost />
      <Tooltip title={`${t("command.title")} (${formatCombo("Mod+K")})`}>
        <IconButton size="small" onClick={() => open(COMMAND_BAR_ID)} aria-label={t("command.title")} sx={{ width: 40, height: 40 }}>
          <SearchIcon />
        </IconButton>
      </Tooltip>
      {desk.enabled && (
        <Tooltip title={t("desk.title")}>
          <IconButton size="small" onClick={() => open(MANAGER_DESK_ID)} aria-label={t("desk.title")} sx={{ width: 40, height: 40 }}>
            <Badge badgeContent={desk.count} color="error" max={99} sx={{ "& .MuiBadge-badge": { fontVariantNumeric: "tabular-nums" } }}>
              <RoomServiceOutlinedIcon />
            </Badge>
          </IconButton>
        </Tooltip>
      )}
    </>
  );
}
