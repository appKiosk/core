export interface TokenValidationPolicyInput {
  issuer: string;
  audiences: string | string[];
  clockSkewSeconds?: number;
  signingKeys?: TokenSigningKeyPolicyInput;
}

export interface TokenValidationPolicy {
  issuer: string;
  audiences: string[];
  clockSkewSeconds: number;
  signingKeys?: TokenSigningKeyPolicy;
}

export interface TokenSigningKeyRolloverWindowInput {
  startsAtEpochSeconds: number;
  endsAtEpochSeconds: number;
}

export interface TokenSigningKeyPolicyInput {
  activeKeyId: string;
  nextKeyId?: string;
  dualKeyValidationWindow?: TokenSigningKeyRolloverWindowInput;
}

export interface TokenSigningKeyRolloverWindow {
  startsAtEpochSeconds: number;
  endsAtEpochSeconds: number;
}

export interface TokenSigningKeyPolicy {
  activeKeyId: string;
  nextKeyId?: string;
  dualKeyValidationWindow?: TokenSigningKeyRolloverWindow;
}

export interface JwtLikeClaims {
  iss?: unknown;
  aud?: unknown;
  exp?: unknown;
  tokenKeyId?: unknown;
  // Backward-compatibility alias for callers already passing JWT header `kid` on this object.
  kid?: unknown;
}

export interface TokenValidationResult {
  valid: boolean;
  errors: string[];
}

const DEFAULT_CLOCK_SKEW_SECONDS = 60;
const MAX_CLOCK_SKEW_SECONDS = 300;
const KEY_ID_PATTERN = /^[a-z0-9-]+$/;

function normalizeIssuer(issuer: string): string {
  const normalizedIssuer = issuer.trim();

  if (!normalizedIssuer) {
    throw new Error('Token validation policy issuer is required.');
  }

  return normalizedIssuer;
}

function normalizeAudiences(audiences: string | string[]): string[] {
  const sourceAudiences = Array.isArray(audiences) ? audiences : [audiences];
  const normalizedAudiences = sourceAudiences.map((audience) =>
    audience.trim(),
  );

  if (normalizedAudiences.some((audience) => audience.length === 0)) {
    throw new Error(
      'Token validation policy audiences must contain non-empty values.',
    );
  }

  const uniqueAudiences = Array.from(new Set(normalizedAudiences));

  if (uniqueAudiences.length === 0) {
    throw new Error(
      'Token validation policy must define at least one audience.',
    );
  }

  return uniqueAudiences;
}

function normalizeClockSkew(clockSkewSeconds: number | undefined): number {
  if (clockSkewSeconds === undefined) {
    return DEFAULT_CLOCK_SKEW_SECONDS;
  }

  if (!Number.isInteger(clockSkewSeconds) || clockSkewSeconds < 0) {
    throw new Error(
      'Token validation policy clockSkewSeconds must be a non-negative integer.',
    );
  }

  if (clockSkewSeconds > MAX_CLOCK_SKEW_SECONDS) {
    throw new Error(
      `Token validation policy clockSkewSeconds must be less than or equal to ${String(MAX_CLOCK_SKEW_SECONDS)}.`,
    );
  }

  return clockSkewSeconds;
}

function normalizeSigningKeyId(keyId: string, fieldName: string): string {
  const normalizedKeyId = keyId.trim().toLowerCase();

  if (!normalizedKeyId) {
    throw new Error(`Token validation policy ${fieldName} is required.`);
  }

  if (!KEY_ID_PATTERN.test(normalizedKeyId)) {
    throw new Error(
      `Token validation policy ${fieldName} must contain only lowercase letters, numbers, and hyphens.`,
    );
  }

  return normalizedKeyId;
}

function normalizeRolloverWindow(
  window: TokenSigningKeyRolloverWindowInput,
): TokenSigningKeyRolloverWindow {
  if (
    !Number.isInteger(window.startsAtEpochSeconds) ||
    !Number.isInteger(window.endsAtEpochSeconds) ||
    window.startsAtEpochSeconds < 0 ||
    window.endsAtEpochSeconds < 0
  ) {
    throw new Error(
      'Token validation policy dualKeyValidationWindow bounds must be non-negative integers.',
    );
  }

  if (window.startsAtEpochSeconds >= window.endsAtEpochSeconds) {
    throw new Error(
      'Token validation policy dualKeyValidationWindow startsAtEpochSeconds must be less than endsAtEpochSeconds.',
    );
  }

  return {
    startsAtEpochSeconds: window.startsAtEpochSeconds,
    endsAtEpochSeconds: window.endsAtEpochSeconds,
  };
}

