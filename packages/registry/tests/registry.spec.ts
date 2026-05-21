import { describe, expect, it } from 'vitest';

import { registry } from '../src/index.js';

describe('registry', () => {
  it('returns package identifier', () => {
    expect(registry()).toBe('registry');
  });
});
