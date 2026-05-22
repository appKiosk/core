# ADR-0008: Plugin Identity and Metadata Integrity

## Status

Accepted

## Context

Plugin metadata drives routing, UX, and governance and must be stable and tamper-resistant.

## Decision

- Plugin identity uses immutable `pluginId`.
- Route alias uses `pluginSlug` (immutable in POC once active).
- Policy, permission, and plugin records use GUID primary keys in storage.
- Registration payloads must be cryptographically signed.
- Core caches icon and display metadata rather than trusting remote runtime fetches.
- Cosmetic metadata changes use partial re-validation.
- URL/auth/policy changes require full re-validation.

## Consequences

- Better resilience against tampering and accidental breakage.
- Stable route semantics and audit-friendly entity history.

## Signing Key Storage Baseline

- Plugin metadata signatures use Ed25519 key pairs.
- Signing key material is stored via environment variables and never committed.
- Environment variable naming conventions:
	- Active private key: `PLUGIN_METADATA_SIGNING_PRIVATE_KEY_<KEY_ID_SUFFIX>`
	- Active public key: `PLUGIN_METADATA_SIGNING_PUBLIC_KEY_<KEY_ID_SUFFIX>`
	- Next private key (staged): `PLUGIN_METADATA_SIGNING_PRIVATE_KEY_NEXT_<KEY_ID_SUFFIX>`
	- Next public key (staged): `PLUGIN_METADATA_SIGNING_PUBLIC_KEY_NEXT_<KEY_ID_SUFFIX>`
- `<KEY_ID_SUFFIX>` is the uppercase key id with dashes converted to underscores.
