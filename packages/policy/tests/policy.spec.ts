import { describe, expect, it } from 'vitest';

import {
  buildTokenValidationPolicy,
  getAcceptedTokenSigningKeyIds,
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

    const policyDefinition = buildTokenValidationPolicy({
      issuer: 'https://iam.local/realms/core-users',
      audiences: ['host-shell', 'gateway', 'host-shell'],
    });
    expect('signingKeys' in policyDefinition).toBe(false);
  });

  it('normalizes signing key rollover policy fields', () => {
    expect(
      buildTokenValidationPolicy({
        issuer: 'https://iam.local/realms/core-users',
        audiences: 'host-shell',
        signingKeys: {
          activeKeyId: '  CORE-USERS-SIGNING-V1  ',
          nextKeyId: 'Core-Users-Signing-V2',
          dualKeyValidationWindow: {
            startsAtEpochSeconds: 1_700_000_000,
            endsAtEpochSeconds: 1_700_086_400,
          },
        },
      }),
    ).toEqual({
      issuer: 'https://iam.local/realms/core-users',
      audiences: ['host-shell'],
      clockSkewSeconds: 60,
      signingKeys: {
        activeKeyId: 'core-users-signing-v1',
        nextKeyId: 'core-users-signing-v2',
        dualKeyValidationWindow: {
          startsAtEpochSeconds: 1_700_000_000,
          endsAtEpochSeconds: 1_700_086_400,
        },
      },
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

  it('rejects signing key rollover policy with duplicate active and next key ids', () => {
    expect(() =>
      buildTokenValidationPolicy({
        issuer: 'https://iam.local/realms/core-users',
        audiences: 'host-shell',
        signingKeys: {
          activeKeyId: 'core-users-signing-v1',
          nextKeyId: 'core-users-signing-v1',
          dualKeyValidationWindow: {
            startsAtEpochSeconds: 1,
            endsAtEpochSeconds: 2,
          },
        },
      }),
    ).toThrow(
      'Token validation policy signing key ids must be distinct between activeKeyId and nextKeyId.',
    );
  });

  it('rejects signing key rollover policy when next key id is missing but rollover window is provided', () => {
    expect(() =>
      buildTokenValidationPolicy({
        issuer: 'https://iam.local/realms/core-users',
        audiences: 'host-shell',
        signingKeys: {
          activeKeyId: 'core-users-signing-v1',
          dualKeyValidationWindow: {
            startsAtEpochSeconds: 1,
            endsAtEpochSeconds: 2,
          },
        },
      }),
    ).toThrow(
      'Token validation policy signingKeys.dualKeyValidationWindow requires signingKeys.nextKeyId.',
    );
  });

  it('rejects signing key rollover policy when next key id is provided without rollover window', () => {
    expect(() =>
      buildTokenValidationPolicy({
        issuer: 'https://iam.local/realms/core-users',
        audiences: 'host-shell',
        signingKeys: {
          activeKeyId: 'core-users-signing-v1',
          nextKeyId: 'core-users-signing-v2',
        },
      }),
    ).toThrow(
      'Token validation policy signingKeys.nextKeyId requires signingKeys.dualKeyValidationWindow.',
    );
  });

  it('rejects invalid rollover window bounds', () => {
    expect(() =>
      buildTokenValidationPolicy({
        issuer: 'https://iam.local/realms/core-users',
        audiences: 'host-shell',
        signingKeys: {
          activeKeyId: 'core-users-signing-v1',
          nextKeyId: 'core-users-signing-v2',
          dualKeyValidationWindow: {
            startsAtEpochSeconds: 10,
            endsAtEpochSeconds: 10,
          },
        },
      }),
    ).toThrow(
      'Token validation policy dualKeyValidationWindow startsAtEpochSeconds must be less than endsAtEpochSeconds.',
    );
  });
});

describe('getAcceptedTokenSigningKeyIds', () => {
  const rolloverPolicy = buildTokenValidationPolicy({
    issuer: 'https://iam.local/realms/core-users',
    audiences: 'host-shell',
    signingKeys: {
      activeKeyId: 'core-users-signing-v1',
      nextKeyId: 'core-users-signing-v2',
      dualKeyValidationWindow: {
        startsAtEpochSeconds: 700,
        endsAtEpochSeconds: 760,
      },
    },
  });

  it('returns only active key before rollover window starts', () => {
    expect(getAcceptedTokenSigningKeyIds(rolloverPolicy, 699)).toEqual([
      'core-users-signing-v1',
    ]);
  });

  it('returns active and next key ids during rollover window', () => {
    expect(getAcceptedTokenSigningKeyIds(rolloverPolicy, 730)).toEqual([
      'core-users-signing-v1',
      'core-users-signing-v2',
    ]);
  });

  it('returns only next key after rollover window ends', () => {
    expect(getAcceptedTokenSigningKeyIds(rolloverPolicy, 761)).toEqual([
      'core-users-signing-v2',
    ]);
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

  it('requires token key id when signing key policy is configured', () => {
    const keyPolicy = buildTokenValidationPolicy({
      issuer: 'https://iam.local/realms/core-users',
      audiences: 'host-shell',
      signingKeys: {
        activeKeyId: 'core-users-signing-v1',
      },
    });

    const result = validateTokenClaimsAgainstPolicy(
      {
        iss: 'https://iam.local/realms/core-users',
        aud: 'host-shell',
        exp: 600,
      },
      keyPolicy,
      570,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Token is missing required key id (kid header).',
    );
  });

  it('accepts tokenKeyId as preferred key id input', () => {
    const keyPolicy = buildTokenValidationPolicy({
      issuer: 'https://iam.local/realms/core-users',
      audiences: 'host-shell',
      signingKeys: {
        activeKeyId: 'core-users-signing-v1',
      },
    });

    const result = validateTokenClaimsAgainstPolicy(
      {
        iss: 'https://iam.local/realms/core-users',
        aud: 'host-shell',
        exp: 600,
        tokenKeyId: 'core-users-signing-v1',
      },
      keyPolicy,
      570,
    );

    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('accepts active key before rollover starts', () => {
    const keyPolicy = buildTokenValidationPolicy({
      issuer: 'https://iam.local/realms/core-users',
      audiences: 'host-shell',
      signingKeys: {
        activeKeyId: 'core-users-signing-v1',
        nextKeyId: 'core-users-signing-v2',
        dualKeyValidationWindow: {
          startsAtEpochSeconds: 700,
          endsAtEpochSeconds: 760,
        },
      },
    });

    const result = validateTokenClaimsAgainstPolicy(
      {
        iss: 'https://iam.local/realms/core-users',
        aud: 'host-shell',
        exp: 900,
        kid: 'core-users-signing-v1',
      },
      keyPolicy,
      650,
    );

    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('accepts next key during dual key validation window', () => {
    const keyPolicy = buildTokenValidationPolicy({
      issuer: 'https://iam.local/realms/core-users',
      audiences: 'host-shell',
      signingKeys: {
        activeKeyId: 'core-users-signing-v1',
        nextKeyId: 'core-users-signing-v2',
        dualKeyValidationWindow: {
          startsAtEpochSeconds: 700,
          endsAtEpochSeconds: 760,
        },
      },
    });

    const result = validateTokenClaimsAgainstPolicy(
      {
        iss: 'https://iam.local/realms/core-users',
        aud: 'host-shell',
        exp: 900,
        kid: 'core-users-signing-v2',
      },
      keyPolicy,
      730,
    );

    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('rejects active key after rollover window closes', () => {
    const keyPolicy = buildTokenValidationPolicy({
      issuer: 'https://iam.local/realms/core-users',
      audiences: 'host-shell',
      signingKeys: {
        activeKeyId: 'core-users-signing-v1',
        nextKeyId: 'core-users-signing-v2',
        dualKeyValidationWindow: {
          startsAtEpochSeconds: 700,
          endsAtEpochSeconds: 760,
        },
      },
    });

    const result = validateTokenClaimsAgainstPolicy(
      {
        iss: 'https://iam.local/realms/core-users',
        aud: 'host-shell',
        exp: 900,
        kid: 'core-users-signing-v1',
      },
      keyPolicy,
      761,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Token signing key mismatch. Expected one of [core-users-signing-v2], received kid "core-users-signing-v1".',
    );
  });
});
