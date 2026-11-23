import { useOverlay } from "@/components/overlay";
import { useRetailEnabled } from "@/features/retail/useRetailEnabled";
import { COMMAND_BAR_ID } from "./CommandBar";
import { ShortcutHost } from "./ShortcutHost";
import { useShortcut } from "./shortcuts";

/** Ctrl/Cmd+K and the other shortcuts. Mounted once in the signed-in layout; renders nothing. */
export function CommandBarHost() {
  const enabled = useRetailEnabled();
  const overlay = useOverlay();
  useShortcut("command-bar", () => overlay.open(COMMAND_BAR_ID), enabled);
  return enabled ? <ShortcutHost /> : null;
}
