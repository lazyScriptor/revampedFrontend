import type { ComponentType } from "react";
import type { SvgIconProps } from "@mui/material";
import ConstructionIcon from "@mui/icons-material/Construction";
import HardwareIcon from "@mui/icons-material/Hardware";
import PlumbingIcon from "@mui/icons-material/Plumbing";
import ElectricalServicesIcon from "@mui/icons-material/ElectricalServices";
import FormatPaintIcon from "@mui/icons-material/FormatPaint";
import HandymanIcon from "@mui/icons-material/Handyman";
import BuildIcon from "@mui/icons-material/Build";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import GrassIcon from "@mui/icons-material/Grass";
import LockIcon from "@mui/icons-material/Lock";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import CategoryIcon from "@mui/icons-material/Category";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import CableIcon from "@mui/icons-material/Cable";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import LayersIcon from "@mui/icons-material/Layers";
import StraightenIcon from "@mui/icons-material/Straighten";
import CarpenterIcon from "@mui/icons-material/Carpenter";
import RoofingIcon from "@mui/icons-material/Roofing";
import FenceIcon from "@mui/icons-material/Fence";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import FoundationIcon from "@mui/icons-material/Foundation";
import BoltIcon from "@mui/icons-material/Bolt";
import ColorLensIcon from "@mui/icons-material/ColorLens";
import WindowIcon from "@mui/icons-material/Window";
import ScienceIcon from "@mui/icons-material/Science";
import TuneIcon from "@mui/icons-material/Tune";
import BrushIcon from "@mui/icons-material/Brush";

/** The icons a category can use. Names are stored on the category (`icon`), so keep them stable. */
export const CATEGORY_ICONS: Record<string, ComponentType<SvgIconProps>> = {
  Construction: ConstructionIcon,
  Hardware: HardwareIcon,
  Plumbing: PlumbingIcon,
  ElectricalServices: ElectricalServicesIcon,
  FormatPaint: FormatPaintIcon,
  Handyman: HandymanIcon,
  Build: BuildIcon,
  PowerSettingsNew: PowerSettingsNewIcon,
  Grass: GrassIcon,
  Lock: LockIcon,
  HealthAndSafety: HealthAndSafetyIcon,
  Category: CategoryIcon,
  Inventory2: Inventory2Icon,
  Cable: CableIcon,
  Lightbulb: LightbulbIcon,
  WaterDrop: WaterDropIcon,
  Layers: LayersIcon,
  Straighten: StraightenIcon,
  Carpenter: CarpenterIcon,
  Roofing: RoofingIcon,
  Fence: FenceIcon,
  CleaningServices: CleaningServicesIcon,
  Foundation: FoundationIcon,
  Bolt: BoltIcon,
  ColorLens: ColorLensIcon,
  Window: WindowIcon,
  Science: ScienceIcon,
  Tune: TuneIcon,
  Brush: BrushIcon,
};

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);

/** A category's icon by its stored name; an unknown or empty name shows the generic one. */
export function CatIcon({ name, ...props }: { name?: string | null } & Omit<SvgIconProps, "name">) {
  const Icon = (name && CATEGORY_ICONS[name]) || CategoryIcon;
  return <Icon {...props} />;
}
