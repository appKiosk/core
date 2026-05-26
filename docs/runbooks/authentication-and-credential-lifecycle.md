# Authentication and Credential Lifecycle Runbook

This runbook defines how core services and plugin administration clients are authenticated, how credentials and signing keys are rotated, and how token validation is enforced.

Use this guide for local development and as the operational baseline for higher environments.

## Scope

This runbook covers:

- Keycloak realm and client lifecycle for user and service identities.
- Service credential secret storage and rotation.
- Token validation baseline (issuer, audience, expiry, signing key identity).
- Plugin metadata signing key rollover lifecycle.
- Verification checkpoints and rollback actions.

This runbook does not replace architecture decisions; it operationalizes them.
See:

- `docs/architecture/adrs/ADR-0004-multi-tenant-auth-and-keycloak.md`
- `docs/architecture/adrs/ADR-0008-plugin-metadata-integrity-and-identity.md`
- `infra/keycloak/README.md`

## Identity Model Summary

- User tokens are issued by the `core-users` realm.
- Service and plugin-admin client credentials are managed in the `core-services` realm.
- Gateway and downstream policy enforcement validate token issuer, audience, and expiry.
- Plugin metadata validation enforces active signing key and optional staged next key via `kid`.

## Prerequisites

Before any auth/credential operation:

1. Ensure `.env` exists from `.env.example` and contains required Keycloak values.
2. Confirm local Keycloak is reachable.
3. Confirm migration assets are current in `infra/keycloak/migrations`.

Primary local commands:

```bash
npm run dev:keycloak:up
npm run dev:keycloak:logs
npm run dev:keycloak:migrate
npm run dev:keycloak:down
```

## Client Provisioning Lifecycle

### Standard Client ID Patterns

- User realm UI client: `core-<environment>-host-shell`
- Core service clients: `core-<environment>-<service>`
- Plugin administration clients: `core-<environment>-plugin-admin-<pluginId>`

### Provisioning Steps

1. Add or update the appropriate Keycloak migration file in `infra/keycloak/migrations`.
2. Ensure confidential clients use environment-sourced secrets only (never commit secret values).
3. Run `npm run dev:keycloak:migrate`.
4. Verify the expected client appears in the target realm and can request tokens.

### Deprovisioning Steps

1. Remove deprecated clients from the latest migration input.
2. Re-run `npm run dev:keycloak:migrate`.
3. Confirm stale clients are removed and no active consumers remain.

## Service Credential Secret Lifecycle

Service credentials are mapped by client ID and resolved by environment variables.

Active secret:

- `KEYCLOAK_CLIENT_SECRET_<CLIENT_ID_SUFFIX>`

Optional staged rotation secret:

- `KEYCLOAK_CLIENT_SECRET_NEXT_<CLIENT_ID_SUFFIX>`

Fallback for the default client:

- `CORE_KEYCLOAK_CLIENT_SECRET` for `CORE_KEYCLOAK_CLIENT_ID`

### Rotation Procedure (No Downtime)

1. Keep the current secret in `KEYCLOAK_CLIENT_SECRET_<...>`.
2. Stage replacement in `KEYCLOAK_CLIENT_SECRET_NEXT_<...>`.
3. Run `npm run dev:keycloak:migrate` to configure overlap.
4. Roll all client consumers to the replacement secret.
5. Promote replacement by moving it to `KEYCLOAK_CLIENT_SECRET_<...>` and clearing `_NEXT_...`.
6. Run `npm run dev:keycloak:migrate` again to remove overlap.

### Verification Checklist

- Both old and new credentials authenticate during overlap.
- Only replacement credential authenticates after promotion.
- Rotated secret is cleared once overlap is closed.

### Rollback

If replacement breaks clients during overlap:

1. Keep old credential in active variable.
2. Remove staged replacement (`_NEXT_...`).
3. Run `npm run dev:keycloak:migrate`.
4. Re-test authentication and retry rotation with corrected consumer rollout.

## Token Validation Lifecycle

Policy validation baseline:

- Issuer (`iss`) must match configured trust source.
- Audience (`aud`) must include expected audience value.
- Expiry (`exp`) is required.
- Token is rejected when `exp + clockSkew < now`.
- Signing key ID (`kid`) must map to active key or staged next key during rollover.

### Validation Drift Checks

Run these checks whenever auth-related realm, audience, issuer, or signing config changes:

1. Execute policy tests:

```bash
npm exec nx run @org/policy:test
```

2. Confirm auth/signing fixture scenarios remain green:

- issuer mismatch rejection
- audience mismatch rejection
- expiry-required and expiry-window rejection
- active/next signing key acceptance and unknown-key rejection

Fixture entry points:

- `packages/policy/src/lib/auth-signing-integration-fixtures.ts`
- `packages/policy/tests/auth-signing-integration-fixtures.spec.ts`

## Plugin Metadata Signing Key Lifecycle

Signing keys are environment-sourced and must not be committed.

Variables by key ID suffix:

- Active private/public pair:
  - `PLUGIN_METADATA_SIGNING_PRIVATE_KEY_<KEY_ID_SUFFIX>`
  - `PLUGIN_METADATA_SIGNING_PUBLIC_KEY_<KEY_ID_SUFFIX>`
- Staged next private/public pair:
  - `PLUGIN_METADATA_SIGNING_PRIVATE_KEY_NEXT_<KEY_ID_SUFFIX>`
  - `PLUGIN_METADATA_SIGNING_PUBLIC_KEY_NEXT_<KEY_ID_SUFFIX>`

### Key Rollover Procedure

1. Keep active key pair set.
2. Stage next key pair with `_NEXT_...` variables.
3. Deploy validators that trust both active and next public keys.
4. Switch signing to the next private key.
5. Verify metadata signatures validate with expected `kid`.
6. Promote next key pair to active names and clear `_NEXT_...` values.

### Rollback

If validation failures appear after signer switch:

1. Revert signer to previous active private key.
2. Keep dual validation enabled until all producers/consumers are consistent.
3. Investigate key distribution and `kid` mapping before retrying.

## Change Management Checklist

For any authentication, credential, or signing change:

1. Update migration or configuration source of truth.
2. Apply in local/dev first.
3. Run impacted validation (`npm exec nx run @org/policy:test` minimum for policy-impacting changes).
4. Document rollout/rollback notes in the change record.
5. Confirm no secrets were committed.

## Incident Triage Quick Steps

When authentication fails unexpectedly:

1. Verify Keycloak availability and migration logs.
2. Confirm client ID and realm mapping.
3. Confirm active and next secret variables are set as intended.
4. Re-run migration to reconcile secrets.
5. Validate token issuer/audience/expiry/kid against policy expectations.
6. Run policy fixtures to isolate validation rule regressions.

## Ownership

- Identity and policy maintainers own this runbook.
- Update this document whenever auth, secret, or signing lifecycle behavior changes.
