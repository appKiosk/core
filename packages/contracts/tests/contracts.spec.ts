import { describe, expect, it } from 'vitest';

import {
  buildCoreServiceClientId,
  buildCoreUserClientId,
  buildPluginAdminClientId,
  ContractsError,
  ValidationContractsError,
} from '../src/index.js';

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

  it('builds environment-specific core client ids', () => {
    expect(buildCoreUserClientId('local')).toBe('core-local-host-shell');
    expect(buildCoreServiceClientId('dev', 'gateway')).toBe('core-dev-gateway');
    expect(buildCoreServiceClientId('staging', 'registry')).toBe(
      'core-staging-registry',
    );
  });

  it('builds plugin admin client ids for client-credentials use cases', () => {
    expect(buildPluginAdminClientId('prod', 'iam')).toBe(
      'core-prod-plugin-admin-iam',
    );
    expect(buildPluginAdminClientId('local', 'account-management')).toBe(
      'core-local-plugin-admin-account-management',
    );
  });

  it('rejects invalid plugin ids in plugin admin client ids', () => {
    expect(() => buildPluginAdminClientId('local', 'IAM Service')).toThrow(
      'Plugin id must contain only lowercase letters, numbers, and hyphens.',
    );
  });
});
