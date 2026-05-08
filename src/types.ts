import { z } from 'zod';

// Level 2: scalar string or object with required `value`
const Level2Value = z.union([
  z.string(),
  z.object({
    value: z.string(),
  }).catchall(z.unknown()),
]);

// Level 1: scalar or list of Level2
const Level1Value = z.union([
  Level2Value,
  z.array(Level2Value),
]);

// The entire store = map of Level1
export const StoreSchema = z.record(Level1Value);

export type Store = z.infer<typeof StoreSchema>;
export type Level1Value = z.infer<typeof Level1Value>;
export type Level2Value = z.infer<typeof Level2Value>;

// Store registry config
export const StoreConfigSchema = z.object({
  repo: z.string(),
  file: z.string(),
  branch: z.string().default('main'),
});

export const RegistrySchema = z.object({
  stores: z.record(StoreConfigSchema),
});

export type StoreConfig = z.infer<typeof StoreConfigSchema>;
export type Registry = z.infer<typeof RegistrySchema>;

// Compound value with metadata (convenience type)
export interface CompoundValue {
  value: string;
  [key: string]: unknown;
}

export function isCompoundValue(v: Level2Value): v is CompoundValue {
  return typeof v === 'object' && v !== null && 'value' in v;
}

export function getValueString(v: Level2Value): string {
  if (isCompoundValue(v)) return v.value;
  return v;
}
