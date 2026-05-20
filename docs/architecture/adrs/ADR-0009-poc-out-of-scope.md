# ADR-0009: POC Out-of-Scope Boundaries

## Status

Accepted

## Context

POC success depends on reducing scope to prove core architecture quickly.

## Decision

The following are explicitly out of scope for POC delivery:

- Marketplace and billing workflows.
- Onboarding untrusted third-party plugins.
- Dynamic runtime code loading from unknown publishers.
- Advanced executable policy language beyond JSON DSL.
- Full production compliance evidence automation.

## Consequences

- Team can focus on onboarding, routing, tenancy, auth boundaries, and governance primitives.
- Future phases require separate ADRs and design for deferred concerns.
