export interface TokenValidationPolicyInput {
  issuer: string;
  audiences: string | string[];
  clockSkewSeconds?: number;
}

export interface TokenValidationPolicy {
  issuer: string;
  audiences: string[];
  clockSkewSeconds: number;
}

export interface JwtLikeClaims {
  iss?: unknown;
  aud?: unknown;
  exp?: unknown;
}

export interface TokenValidationResult {
  valid: boolean;
  errors: string[];
}

const DEFAULT_CLOCK_SKEW_SECONDS = 60;
const MAX_CLOCK_SKEW_SECONDS = 300;

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
  return {
    issuer: normalizeIssuer(input.issuer),
    audiences: normalizeAudiences(input.audiences),
    clockSkewSeconds: normalizeClockSkew(input.clockSkewSeconds),
  };
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

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function policy(): string {
  return 'policy';
}
