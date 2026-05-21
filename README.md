# Plugin-based Core Platform

This repository is the core artifacts and services of a plugin-based app platform. It is designed to be a distributed plugin system allowing external plugins to register with the platform and be automatically onboarded. The goals of this platform are:

1. Decoupled plugin architecture
2. Plugins own their own development lifecycle
3. Core provides contracts and integration artifacts such as UI components and common styling
4. Plugins expose SDKs for interconnectivity
5. Core exposes common authentication/authorization
6. Plugins expose permissions that the core can use to build roles
7. Pugins expose policies enforced so core can enforce those policies

## Repo Setup

- This Repo is kept in an nx monorepo to allow for quick development and shared libraries
- This repo is responsible for core responsibilities such as
  - Authentication/authorization framework
  - Plugin registry
  - Inter-plugin communication
  - Plugin dependency graph for knowledge graphs, dependency manifests etc
  - MCP tools for allowing agents to discover architectural information across plugins.
  - Core UI components to be published for use in external plugins
    - Top Nav
    - Footer
    - Left Nav
  - Shell UI that utilizes Core UI components

## Local Environment Templates

Use the root environment templates when setting up local development values:

- Copy `.env.example` to `.env.local`.
- Optionally copy selected example overrides from `.env.local.example` into `.env.local` (for example, local secrets and machine-specific values).
- Keep `.env.local` untracked; only commit template updates.

The templates define baseline variables for:

- Core service endpoints (`CORE_*_API_URL`)
- Gateway and host shell URLs
- Keycloak realm and client configuration
- Tenant and runtime tuning defaults

## Workspace Packages

The following Nx workspace packages are scaffolded under `packages/`:

- `@org/contracts` (`packages/contracts`)
- `@org/registry` (`packages/registry`)
- `@org/gateway` (`packages/gateway`)
- `@org/policy` (`packages/policy`)
- `@org/entitlement` (`packages/entitlement`)
- `@org/validation` (`packages/validation`)
- `@org/audit` (`packages/audit`)
- `@org/host-shell` (`packages/host-shell`)

## Plugins

- Each plugin will be an external nx monorepo
- Plugins will contain a UI that imports and uses the core UI components
- Plugins may contain backend services to support frontend operation
  - If backend services are added, contracts will be enforced via plugin SDK
- Plugins will "register" with core by providing
  - Plugin ID
  - Plugin Name(display name)
  - URL to Plugin UI
  - URL to plugin icon
  - permissions added and enforced by plugin(namespaced to plugin)
  - policies defined by plugin
  - url to SDK documentation for contract alignment.

## Architecture Documentation

- Decision matrix: [docs/architecture/decision-matrix.md](docs/architecture/decision-matrix.md)
- C4 Context: [docs/architecture/c4-context.md](docs/architecture/c4-context.md)
- C4 Container: [docs/architecture/c4-container.md](docs/architecture/c4-container.md)
- ADR index: [docs/architecture/adrs/README.md](docs/architecture/adrs/README.md)

## Quality Baseline

The workspace enforces a consistent baseline for TypeScript, linting, formatting, and tests across all packages.

- TypeScript strictness is enabled in `tsconfig.base.json`.
- Each package defines Nx targets for `build`, `typecheck`, `lint`, and `test`.
- ESLint uses a shared root flat config in `eslint.config.mjs`.
- Prettier is the source of truth for formatting.

Run the quality suite locally with:

```bash
npm run format:check
npm run lint
npm run test
npm run build
npm run typecheck
```

## CI Baseline

GitHub Actions runs a baseline Nx affected suite for pull requests and pushes to `main`:

- `format:check` scoped to the computed base SHA
- `lint`, `test`, and `build` using `nx affected`

This keeps CI focused on impacted projects while preserving workspace-wide quality gates.
