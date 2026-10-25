import AgricultureIcon from "@mui/icons-material/Agriculture";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import ConstructionIcon from "@mui/icons-material/Construction";
import ElectricBoltIcon from "@mui/icons-material/ElectricBolt";
import FormatPaintIcon from "@mui/icons-material/FormatPaint";
import FoundationIcon from "@mui/icons-material/Foundation";
import GrassIcon from "@mui/icons-material/Grass";
import HandymanIcon from "@mui/icons-material/Handyman";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import PlumbingIcon from "@mui/icons-material/Plumbing";
import StairsIcon from "@mui/icons-material/Stairs";

type IconType = typeof ConstructionIcon;

// Keyword → icon. First match wins, so the more specific families come first.
const ICON_RULES: Array<[RegExp, IconType]> = [
  [/ladder|scaffold|stair/, StairsIcon],
  [/helmet|safety|harness|barrier|cone|glove|goggle/, HealthAndSafetyIcon],
  [/generator|weld|electric|inverter|battery/, ElectricBoltIcon],
  [/compressor|pump|pipe|plumb|thread/, PlumbingIcon],
  [/excavator|roller|tiller|loader|tractor/, AgricultureIcon],
  [/mixer|concrete|vibrator|compactor|breaker/, FoundationIcon],
  [/mower|grass|trimmer|hedge|blower|chainsaw|garden/, GrassIcon],
  [/paint|spray|putty/, FormatPaintIcon],
  [/vacuum|clean|wash/, CleaningServicesIcon],
  [/drill|hammer|grinder|saw|cutter|router|sander|driver|screw|chisel|polish|planer/, HandymanIcon],
];

export const equipmentIcon = (...labels: Array<string | null | undefined>): IconType => {
  const text = labels.filter(Boolean).join(" ").toLowerCase();
  const hit = ICON_RULES.find(([re]) => re.test(text));
  return hit ? hit[1] : ConstructionIcon;
};

// Soft pastel pairs [background, foreground] for the no-photo placeholder, so a
// grid of un-photographed machines still reads as varied tiles, not a grey wall.
const TINTS: Array<[string, string]> = [
  ["#dbeafe", "#2563eb"],
  ["#dcfce7", "#15803d"],
  ["#fef3c7", "#b45309"],
  ["#ede9fe", "#6d28d9"],
  ["#ffe4e6", "#be123c"],
  ["#ccfbf1", "#0f766e"],
];

export const equipmentTint = (seed: string | number): [string, string] => {
  const s = String(seed);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
};

export type StockLevel = "out" | "low" | "ok";

export const stockLevel = (available: number): StockLevel => (available <= 0 ? "out" : available <= 2 ? "low" : "ok");
