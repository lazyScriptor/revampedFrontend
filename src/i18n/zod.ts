import i18n from "@/i18n";

/**
 * Lazy zod error message. Schemas are built once at import, so a plain string
 * would freeze the language; zod calls this function on every validation.
 *
 *     z.string().min(1, zt("validation.emailRequired"))
 */
export const zt = (key: string) => ({ error: () => i18n.t(key) as string });
