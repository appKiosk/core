# Contributing Guide

This document defines how to contribute to the core workspace with consistent branching, review, and code quality practices.

## Prerequisites

- Node.js `>=20.19.0`
- npm (workspace package manager)

Install dependencies:

```bash
npm ci
```

## Branching Strategy

Create feature branches from `main`.

```bash
git fetch origin main
git checkout main
git pull --ff-only origin main
git checkout -b feat/issue-<number>-<short-description>
```

Preferred naming patterns:

- `feat/issue-<number>-<short-description>`
- `fix/issue-<number>-<short-description>`
- `docs/issue-<number>-<short-description>`
- `chore/issue-<number>-<short-description>`

Use lowercase kebab-case for the short description.

## Development Workflow

1. Link your work to a GitHub issue.
2. Keep changes scoped to that issue.
3. Add or update docs when behavior or developer workflow changes.
4. Run local validation before opening a PR.

## Coding Standards

This repository enforces strict TypeScript and lint rules:

- TypeScript strict mode is enabled in `tsconfig.base.json`.
- `any` is disallowed by ESLint.
- Unused variables are errors unless prefixed with `_`.
- Prettier uses single quotes.

Workspace dependency policy:

- Keep npm dependency versions in the root `package.json`.
- Do not add per-package `dependencies` or `devDependencies` under `packages/*`.

## Validation Commands

Run the baseline checks before pushing:

```bash
npm run format:check
npm run lint
npm run test
npm run build
npm run typecheck
```

For targeted changes, you can run Nx affected locally:

```bash
npm exec nx -- affected -t lint test build --base=remotes/origin/main --head=HEAD
```

CI also enforces lockfile consistency:

```bash
npm run check:lockfile-sync
```

## Commits and Pull Requests

Use conventional commit style where possible:

- `feat(scope): ...`
- `fix(scope): ...`
- `docs(scope): ...`
- `chore(scope): ...`

Pull request requirements:

1. Reference and close the issue in the PR body using `Closes #<issue-number>`.
2. Summarize what changed and why.
3. Include validation commands and results.
4. Ensure CI is green for impacted projects.

## Review Expectations

- Keep PRs small enough to review efficiently.
- Address review comments with follow-up commits.
- Resolve review threads after requested changes are applied.
- If blocked by another issue/dependency, note that in the related issue comments.
