/**
 * Marks a translation key at module level without translating it yet.
 *
 * Module-level constants (filter presets, status maps, tab lists) are
 * evaluated once at import, so calling t() there would freeze the language.
 * Store the key with tk() and translate where it is rendered:
 *
 *     const PRESETS = [{ value: "today", label: tk("filters.today") }];
 *     ...
 *     <Chip label={t(preset.label)} />
 *
 * `npm run i18n:extract` also picks these keys up, so they get translated.
 */
export const tk = <K extends string>(key: K): K => key;

/** Translate the `label` of option lists built with tk(): <Filter options={tOptions(t, OPTIONS)} /> */
export const tOptions = <T extends { label: string }>(
  t: (key: string) => string,
  options: readonly T[],
): T[] => options.map((o) => ({ ...o, label: t(o.label) }));
