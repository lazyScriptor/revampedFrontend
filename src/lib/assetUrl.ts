// Files the API stores (equipment photos, signatures, logos) come back as
// "/uploads/…" paths on the API host, while stock images are full URLs or
// paths on this app. Resolve the former against the API origin.
export const resolveAssetUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (!url.startsWith("/uploads/")) return url;
  const apiBase = (import.meta.env.VITE_API_URL as string | undefined) || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return origin ? `${origin}${url}` : url;
};
