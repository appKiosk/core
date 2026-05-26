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

  it('rejects negative clock skew values', () => {
    expect(() =>
      buildTokenValidationPolicy({
        issuer: 'https://iam.local/realms/core-users',
        audiences: 'host-shell',
        clockSkewSeconds: -1,
      }),
    ).toThrow(
      'Token validation policy clockSkewSeconds must be a non-negative integer.',
    );
  });

  it('rejects non-integer clock skew values', () => {
    expect(() =>
      buildTokenValidationPolicy({
        issuer: 'https://iam.local/realms/core-users',
        audiences: 'host-shell',
        clockSkewSeconds: 0.5,
      }),
    ).toThrow(
      'Token validation policy clockSkewSeconds must be a non-negative integer.',
    );
  });

  it('rejects clock skew values above max bound', () => {
    expect(() =>
      buildTokenValidationPolicy({
        issuer: 'https://iam.local/realms/core-users',
        audiences: 'host-shell',
        clockSkewSeconds: 301,
      }),
    ).toThrow(
      'Token validation policy clockSkewSeconds must be less than or equal to 300.',
    );
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
      'Token audience mismatch. Expected one of [host-shell, gateway], received raw aud claim ["registry"] (normalized ["registry"]).',
    );
  });

  it('reports missing aud claim', () => {
    const result = validateTokenClaimsAgainstPolicy(
      {
        iss: 'https://iam.local/realms/core-users',
        exp: 600,
      },
      policyDefinition,
      570,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Token is missing required aud claim.');
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

  it('reports malformed exp string values', () => {
    const result = validateTokenClaimsAgainstPolicy(
      {
        iss: 'https://iam.local/realms/core-users',
        aud: 'host-shell',
        exp: '600',
      },
      policyDefinition,
      570,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Token exp claim must be a finite numeric timestamp.',
    );
  });

  it('reports non-finite exp values', () => {
    const result = validateTokenClaimsAgainstPolicy(
      {
        iss: 'https://iam.local/realms/core-users',
        aud: 'host-shell',
        exp: Number.NaN,
      },
      policyDefinition,
      570,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Token exp claim must be a finite numeric timestamp.',
    );
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
