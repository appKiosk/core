import { describe, expect, it } from 'vitest';

import {
  buildClientSecretEnvVarName,
  buildCoreServiceClientId,
  buildCoreUserClientId,
  buildPluginMetadataSigningKeyEnvVarName,
  buildPluginMetadataSigningKeyReferences,
  buildPluginAdminClientId,
  buildServiceCredentialSecretReferences,
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

  it('builds active and next secret env var names for service credentials', () => {
    expect(buildClientSecretEnvVarName('core-local-gateway')).toBe(
      'KEYCLOAK_CLIENT_SECRET_CORE_LOCAL_GATEWAY',
    );
    expect(buildClientSecretEnvVarName('core-local-gateway', 'next')).toBe(
      'KEYCLOAK_CLIENT_SECRET_NEXT_CORE_LOCAL_GATEWAY',
    );
  });

  it('builds service credential secret references for rotation flow', () => {
    expect(
      buildServiceCredentialSecretReferences('core-local-plugin-admin-iam'),
    ).toEqual([
      {
        clientId: 'core-local-plugin-admin-iam',
        stage: 'active',
        envVarName: 'KEYCLOAK_CLIENT_SECRET_CORE_LOCAL_PLUGIN_ADMIN_IAM',
      },
      {
        clientId: 'core-local-plugin-admin-iam',
        stage: 'next',
        envVarName: 'KEYCLOAK_CLIENT_SECRET_NEXT_CORE_LOCAL_PLUGIN_ADMIN_IAM',
      },
    ]);
  });

  it('normalizes client id in service credential secret references', () => {
    expect(
      buildServiceCredentialSecretReferences('  CORE-LOCAL-PLUGIN-ADMIN-IAM  '),
    ).toEqual([
      {
        clientId: 'core-local-plugin-admin-iam',
        stage: 'active',
        envVarName: 'KEYCLOAK_CLIENT_SECRET_CORE_LOCAL_PLUGIN_ADMIN_IAM',
      },
      {
        clientId: 'core-local-plugin-admin-iam',
        stage: 'next',
        envVarName: 'KEYCLOAK_CLIENT_SECRET_NEXT_CORE_LOCAL_PLUGIN_ADMIN_IAM',
      },
    ]);
  });

  it('rejects invalid client ids in secret env var names', () => {
    expect(() => buildClientSecretEnvVarName('Core Local Gateway')).toThrow(
      'Client id must contain only lowercase letters, numbers, and hyphens.',
    );
  });

  it('builds active and next signing key env var names', () => {
    expect(
      buildPluginMetadataSigningKeyEnvVarName(
        'core-local-plugin-metadata-v1',
        'private',
      ),
    ).toBe('PLUGIN_METADATA_SIGNING_PRIVATE_KEY_CORE_LOCAL_PLUGIN_METADATA_V1');
    expect(
      buildPluginMetadataSigningKeyEnvVarName(
        'core-local-plugin-metadata-v1',
        'public',
        'next',
      ),
    ).toBe(
      'PLUGIN_METADATA_SIGNING_PUBLIC_KEY_NEXT_CORE_LOCAL_PLUGIN_METADATA_V1',
    );
  });

  it('builds plugin metadata signing key references for active and next stages', () => {
    expect(
      buildPluginMetadataSigningKeyReferences('core-local-plugin-metadata-v1'),
    ).toEqual([
      {
        keyId: 'core-local-plugin-metadata-v1',
        stage: 'active',
        privateKeyEnvVarName:
          'PLUGIN_METADATA_SIGNING_PRIVATE_KEY_CORE_LOCAL_PLUGIN_METADATA_V1',
        publicKeyEnvVarName:
          'PLUGIN_METADATA_SIGNING_PUBLIC_KEY_CORE_LOCAL_PLUGIN_METADATA_V1',
      },
      {
        keyId: 'core-local-plugin-metadata-v1',
        stage: 'next',
        privateKeyEnvVarName:
          'PLUGIN_METADATA_SIGNING_PRIVATE_KEY_NEXT_CORE_LOCAL_PLUGIN_METADATA_V1',
        publicKeyEnvVarName:
          'PLUGIN_METADATA_SIGNING_PUBLIC_KEY_NEXT_CORE_LOCAL_PLUGIN_METADATA_V1',
      },
    ]);
  });

  it('rejects invalid signing key ids in env var names', () => {
    expect(() =>
      buildPluginMetadataSigningKeyEnvVarName(
        'Core Local Plugin Metadata V1',
        'private',
      ),
    ).toThrow(
      'Signing key id must contain only lowercase letters, numbers, and hyphens.',
    );
  });
});
