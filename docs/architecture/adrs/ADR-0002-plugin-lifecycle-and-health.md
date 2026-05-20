# ADR-0002: Plugin Lifecycle and Health

## Status

Accepted

## Context

Plugin availability must be controlled to protect user experience and system reliability.

## Decision

- Lifecycle states: PendingValidation, Active, Warning, Suspended, Deprecated, Disabled.
- Validation runs on registration/update and on periodic schedules.
- Warning/Suspended transitions trigger signed webhooks.
- Webhooks use retries, dead-letter handling, and replay support.
- Core menu shows only plugins considered active and licensed.

## Consequences

- Unhealthy plugins can be isolated quickly.
- Plugin teams receive actionable, automatable notifications.
- Menu resilience is maintained through state-driven visibility.
