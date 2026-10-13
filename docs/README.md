# Documentation

The Kickside development handbook is bundled under
[`kickside-development/`](kickside-development/developer-handbook.md), including
frontend host, proxy, theming, component, testing, sidecar, registry discovery,
Blocks, Flow, Workflow, migration, and publishing guidance.

This directory is an exact copy of
[`app/src/app/docs/kickside-development`](https://github.com/kicksideai/kickside/tree/main/app/src/app/docs/kickside-development)
in the canonical Kickside source repository. Run `make sync-handbook` to sync
from `main` or `make sync-handbook HANDBOOK_REF=<ref>` to select another ref;
`make check-handbook` checks the copy against `main` and is required by CI.
Do not add template-specific material here. The published copy is the
[Kickside Hub Wiki](https://hub.wippy.ai/kickside/kickside/wiki/docs/kickside-development/developer-handbook.md).

Repository-specific commands and checks live in
[`../AGENTS.md`](../AGENTS.md). When the Wiki and executable starter disagree,
verify the current registry contract and fix both sources rather than adding a
compatibility fallback.
