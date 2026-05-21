import { describe, expect, it } from 'vitest';

import {
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
          filePath:
            'infra/keycloak/migrations/002-core-users-update.realm.json',
          realm: 'core-users',
        },
      ]),
    ).toThrow('Duplicate realm migration detected for realm "core-users".');
  });
});