function normalizeSigningKeyPolicy(
  signingKeys: TokenSigningKeyPolicyInput | undefined,
): TokenSigningKeyPolicy | undefined {
  if (!signingKeys) {
    return undefined;
  }

  const activeKeyId = normalizeSigningKeyId(
    signingKeys.activeKeyId,
    'signingKeys.activeKeyId',
  );

  if (!signingKeys.nextKeyId && signingKeys.dualKeyValidationWindow) {
    throw new Error(
      'Token validation policy signingKeys.dualKeyValidationWindow requires signingKeys.nextKeyId.',
    );
  }

  if (!signingKeys.nextKeyId) {
    return {
      activeKeyId,
    };
  }

  const nextKeyId = normalizeSigningKeyId(
    signingKeys.nextKeyId,
    'signingKeys.nextKeyId',
  );

  if (nextKeyId === activeKeyId) {
    throw new Error(
      'Token validation policy signing key ids must be distinct between activeKeyId and nextKeyId.',
    );
  }

  if (!signingKeys.dualKeyValidationWindow) {
    throw new Error(
      'Token validation policy signingKeys.nextKeyId requires signingKeys.dualKeyValidationWindow.',
    );
  }

  return {
    activeKeyId,
    nextKeyId,
    dualKeyValidationWindow: normalizeRolloverWindow(
      signingKeys.dualKeyValidationWindow,
    ),
  };
}

function extractTokenAudiences(audienceClaim: unknown): string[] {
  if (typeof audienceClaim === 'string') {
    const audience = audienceClaim.trim();
    return audience.length === 0 ? [] : [audience];
  }

  if (!Array.isArray(audienceClaim)) {
    return [];
  }

  return audienceClaim
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function formatAudienceClaim(audienceClaim: unknown): string {
  if (audienceClaim === undefined || audienceClaim === null) {
    return 'undefined';
  }

  return JSON.stringify(audienceClaim);
}

export function buildTokenValidationPolicy(
  input: TokenValidationPolicyInput,
): TokenValidationPolicy {
  const policy: TokenValidationPolicy = {
    issuer: normalizeIssuer(input.issuer),
    audiences: normalizeAudiences(input.audiences),
    clockSkewSeconds: normalizeClockSkew(input.clockSkewSeconds),
  };

  const signingKeys = normalizeSigningKeyPolicy(input.signingKeys);

  if (signingKeys) {
    policy.signingKeys = signingKeys;
  }

  return policy;
}

export function getAcceptedTokenSigningKeyIds(
  policy: TokenValidationPolicy,
  nowEpochSeconds = Math.floor(Date.now() / 1000),
): string[] {
  if (!policy.signingKeys) {
    return [];
  }

  const { activeKeyId, nextKeyId, dualKeyValidationWindow } =
    policy.signingKeys;

  if (!nextKeyId || !dualKeyValidationWindow) {
    return [activeKeyId];
  }

  if (nowEpochSeconds < dualKeyValidationWindow.startsAtEpochSeconds) {
    return [activeKeyId];
  }

  if (nowEpochSeconds <= dualKeyValidationWindow.endsAtEpochSeconds) {
    return [activeKeyId, nextKeyId];
  }

  return [nextKeyId];
}

export function validateTokenClaimsAgainstPolicy(
  claims: JwtLikeClaims,
  policy: TokenValidationPolicy,
  nowEpochSeconds = Math.floor(Date.now() / 1000),
): TokenValidationResult {
  const errors: string[] = [];

  if (claims.iss !== policy.issuer) {
    errors.push(
      `Token issuer mismatch. Expected "${policy.issuer}", received "${String(claims.iss)}".`,
    );
  }

  const tokenAudiences = extractTokenAudiences(claims.aud);
  const hasMatchingAudience = tokenAudiences.some((audience) =>
    policy.audiences.includes(audience),
  );

  if (!hasMatchingAudience) {
    if (claims.aud === undefined || claims.aud === null) {
      errors.push('Token is missing required aud claim.');
    } else {
      errors.push(
        `Token audience mismatch. Expected one of [${policy.audiences.join(', ')}], received raw aud claim ${formatAudienceClaim(claims.aud)} (normalized ${JSON.stringify(tokenAudiences)}).`,
      );
    }
  }

  if (claims.exp === undefined || claims.exp === null) {
    errors.push('Token is missing required exp claim.');
  } else if (typeof claims.exp !== 'number' || !Number.isFinite(claims.exp)) {
    errors.push('Token exp claim must be a finite numeric timestamp.');
  } else if (nowEpochSeconds > claims.exp + policy.clockSkewSeconds) {
    errors.push('Token is expired.');
  }

  if (policy.signingKeys) {
    const tokenKeyId = claims.tokenKeyId ?? claims.kid;

    if (tokenKeyId === undefined || tokenKeyId === null) {
      errors.push('Token is missing required key id (kid header).');
    } else if (
      typeof tokenKeyId !== 'string' ||
      tokenKeyId.trim().length === 0
    ) {
      errors.push('Token key id (kid header) must be a non-empty string.');
    } else {
      const normalizedTokenKid = tokenKeyId.trim().toLowerCase();
      const acceptedKeyIds = getAcceptedTokenSigningKeyIds(
        policy,
        nowEpochSeconds,
      );

      if (!acceptedKeyIds.includes(normalizedTokenKid)) {
        errors.push(
          `Token signing key mismatch. Expected one of [${acceptedKeyIds.join(', ')}], received kid "${normalizedTokenKid}".`,
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function policy(): string {
  return 'policy';
}
