<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

## Repository Focus

- This repository provides the core platform for a plugin-based architecture. Start with [README.md](README.md) for domain context and goals.
- The workspace currently has no generated projects under `packages/*`; check project inventory first before running targets.

## First Commands

- Use `npm exec nx show projects` to confirm available projects.
- Use `npm exec nx graph` to inspect dependencies once projects are added.
- For task execution, use Nx via package manager prefix (for example `npm exec nx run-many -t lint test build typecheck`).

## Quality Gates

- TypeScript is strict. See [tsconfig.base.json](tsconfig.base.json).
- Formatting uses single quotes. See [.prettierrc](.prettierrc).
- CI behavior and standard checks are defined in [.github/workflows/ci.yml](.github/workflows/ci.yml).

## Agent Tooling In This Repo

- Repo skills and prompts live in [.github/skills](.github/skills), [.github/prompts](.github/prompts), and [.github/agents](.github/agents).
- Nx MCP is configured in [opencode.json](opencode.json).

## Pitfalls And Conventions

- Follow monorepo single-version policy and ESM/CJS consistency guidance in [CLAUDE.md](CLAUDE.md).
- When adding or wiring workspace package dependencies, use the workflow in [.github/skills/link-workspace-packages/SKILL.md](.github/skills/link-workspace-packages/SKILL.md).
