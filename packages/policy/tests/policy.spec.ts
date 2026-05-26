import { describe, expect, it } from 'vitest';

import {
  buildTokenValidationPolicy,
  policy,
  validateTokenClaimsAgainstPolicy,
} from '../src/index.js';

describe('policy', () => {
  it('returns package identifier', () => {
    expect(policy()).toBe('policy');
  });
});

describe('buildTokenValidationPolicy', () => {
  it('normalizes issuer and audiences and applies defaults', () => {
    expect(
      buildTokenValidationPolicy({
        issuer: '  https://iam.local/realms/core-users  ',
        audiences: ['host-shell', 'gateway', 'host-shell'],
      }),
    ).toEqual({
      issuer: 'https://iam.local/realms/core-users',
      audiences: ['host-shell', 'gateway'],
      clockSkewSeconds: 60,
      requireExpiration: true,
    });
  });

  it('rejects empty issuer values', () => {
    expect(() =>
      buildTokenValidationPolicy({
        issuer: '   ',
        audiences: 'host-shell',
      }),
    ).toThrow('Token validation policy issuer is required.');
  });

  it('rejects disabling expiration requirements', () => {
    expect(() =>
      buildTokenValidationPolicy({
        issuer: 'https://iam.local/realms/core-users',
        audiences: 'host-shell',
        requireExpiration: false,
      }),
    ).toThrow('Token validation policy must require expiry via the exp claim.');
  });
});

describe('validateTokenClaimsAgainstPolicy', () => {
  const policyDefinition = buildTokenValidationPolicy({
    issuer: 'https://iam.local/realms/core-users',
    audiences: ['host-shell', 'gateway'],
    clockSkewSeconds: 30,
  });

  it('accepts claims that satisfy issuer, audience, and expiry requirements', () => {
    const result = validateTokenClaimsAgainstPolicy(
      {
        iss: 'https://iam.local/realms/core-users',
        aud: 'host-shell',
        exp: 600,
      },
      policyDefinition,
      570,
    );

    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('accepts non-expired tokens inside configured clock skew', () => {
    const result = validateTokenClaimsAgainstPolicy(
      {
        iss: 'https://iam.local/realms/core-users',
        aud: ['gateway'],
        exp: 600,
      },
      policyDefinition,
      625,
    );

    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('reports issuer mismatch', () => {
    const result = validateTokenClaimsAgainstPolicy(
      {
        iss: 'https://iam.local/realms/core-services',
        aud: 'host-shell',
        exp: 600,
      },
      policyDefinition,
      570,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Token issuer mismatch. Expected "https://iam.local/realms/core-users", received "https://iam.local/realms/core-services".',
    );
  });

  it('reports audience mismatch', () => {
    const result = validateTokenClaimsAgainstPolicy(
      {
        iss: 'https://iam.local/realms/core-users',
        aud: ['registry'],
        exp: 600,
      },
      policyDefinition,
      570,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Token audience mismatch. Expected one of [host-shell, gateway], received ["registry"].',
    );
  });

  it('reports missing exp claim', () => {
    const result = validateTokenClaimsAgainstPolicy(
      {
        iss: 'https://iam.local/realms/core-users',
        aud: 'host-shell',
      },
      policyDefinition,
      570,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Token is missing required exp claim.');
  });

  it('reports expired tokens outside configured clock skew', () => {
    const result = validateTokenClaimsAgainstPolicy(
      {
        iss: 'https://iam.local/realms/core-users',
        aud: 'host-shell',
        exp: 600,
      },
      policyDefinition,
      631,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Token is expired.');
  });
});
