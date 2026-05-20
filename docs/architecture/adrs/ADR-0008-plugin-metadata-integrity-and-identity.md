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
