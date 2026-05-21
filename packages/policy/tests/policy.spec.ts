import { describe, expect, it } from 'vitest';

import { policy } from '../src/index.js';

describe('policy', () => {
  it('returns package identifier', () => {
    expect(policy()).toBe('policy');
  });
});
