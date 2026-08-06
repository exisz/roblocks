import { describe, it } from 'vitest';
import YAML from 'yaml';
import { StoreSchema } from './types';

describe('shared store YAML', () => {
  it('validates without depending on a private credential checkout', () => {
    const raw = `
service_token:
  value: secret-placeholder
  account: production
api_key: another-placeholder
`;
    const parsed = YAML.parse(raw);
    StoreSchema.parse(parsed);
  });
});
