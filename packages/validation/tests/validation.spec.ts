import { describe, expect, it } from 'vitest';

import {
  buildPluginMetadataSigningKeyPlan,
  buildServiceCredentialSecretPlan,
  generatePluginMetadataSigningKeyPair,
  buildRealmMigrationPlan,
  parseRealmMigrationFileName,
  validation,
} from '../src/index.js';

describe('validation', () => {
  it('returns package identifier', () => {
    expect(validation()).toBe('validation');
  });
});

describe('parseRealmMigrationFileName', () => {
  it('parses migration order and name', () => {
    expect(parseRealmMigrationFileName('001-core-users.realm.json')).toEqual({
      order: 1,
      name: 'core-users',
    });
  });

  it('rejects invalid migration names', () => {
    expect(() => parseRealmMigrationFileName('core-users.json')).toThrow(
      'Invalid migration file name',
    );
  });
});

describe('buildRealmMigrationPlan', () => {
  it('sorts plan entries by migration order', () => {
    const plan = buildRealmMigrationPlan([
      {
        filePath: 'infra/keycloak/migrations/002-core-services.realm.json',
        realm: 'core-services',
      },
      {
        filePath: 'infra/keycloak/migrations/001-core-users.realm.json',
        realm: 'core-users',
      },
    ]);

    expect(plan.map((item) => item.fileName)).toEqual([
      '001-core-users.realm.json',
      '002-core-services.realm.json',
    ]);
  });

  it('supports Windows-style migration paths', () => {
    const plan = buildRealmMigrationPlan([
      {
        filePath: 'infra\\keycloak\\migrations\\001-core-users.realm.json',
        realm: 'core-users',
      },
    ]);

    expect(plan[0]?.fileName).toBe('001-core-users.realm.json');
  });

  it('rejects duplicate migration orders', () => {
    expect(() =>
      buildRealmMigrationPlan([
        {
          filePath: 'infra/keycloak/migrations/001-core-users.realm.json',
          realm: 'core-users',
        },
        {
          filePath: 'infra/keycloak/migrations/001-core-services.realm.json',
          realm: 'core-services',
        },
      ]),
    ).toThrow('Duplicate migration order detected: 1.');
  });

  it('rejects duplicate realms', () => {
    expect(() =>
      buildRealmMigrationPlan([
        {
          filePath: 'infra/keycloak/migrations/001-core-users.realm.json',
          realm: 'core-users',
        },
        {
          filePath: 'infra/keycloak/migrations/002-core-users.realm.json',
          realm: 'core-users',
        },
      ]),
    ).toThrow('Duplicate realm migration detected for realm "core-users".');
  });

  it('rejects filename and realm mismatches', () => {
    expect(() =>
      buildRealmMigrationPlan([
        {
          filePath: 'infra/keycloak/migrations/001-core-users.realm.json',
          realm: 'core-services',
        },
      ]),
    ).toThrow(
      'Realm mismatch for migration "001-core-users.realm.json": expected "core-users", received "core-services".',
    );
  });
});

describe('buildServiceCredentialSecretPlan', () => {
  it('builds active and next secret env var names for each service client', () => {
    expect(
      buildServiceCredentialSecretPlan([
        { clientId: 'core-local-gateway' },
        { clientId: 'core-local-plugin-admin-iam' },
      ]),
    ).toEqual([
      {
        clientId: 'core-local-gateway',
        activeSecretEnvVar: 'KEYCLOAK_CLIENT_SECRET_CORE_LOCAL_GATEWAY',
        nextSecretEnvVar: 'KEYCLOAK_CLIENT_SECRET_NEXT_CORE_LOCAL_GATEWAY',
      },
      {
        clientId: 'core-local-plugin-admin-iam',
        activeSecretEnvVar:
          'KEYCLOAK_CLIENT_SECRET_CORE_LOCAL_PLUGIN_ADMIN_IAM',
        nextSecretEnvVar:
          'KEYCLOAK_CLIENT_SECRET_NEXT_CORE_LOCAL_PLUGIN_ADMIN_IAM',
      },
    ]);
  });

  it('normalizes client ids before building plan entries', () => {
    expect(
      buildServiceCredentialSecretPlan([
        { clientId: '  CORE-LOCAL-GATEWAY  ' },
      ]),
    ).toEqual([
      {
        clientId: 'core-local-gateway',
        activeSecretEnvVar: 'KEYCLOAK_CLIENT_SECRET_CORE_LOCAL_GATEWAY',
        nextSecretEnvVar: 'KEYCLOAK_CLIENT_SECRET_NEXT_CORE_LOCAL_GATEWAY',
      },
    ]);
  });

  it('rejects duplicate normalized client ids', () => {
    expect(() =>
      buildServiceCredentialSecretPlan([
        { clientId: 'core-local-gateway' },
        { clientId: 'CORE-LOCAL-GATEWAY' },
      ]),
    ).toThrow(
      'Duplicate service credential client id detected: "core-local-gateway".',
    );
  });

  it('rejects invalid client ids', () => {
    expect(() =>
      buildServiceCredentialSecretPlan([{ clientId: 'core local gateway' }]),
    ).toThrow(
      'Invalid client id "core local gateway". Expected lowercase letters, numbers, and hyphens.',
    );
  });
});

