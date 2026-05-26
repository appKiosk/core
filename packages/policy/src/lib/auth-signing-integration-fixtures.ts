import {
  buildTokenValidationPolicy,
  type JwtLikeClaims,
  type TokenValidationPolicy,
  validateTokenClaimsAgainstPolicy,
} from './policy.js';

export interface AuthSigningIntegrationFixtureCase {
  name: string;
  nowEpochSeconds: number;
  claims: JwtLikeClaims;
  expectedValid: boolean;
  expectedErrors?: string[];
}

export interface AuthSigningIntegrationFixture {
  policy: TokenValidationPolicy;
  cases: AuthSigningIntegrationFixtureCase[];
}

export interface AuthSigningIntegrationFixtureEvaluation {
  name: string;
  expectedValid: boolean;
  expectedErrors: string[];
  actualValid: boolean;
  actualErrors: string[];
}

export function buildAuthSigningIntegrationFixture(): AuthSigningIntegrationFixture {
  const policy = buildTokenValidationPolicy({
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

  return {
    policy,
    cases: [
      {
        name: 'accepts active key before rollover window',
        nowEpochSeconds: 699,
        claims: {
          iss: 'https://iam.local/realms/core-users',
          aud: 'host-shell',
          exp: 900,
          kid: 'core-users-signing-v1',
        },
        expectedValid: true,
      },
      {
        name: 'accepts next key during dual-key window',
        nowEpochSeconds: 730,
        claims: {
          iss: 'https://iam.local/realms/core-users',
          aud: ['gateway'],
          exp: 900,
          kid: 'core-users-signing-v2',
        },
        expectedValid: true,
      },
      {
        name: 'rejects old active key after rollover window closes',
        nowEpochSeconds: 761,
        claims: {
          iss: 'https://iam.local/realms/core-users',
          aud: ['host-shell'],
          exp: 900,
          tokenKeyId: 'core-users-signing-v1',
        },
        expectedValid: false,
        expectedErrors: [
          'Token signing key mismatch. Expected one of [core-users-signing-v2], received kid "core-users-signing-v1".',
        ],
      },
      {
        name: 'rejects issuer and audience mismatches',
        nowEpochSeconds: 730,
        claims: {
          iss: 'https://iam.local/realms/core-services',
          aud: ['registry'],
          exp: 900,
          kid: 'core-users-signing-v2',
        },
        expectedValid: false,
        expectedErrors: [
          'Token issuer mismatch. Expected "https://iam.local/realms/core-users", received "https://iam.local/realms/core-services".',
          'Token audience mismatch. Expected one of [host-shell, gateway], received raw aud claim ["registry"] (normalized ["registry"]).',
        ],
      },
      {
        name: 'rejects expired token outside configured clock skew',
        nowEpochSeconds: 931,
        claims: {
          iss: 'https://iam.local/realms/core-users',
          aud: 'host-shell',
          exp: 900,
          kid: 'core-users-signing-v2',
        },
        expectedValid: false,
        expectedErrors: ['Token is expired.'],
      },
    ],
  };
}

export function evaluateAuthSigningIntegrationFixture(
  fixture: AuthSigningIntegrationFixture = buildAuthSigningIntegrationFixture(),
): AuthSigningIntegrationFixtureEvaluation[] {
  return fixture.cases.map((testCase) => {
    const result = validateTokenClaimsAgainstPolicy(
      testCase.claims,
      fixture.policy,
      testCase.nowEpochSeconds,
    );

    return {
      name: testCase.name,
      expectedValid: testCase.expectedValid,
      expectedErrors: testCase.expectedErrors ?? [],
      actualValid: result.valid,
      actualErrors: result.errors,
    };
  });
}
