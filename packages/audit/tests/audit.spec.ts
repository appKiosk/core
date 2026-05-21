import { describe, expect, it } from 'vitest';

import { audit } from '../src/index.js';

describe('audit', () => {
  it('returns package identifier', () => {
    expect(audit()).toBe('audit');
  });
});
