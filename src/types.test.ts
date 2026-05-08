import { describe, it, expect } from 'vitest';
import { StoreSchema, isCompoundValue, getValueString } from './types';

describe('StoreSchema', () => {
  it('accepts simple string values', () => {
    const result = StoreSchema.safeParse({ openai_api_key: 'sk-xxx' });
    expect(result.success).toBe(true);
  });

  it('accepts compound values with required value field', () => {
    const result = StoreSchema.safeParse({
      stripe_secret: { value: 'sk_live_xxx', expiry: '2026-12-01' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts list of strings', () => {
    const result = StoreSchema.safeParse({
      github_bots: ['ghp_xxx', 'ghp_yyy'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts list of compound objects', () => {
    const result = StoreSchema.safeParse({
      github_bots: [
        { value: 'ghp_xxx', username: 'bot-001' },
        { value: 'ghp_yyy', username: 'bot-002' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects nested objects beyond level 2', () => {
    const result = StoreSchema.safeParse({
      bad_key: {
        nested: { value: 'foo' },
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects lists nested within objects', () => {
    const result = StoreSchema.safeParse({
      bad_key: [{ nested_list: ['a', 'b'] }],
    });
    expect(result.success).toBe(false);
  });
});

describe('isCompoundValue', () => {
  it('returns false for strings', () => {
    expect(isCompoundValue('foo')).toBe(false);
  });

  it('returns true for objects with value', () => {
    expect(isCompoundValue({ value: 'foo', tag: 'bar' })).toBe(true);
  });
});