describe('buildPluginMetadataSigningKeyPlan', () => {
  it('builds active and next signing key env var names', () => {
    expect(
      buildPluginMetadataSigningKeyPlan([
        { keyId: 'core-local-plugin-metadata-v1' },
      ]),
    ).toEqual([
      {
        keyId: 'core-local-plugin-metadata-v1',
        algorithm: 'ed25519',
        activePrivateKeyEnvVar:
          'PLUGIN_METADATA_SIGNING_PRIVATE_KEY_CORE_LOCAL_PLUGIN_METADATA_V1',
        activePublicKeyEnvVar:
          'PLUGIN_METADATA_SIGNING_PUBLIC_KEY_CORE_LOCAL_PLUGIN_METADATA_V1',
        nextPrivateKeyEnvVar:
          'PLUGIN_METADATA_SIGNING_PRIVATE_KEY_NEXT_CORE_LOCAL_PLUGIN_METADATA_V1',
        nextPublicKeyEnvVar:
          'PLUGIN_METADATA_SIGNING_PUBLIC_KEY_NEXT_CORE_LOCAL_PLUGIN_METADATA_V1',
      },
    ]);
  });

  it('normalizes key ids before building plan entries', () => {
    expect(
      buildPluginMetadataSigningKeyPlan([
        { keyId: '  CORE-LOCAL-PLUGIN-METADATA-V1  ' },
      ]),
    ).toEqual([
      {
        keyId: 'core-local-plugin-metadata-v1',
        algorithm: 'ed25519',
        activePrivateKeyEnvVar:
          'PLUGIN_METADATA_SIGNING_PRIVATE_KEY_CORE_LOCAL_PLUGIN_METADATA_V1',
        activePublicKeyEnvVar:
          'PLUGIN_METADATA_SIGNING_PUBLIC_KEY_CORE_LOCAL_PLUGIN_METADATA_V1',
        nextPrivateKeyEnvVar:
          'PLUGIN_METADATA_SIGNING_PRIVATE_KEY_NEXT_CORE_LOCAL_PLUGIN_METADATA_V1',
        nextPublicKeyEnvVar:
          'PLUGIN_METADATA_SIGNING_PUBLIC_KEY_NEXT_CORE_LOCAL_PLUGIN_METADATA_V1',
      },
    ]);
  });

  it('rejects duplicate normalized key ids', () => {
    expect(() =>
      buildPluginMetadataSigningKeyPlan([
        { keyId: 'core-local-plugin-metadata-v1' },
        { keyId: 'CORE-LOCAL-PLUGIN-METADATA-V1' },
      ]),
    ).toThrow(
      'Duplicate plugin metadata signing key id detected: "core-local-plugin-metadata-v1".',
    );
  });

  it('rejects invalid key ids', () => {
    expect(() =>
      buildPluginMetadataSigningKeyPlan([
        { keyId: 'core local plugin metadata v1' },
      ]),
    ).toThrow(
      'Invalid signing key id "core local plugin metadata v1". Expected lowercase letters, numbers, and hyphens.',
    );
  });
});

describe('generatePluginMetadataSigningKeyPair', () => {
  it('generates an ed25519 key pair as PEM strings', () => {
    const keyPair = generatePluginMetadataSigningKeyPair({
      keyId: 'core-local-plugin-metadata-v1',
    });

    expect(keyPair.keyId).toBe('core-local-plugin-metadata-v1');
    expect(keyPair.algorithm).toBe('ed25519');
    expect(keyPair.privateKeyPem).toContain('BEGIN PRIVATE KEY');
    expect(keyPair.publicKeyPem).toContain('BEGIN PUBLIC KEY');
  });

  it('rejects invalid key ids during key generation', () => {
    expect(() =>
      generatePluginMetadataSigningKeyPair({
        keyId: 'Core Local Plugin Metadata V1',
      }),
    ).toThrow(
      'Invalid signing key id "Core Local Plugin Metadata V1". Expected lowercase letters, numbers, and hyphens.',
    );
  });
});
