import { describe, expect, it } from 'vitest';

import { validation } from '../src/index.js';

describe('validation', () => {
  it('returns package identifier', () => {
    expect(validation()).toBe('validation');
  });
});
