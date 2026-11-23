import { useUiPreference } from "./useUiPreference";

export type Density = "compact" | "comfortable";

// Row heights for new retail tables (plan §7.0: 32-36 px compact). Existing DataGrids are not
// restyled; a grid opts in by reading `rowHeight`.
export const DENSITY_ROW_HEIGHT: Record<Density, number> = { compact: 34, comfortable: 48 };

export function useDensity() {
  const pref = useUiPreference<Density>("density", "compact");
  const density: Density = pref.value === "comfortable" ? "comfortable" : "compact";
  return {
    density,
    setDensity: pref.set,
    resetDensity: pref.reset,
    rowHeight: DENSITY_ROW_HEIGHT[density],
    /** Spacing multiplier for padding in new components. */
    pad: density === "compact" ? 0.75 : 1.5,
  };
}
