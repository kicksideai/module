# Contributing to KickSide Module

Follow the [organization contribution guide](https://github.com/kicksideai/.github/blob/main/CONTRIBUTING.md),
[Code of Conduct](https://github.com/kicksideai/.github/blob/main/CODE_OF_CONDUCT.md), and
[CLA](https://github.com/kicksideai/.github/blob/main/CLA.md). Send the signed CLA privately to
[licensing@wippy.ai](mailto:licensing@wippy.ai) before merge.

## Development and testing

Install the current [Wippy CLI](https://hub.wippy.ai/releases), Node.js 22 or
newer, npm, Make, and Python 3. Read [AGENTS.md](AGENTS.md) and the
[developer handbook](docs/kickside-development/developer-handbook.md).
When contributing to the template itself, keep its uninitialized identity;
when creating your own module, follow the [quick start](README.md#quick-start).

```sh
make verify
make postgres-up
make test-pg
make postgres-down
```

`make verify` checks setup, identity, dependency declarations, documentation
links, lint, frontend types and builds, and the SQLite harness. PostgreSQL is
required for persistence or migration changes. Describe the registry owner and
contract being changed, test public behavior, and regenerate `static/` from
`ui/src`. Never commit credentials or local Wippy state.

## Pull requests

Create a focused branch and submit a GitHub pull request to this repository.
Use a commit subject such as
`docs: clarify setup` or `fix: handle an empty result`. Explain the behavior and
validation in the PR; include relevant commands and outcomes. Maintainers review
and merge GitHub pull requests after the required checks and CLA confirmation.
