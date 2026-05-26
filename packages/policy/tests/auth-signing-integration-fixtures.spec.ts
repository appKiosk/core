import { describe, expect, it } from 'vitest';

import {
  buildAuthSigningIntegrationFixture,
  evaluateAuthSigningIntegrationFixture,
} from '../src/index.js';

describe('auth/signing integration fixtures', () => {
  it('provides a stable fixture policy and scenario count', () => {
    const fixture = buildAuthSigningIntegrationFixture();

    expect(fixture.policy).toEqual({
      issuer: 'https://iam.local/realms/core-users',
      audiences: ['host-shell', 'gateway'],
      clockSkewSeconds: 30,
      signingKeys: {
        activeKeyId: 'core-users-signing-v1',
        nextKeyId: 'core-users-signing-v2',
        dualKeyValidationWindow: {
          startsAtEpochSeconds: 700,
          endsAtEpochSeconds: 760,
        },
      },
    });

    expect(fixture.cases).toHaveLength(5);
    expect(fixture.cases.map((scenario) => scenario.name)).toEqual([
      'accepts active key before rollover window',
      'accepts next key during dual-key window',
      'rejects old active key after rollover window closes',
      'rejects issuer and audience mismatches',
      'rejects expired token outside configured clock skew',
    ]);
  });

  it('evaluates fixture scenarios against token validation policy', () => {
    const evaluations = evaluateAuthSigningIntegrationFixture();

    expect(evaluations).toEqual([
      {
        name: 'accepts active key before rollover window',
        expectedValid: true,
        expectedErrors: [],
        actualValid: true,
        actualErrors: [],
      },
      {
        name: 'accepts next key during dual-key window',
        expectedValid: true,
        expectedErrors: [],
        actualValid: true,
        actualErrors: [],
      },
      {
        name: 'rejects old active key after rollover window closes',
        expectedValid: false,
        expectedErrors: [
          'Token signing key mismatch. Expected one of [core-users-signing-v2], received kid "core-users-signing-v1".',
        ],
        actualValid: false,
        actualErrors: [
          'Token signing key mismatch. Expected one of [core-users-signing-v2], received kid "core-users-signing-v1".',
        ],
      },
      {
        name: 'rejects issuer and audience mismatches',
        expectedValid: false,
        expectedErrors: [
          'Token issuer mismatch. Expected "https://iam.local/realms/core-users", received "https://iam.local/realms/core-services".',
          'Token audience mismatch. Expected one of [host-shell, gateway], received raw aud claim ["registry"] (normalized ["registry"]).',
        ],
        actualValid: false,
        actualErrors: [
          'Token issuer mismatch. Expected "https://iam.local/realms/core-users", received "https://iam.local/realms/core-services".',
          'Token audience mismatch. Expected one of [host-shell, gateway], received raw aud claim ["registry"] (normalized ["registry"]).',
        ],
      },
      {
        name: 'rejects expired token outside configured clock skew',
        expectedValid: false,
        expectedErrors: ['Token is expired.'],
        actualValid: false,
        actualErrors: ['Token is expired.'],
      },
    ]);
  });
});
