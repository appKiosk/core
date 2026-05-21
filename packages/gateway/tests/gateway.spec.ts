import { describe, expect, it } from 'vitest';

import { gateway } from '../src/index.js';

describe('gateway', () => {
  it('returns package identifier', () => {
    expect(gateway()).toBe('gateway');
  });
});
