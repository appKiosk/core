# ADR-0003: Policy Model and Enforcement

## Status

Accepted

## Context

Plugins must define authorization policies while core enforces shared governance and denial safety.

## Decision

- Policies are declared using a JSON DSL.
- Policy names are namespaced by `pluginId`.
- Persist raw submitted policy + compiled/normalized artifact.
- Policy versions are immutable with active pointer.
- Missing or unknown policy evaluations deny by default.
- Enforcement happens at two layers:
  - Gateway for coarse controls.
  - Service/plugin layer for domain-level controls.

## Consequences

- Auditability and rollback are straightforward.
- Core enforces safety defaults while plugins retain domain policy ownership.
