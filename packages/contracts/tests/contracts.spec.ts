import { describe, expect, it } from 'vitest';

import { ContractsError, ValidationContractsError } from '../src/index.js';

describe('contracts', () => {
  it('exposes error shape fields', () => {
    const error = new ContractsError('BROKEN', 'Something failed', 503, {
      service: 'registry',
    });

    expect(error.code).toBe('BROKEN');
    expect(error.message).toBe('Something failed');
    expect(error.status).toBe(503);
    expect(error.details).toEqual({ service: 'registry' });
  });

  it('applies validation defaults', () => {
    const error = new ValidationContractsError('Invalid payload');

    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.status).toBe(400);
    expect(error.name).toBe('ValidationContractsError');
  });
});
