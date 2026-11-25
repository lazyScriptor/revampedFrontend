import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PaymentsIcon from "@mui/icons-material/Payments";
import ReplayIcon from "@mui/icons-material/Replay";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import HistoryToggleOffIcon from "@mui/icons-material/HistoryToggleOff";
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturn";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import BadgeIcon from "@mui/icons-material/Badge";
import StarIcon from "@mui/icons-material/Star";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import PhoneMissedIcon from "@mui/icons-material/PhoneMissed";
import RestoreIcon from "@mui/icons-material/Restore";
import type { ActivityEventType } from "../types";

export function ActivityTypeIcon({
  type,
  fontSize = "small",
}: {
  type: ActivityEventType;
  fontSize?: "small" | "medium" | "inherit";
}) {
  switch (type) {
    case "invoice_created":
      return <ReceiptLongIcon fontSize={fontSize} />;
    case "payment":
    case "customer_payment":
      return <PaymentsIcon fontSize={fontSize} />;
    case "refund":
      return <ReplayIcon fontSize={fontSize} />;
    case "discount":
      return <LocalOfferIcon fontSize={fontSize} />;
    case "backdated_payment":
    case "backdated_bill":
    case "backdated_return":
      return <HistoryToggleOffIcon fontSize={fontSize} />;
    case "return":
      return <AssignmentReturnIcon fontSize={fontSize} />;
    case "payment_voided":
    case "invoice_deleted":
      return <DeleteOutlinedIcon fontSize={fontSize} />;
    case "invoice_restored":
      return <RestoreIcon fontSize={fontSize} />;
    case "invoice_reopened":
      return <LockOpenIcon fontSize={fontSize} />;
    case "id_card_released_unpaid":
      return <BadgeIcon fontSize={fontSize} />;
    case "review":
      return <StarIcon fontSize={fontSize} />;
    case "call_promise_missed":
      return <PhoneMissedIcon fontSize={fontSize} />;
    case "system":
    default:
      return <SettingsSuggestIcon fontSize={fontSize} />;
  }
}
