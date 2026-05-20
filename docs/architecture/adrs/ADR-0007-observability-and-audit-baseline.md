# ADR-0007: Observability and Audit Baseline

## Status

Accepted

## Context

Cross-plugin debugging and compliance require consistent telemetry and audit standards.

## Decision

- Adopt OpenTelemetry baseline for traces, metrics, and logs.
- Require trace propagation across gateway and plugin/service boundaries.
- Capture audit events for:
  - Registration and updates.
  - Lifecycle transitions.
  - Policy artifact changes and evaluations.
  - Gateway access and routing decisions.

## Consequences

- End-to-end transaction visibility across distributed services.
- Strong operational forensics and governance reporting.
