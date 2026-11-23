import { useQuery } from "@tanstack/react-query";
import { fetchRetailSettings } from "../api/retail.api";
import { DEFAULT_RETAIL_SETTINGS } from "../api/types";
import { useRetailEnabled } from "../useRetailEnabled";

export const RETAIL_SETTINGS_KEY = ["retail", "settings"] as const;

export const useRetailSettings = () => {
  const enabled = useRetailEnabled();
  const q = useQuery({
    queryKey: RETAIL_SETTINGS_KEY,
    queryFn: fetchRetailSettings,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
  return { settings: q.data ?? DEFAULT_RETAIL_SETTINGS, isLoading: q.isLoading, isLoaded: q.isSuccess };
};
