# Contributing to KickSide Module

Follow the [organization contribution guide](https://github.com/kicksideai/.github/blob/main/CONTRIBUTING.md),
[Code of Conduct](https://github.com/kicksideai/.github/blob/main/CODE_OF_CONDUCT.md), and
[CLA](https://github.com/kicksideai/.github/blob/main/CLA.md). The CLA check on your pull
request explains how to sign.

## Development and testing

Install the current [Wippy CLI](https://hub.wippy.ai/releases), Node.js 22 or
newer, npm and Make. Read the
[module authoring guide](https://github.com/kicksideai/docs/blob/main/building-modules/index.md).
When contributing to the template itself, keep its uninitialized identity;
when creating your own module, follow the [quick start](README.md).

```sh
make setup lint typecheck build test-ui test
make postgres-up
make test-pg
make postgres-down
```

These commands check setup, lint, frontend types, builds and refresh behavior, and the SQLite harness. PostgreSQL is
required for persistence or migration changes. Describe the registry owner and
contract being changed, test public behavior, and regenerate `static/` from
`ui/src`. Never commit credentials or local Wippy state.

## Pull requests

Create a focused branch and submit a GitHub pull request to this repository.
Use a commit subject such as
`docs: clarify setup` or `fix: handle an empty result`. Explain the behavior and
validation in the PR; include relevant commands and outcomes. Maintainers review
and merge GitHub pull requests after the required checks and CLA confirmation.
