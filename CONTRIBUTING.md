# Contributing to BPMCP

Thanks for your interest in improving BPMCP! This guide outlines how to get started and the expectations for contributions.

## Getting Started
1. Fork the repository and create a feature branch.
2. Install dependencies: `pnpm install`
3. Validate the seed bundle: `pnpm seed:validate`
4. Run tests and type checks before submitting changes:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   ```

## Making Changes
- Follow the existing folder structure (`apps/`, `packages/`, `docs/`, `schemas/`, `scripts/`).
- Keep atoms, bindings, and manifests vendor-neutral in the open repository.
- Update or add documentation in `docs/` when introducing new features.

## Commit & Release Process
- Use descriptive commit messages (imperative style preferred).
- Run `pnpm changeset` to document any package changes; include all affected packages in a single changeset.
- Ensure `pnpm build` passes—CI will verify lint, build, tests, and seed loading.

## Pull Requests
- Reference related issues and provide a summary of the proposed change.
- List any follow-up tasks if the change is part of a larger effort.
- Be responsive to reviewer feedback; maintainers may request updates before merging.

## Community Guidelines
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md).
- Respect the 5-phase/5-flow protocol rule—a failing `pnpm seed:validate` will block merges.

We appreciate your contributions and look forward to growing the BPMCP ecosystem together!
