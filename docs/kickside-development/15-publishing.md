# Packaging, Publishing, And Installing

A module is an independently published `organization/module` package. Its
root `ns.definition` declares its registry namespace. Every owned entry is
`namespace:name`; component IDs are separate runtime UUIDs. Build and test
from the module Makefile. The module template is a working packaging
example.

## Manifest and dependencies

`wippy.yaml` declares `organization`, `module`, description, license,
repository, keywords, `embed` for built `fs.directory` assets, and `exclude`
patterns for harness, generated state, source maps, and unshipped files. It
has no pinned release `version`: the Hub publisher selects the immutable
release version. Add `exclude_meta.type: [test]` for test entries and exclude
`test/**` and `test:**` so harness files and entries stay out of the module.
Commit the generated `static/` bundle when the module owns a web component.

Dependencies are `ns.dependency` entries in source with `component:
organization/module` and `version: "*"` or a `>=` compatibility range.
The root module lock is generated and untracked. Only the application lock
pins resolved versions; module dependency declarations use `*` or `>=` ranges,
never exact pins. One root `ns.definition` owns the namespace.
A `ns.requirement` states a resource the host must supply and rewrites exact
target fields such as `.meta.target_db`, `.meta.router`, `.meta.server`, or
policy `.groups +=`. Do not set a host-owned resource default in the module.
The published member-scope default and existing-binding precedence follow
[Security And Module Access](23-security-and-module-access.md). The host
selects the concrete database, authenticated router, HTTP server, security
group, process host, and storage resources.

## Verify and publish

In the template, `make verify` performs dependency setup, invariant
checks, initializer test, Wippy lint, frontend typecheck/build, and SQLite
suites. For SQL changes also run `make postgres-up`, `make test-pg`, and
`make postgres-down`. Inspect the emitted `static/index.js` and registry
`view.component.entry_point`. `make release-check` includes an authenticated
publish dry run. The template disables direct `make publish`; reviewed changes
release through its GitHub Release Please workflow. Use the
module's checked-in Makefile for its exact targets; never call package-manager
or Vite build commands directly in a Wippy repository. Authenticate with
`wippy auth login` and check `wippy auth status` before the release check.
Publish dependencies first so Hub can resolve the module's graph. A release
cannot be edited after publication; publish a new version for changes.

## Install and update through KickSide Hub

The `kickside/hub` module owns the System → Modules surface. Browse the
catalog, inspect a module's bindings and requirements, and review the planned
transitive install. Supply host-owned requirement values, including the
module's authenticated role group, in the application profile or reviewed Hub
plan. Install, then check the deployed registry declarations and runtime
components separately. To update, use Keeper's Hub API (`hub_dependencies`
plan/install) or the same Hub UI with a `>=` version range. Review the dependency and migration plan,
apply it, and verify module endpoints, UI assets, and existing component data.
The Hub emits `hub.install.finished`,
`hub.uninstall.finished`, and `hub.migrations.finished` on the `keeper.hub`
channel; the app shell refreshes its catalog after those events
(`app/frontend/applications/main/src/app/app.vue`). Do not install by copying
source into the host or editing `wippy.lock` by hand.

Use **System → Modules → Update all**, review the plan, apply it, and restart from the same installation directory. Module migrations update existing data as part of the Hub update; no separate data-conversion step is required.

A release that retires a stored shape includes a forward-only, idempotent,
resumable migration in the owning module, tested against the previous published
version's data on SQLite and PostgreSQL. Published entry IDs, requirements,
endpoints, contracts, and event types remain stable unless their callers and
stored references migrate together.

Use [Testing And Migrations](13-testing.md) and the
[Publishing Checklist](09-checklists.md) before releasing.
