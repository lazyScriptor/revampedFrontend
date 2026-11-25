import i18n from "@/i18n";

type Bilingual = { en?: string; si?: string };
type EventLike = { type?: string; sentence?: unknown; data?: Record<string, any> | null };

const pick = (value: unknown, isSi: boolean): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const b = value as Bilingual;
    return (isSi ? b.si || b.en : b.en || b.si) || "";
  }
  return "";
};

/** One-line text for an activity event. The server sends `sentence` as { en, si }; never render the object. */
export const eventSentence = (ev: EventLike, fallback = ""): string => {
  const isSi = Boolean(i18n.language?.startsWith("si"));
  return (
    pick(ev.sentence, isSi) ||
    pick(isSi ? ev.data?.sentence_si : ev.data?.sentence_en, isSi) ||
    pick(ev.data?.sentence, isSi) ||
    fallback ||
    ev.type ||
    ""
  );
};
