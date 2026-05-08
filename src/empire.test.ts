import { describe, it } from 'vitest';
import YAML from 'yaml';
import fs from 'fs';
import { StoreSchema } from './types';

describe('empire.yaml', () => {
  it('validates', () => {
    const raw = fs.readFileSync('/Users/c/.openclaw/.tmp-credentials/stores/empire.yaml', 'utf-8');
    const parsed = YAML.parse(raw);
    StoreSchema.parse(parsed);
  });
});
