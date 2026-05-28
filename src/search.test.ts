import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchKeys } from './store';
import type { StoreConfig } from './types';

vi.mock('./git', () => ({
  pullLatest: vi.fn(),
  readStoreFile: vi.fn(),
  writeStoreFile: vi.fn(),
}));

import { pullLatest } from './git';

const config: StoreConfig = { repo: 'owner/repo', file: 'stores/test.yaml', branch: 'main' };

describe('searchKeys', () => {
  beforeEach(() => {
    vi.mocked(pullLatest).mockReset();
  });

  it('returns matching key names without values', () => {
    vi.mocked(pullLatest).mockReturnValue('dokploy: secret-value\ntailscale_api: tskey\n');
    expect(searchKeys(config, 'dok')).toEqual(['dokploy']);
  });

  it('is case-insensitive', () => {
    vi.mocked(pullLatest).mockReturnValue('DOKPLOY_API: secret-value\n');
    expect(searchKeys(config, 'dokploy')).toEqual(['DOKPLOY_API']);
  });

  it('can search non-secret metadata when requested', () => {
    vi.mocked(pullLatest).mockReturnValue('service_token:\n  value: secret-value\n  purpose: dokploy deploys\n');
    expect(searchKeys(config, 'dokploy')).toEqual([]);
    expect(searchKeys(config, 'dokploy', { includeMetadata: true })).toEqual(['service_token']);
  });
});
