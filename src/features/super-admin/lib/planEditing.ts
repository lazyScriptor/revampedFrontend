// The console's plan editor, as plain functions. The server applies the same rules when saving.
export interface PlanFeature {
  key: string;
  requires?: string;
}
export interface PlanGroup {
  key: string;
  features: PlanFeature[];
}
export interface Plan {
  price: number | null;
  limits: Record<string, number | null>;
  features: Record<string, boolean>;
}
export type Plans = Record<string, Plan>;
export interface PlansData {
  tiers: string[];
  groups: PlanGroup[];
  limit_keys: string[];
  plans: Plans;
  version: number;
  updated_at: string | null;
}

const allFeatures = (groups: PlanGroup[]) => groups.flatMap((g) => g.features);

/** Turning a feature on brings what it needs; turning one off takes what needs it. */
export const setFeature = (plans: Plans, tier: string, key: string, on: boolean, groups: PlanGroup[]): Plans => {
  const features = { ...plans[tier].features, [key]: on };
  const all = allFeatures(groups);
  if (on) {
    const needs = all.find((f) => f.key === key)?.requires;
    if (needs) features[needs] = true;
  } else {
    for (const f of all) if (f.requires === key) features[f.key] = false;
  }
  return { ...plans, [tier]: { ...plans[tier], features } };
};

export const setGroup = (plans: Plans, tier: string, group: PlanGroup, on: boolean, groups: PlanGroup[]): Plans =>
  group.features.reduce((next, f) => setFeature(next, tier, f.key, on, groups), plans);

export const groupState = (plan: Plan, group: PlanGroup) => {
  const on = group.features.filter((f) => plan.features[f.key]).length;
  return { on, total: group.features.length, all: on === group.features.length, none: on === 0 };
};

/** Blank is unlimited; otherwise a whole number of at least 1. */
export const limitFromText = (text: string): number | null | undefined => {
  const t = text.trim();
  if (t === "") return null;
  return /^\d+$/.test(t) && Number(t) >= 1 ? Number(t) : undefined;
};
export const priceFromText = (text: string): number | null | undefined => {
  const t = text.trim();
  if (t === "") return null;
  return /^\d+(\.\d{1,2})?$/.test(t) ? Number(t) : undefined;
};

export type PlanChange =
  | { kind: "feature"; tier: string; key: string; on: boolean }
  | { kind: "limit"; tier: string; key: string; from: number | null; to: number | null }
  | { kind: "price"; tier: string; from: number | null; to: number | null };

export const diffPlans = (before: Plans, after: Plans, data: Pick<PlansData, "tiers" | "groups" | "limit_keys">): PlanChange[] => {
  const out: PlanChange[] = [];
  for (const tier of data.tiers) {
    if (before[tier].price !== after[tier].price) out.push({ kind: "price", tier, from: before[tier].price, to: after[tier].price });
    for (const key of data.limit_keys) {
      if (before[tier].limits[key] !== after[tier].limits[key]) out.push({ kind: "limit", tier, key, from: before[tier].limits[key], to: after[tier].limits[key] });
    }
    for (const { key } of allFeatures(data.groups)) {
      if (before[tier].features[key] !== after[tier].features[key]) out.push({ kind: "feature", tier, key, on: after[tier].features[key] });
    }
  }
  return out;
};

// ── per-shop exceptions ──
export interface PlanOverrides {
  features?: Record<string, boolean>;
  limits?: Record<string, number | null>;
}

export const setOverride = (o: PlanOverrides | undefined, key: string, value: boolean | undefined): PlanOverrides => {
  const features = { ...o?.features };
  if (value === undefined) delete features[key];
  else features[key] = value;
  return { ...o, features };
};
export const setLimitOverride = (o: PlanOverrides | undefined, key: string, value: number | null | undefined): PlanOverrides => {
  const limits = { ...o?.limits };
  if (value === undefined) delete limits[key];
  else limits[key] = value;
  return { ...o, limits };
};
export const countOverrides = (o: PlanOverrides | undefined) => Object.keys(o?.features ?? {}).length + Object.keys(o?.limits ?? {}).length;

/** What a shop would get with these exceptions: same result as the server's effectivePlan. */
export const effectiveFeatures = (plan: Plan, o: PlanOverrides | undefined, groups: PlanGroup[]) => {
  const features = { ...plan.features, ...o?.features };
  for (const f of allFeatures(groups)) if (f.requires && !features[f.requires]) features[f.key] = false;
  return features;
};
