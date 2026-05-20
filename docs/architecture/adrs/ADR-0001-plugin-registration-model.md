# ADR-0001: Plugin Registration Model

## Status

Accepted

## Context

Plugins are independently developed and deployed web applications that must onboard without coupling to core release cycles.

## Decision

- Use push-based plugin registration.
- Registration is authenticated with OAuth client credentials.
- Each plugin has one admin client per environment.
- Credentials are plugin-bound and scope-limited.
- Registration requests are idempotent by `pluginId + environment`.
- Registration processing is asynchronous and returns a status handle.

## Consequences

- Plugin teams can own their own release lifecycle.
- Core can apply non-blocking validation and retries.
- Operational status is visible as lifecycle states instead of synchronous failures.
