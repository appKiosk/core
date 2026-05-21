import { describe, expect, it } from 'vitest';

import { hostShell } from '../src/index.js';

describe('host-shell', () => {
  it('returns package identifier', () => {
    expect(hostShell()).toBe('host-shell');
  });
});
