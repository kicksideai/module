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
never exact pins. The application declares explicit `>=` minimums from its verified
published dependency baseline, so fresh installs can select newer compatible Hub
versions without waiting for another app release. The installed lock records that
resolved graph; restarting an existing installation does not update it implicitly.
One root `ns.definition` owns the namespace.
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
`view.component.entry_point`. `make release-check` runs the gates and an
authenticated publish dry run using the version in
`.release-please-manifest.json` unless `VERSION` is set. Authenticate with
`wippy auth login` and check `wippy auth status` before the release check.

The template's public `.github/workflows/release.yml` owns publication.
After a code PR merges, Release Please proposes a release PR. Review its
version, changelog, and CI results, then merge that release PR to create the
tag and publish its version to the Hub. Normal code merges do not publish.
`make publish` points to this workflow. Configure the workflow's required
GitHub and Hub credentials before releasing. Use the module's checked-in
Makefile for its exact targets; never call package-manager or Vite build
commands directly in a Wippy repository. For the application, `make -C app
release-check` builds the untracked main page, verifies its complete asset
manifest and font references, and performs a dry-run pack.

For the KickSide repository, Release Please creates GitHub tags and release
records. The hosted workflow builds and publishes ordinary releases to the Hub.

To publish a qualified release using the exact archives recorded by the SQLite and PostgreSQL gates,
retain the full evidence directory from the internal release gate. Run
`sha256sum "$RELEASE_EVIDENCE/artifacts.json"` and add one Git trailer of the
form `Hub-Artifact-Manifest-SHA256: <digest>` to the release PR's squash commit
message. Use all 64 lowercase hexadecimal characters. For a CLI merge, supply
the message body with `gh pr merge --squash --match-head-commit ... --body-file ...`.
The release workflow reads the trailer from the exact tagged commit and skips
hosted Hub publication for the whole cohort.

From a clean checkout at that tag, verify the staged archives with the original
evidence directory. Authenticate to the Hub with `wippy auth login` before running
the publish command.

```bash
python3 scripts/publish-release-modules.py --repository . --evidence "$RELEASE_EVIDENCE" --verify-only
python3 scripts/publish-release-modules.py --repository . --evidence "$RELEASE_EVIDENCE"
```

The publisher checks the tagged commit's parent and source tree against the
verified release, verifies the manifest digest, and checks every archive against
both engines' evidence before publishing. Both engines must have exercised an
application archive. A companion marked `packed-only` has archive verification
but no runtime coverage from that gate. The publisher uploads the archives in
dependency order and publishes the application last when included. If publication
stops partway through, rerun with the same tag and evidence. Matching Hub releases
are reused and a digest conflict stops publication. Publish a new version to
change a released archive.


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

On a current installation, use **System → Modules → Update all** and restart
from the same installation directory. Module migrations update existing data
as part of the Hub update.

### Update older installations

On a published installation, open **System → Modules → Installed** and check
the versions on the `keeper/keeper` and `kickside/hub` rows. A Modules page
served by Hub 0.1.76 can submit App and Keeper in one **Update all** request.
If Keeper 0.5.114 or 0.5.115 handles that request, it can replace existing
host settings even when the new App declares newer dependency floors.

The same prerequisite applies to updates through the Keeper HTTP API and the
`hub_dependencies` MCP tool. Apply the Keeper update by itself, verify the
active version, then request a fresh App plan. A combined request runs under
the Keeper version that received it.

1. When Keeper is earlier than 0.5.116, select **Scan updates**, then
   **Update keeper/keeper** on its row. Wait for the standalone operation to
   finish, reload the page, and confirm **Installed** lists Keeper 0.5.116 or newer. For an
   authenticated API check, confirm `GET /api/v1/security/projection` returns
   `current: true`.
2. When Hub is earlier than 0.1.77, select **Scan updates**, then
   **Update kickside/hub** on its row. Wait for the standalone operation to
   finish, reload the page, and confirm **Installed** lists Hub 0.1.77 or newer.
3. Before using **Update all**, preview the App plan through **Open update
   planner for kickside/kickside** on the App row or through Keeper's Hub API.
   Check that it preserves the installation's root bindings and configured
   constraints. Leave the App update unapplied if its plan omits those settings.

With the supported Keeper active, an App update compares each saved Facade
`host_config_layout` and `host_custom_css` value with the installed release's
default. Unset values and values that match that default adopt the new default.
Customized values carry forward. In a layout without a chat panel, **New chat**
opens the inline chat on the Sessions page.

A release that retires a stored shape includes a forward-only, idempotent,
resumable migration in the owning module, tested against the previous published
version's data on SQLite and PostgreSQL. Published entry IDs, requirements,
endpoints, contracts, and event types remain stable unless their callers and
stored references migrate together.

Use [Testing And Migrations](13-testing.md) and the
[Publishing Checklist](09-checklists.md) before releasing.
