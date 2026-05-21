import { describe, expect, it } from 'vitest';

import { entitlement } from '../src/index.js';

describe('entitlement', () => {
  it('returns package identifier', () => {
    expect(entitlement()).toBe('entitlement');
  });
});
