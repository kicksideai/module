# Module Layout

Start from the `kicksideai/module` template. A module owns one
root `ns.definition`, source entries under `src/`, and an isolated `test/`
harness. The package manifest excludes the harness and generated local state.

```text
<module>/
  wippy.yaml
  Makefile
  src/_index.yaml
  src/api/             # HTTP handlers and endpoint entries
  src/persist/         # repository, readers, writers, projections
  src/migrations/      # timestamped SQL migration entries
  src/security/        # module-owned policies
  src/sink/            # writable bindings and methods
  src/traits/          # agent traits and tools
  src/blocks/          # reusable typed capabilities
  ui/src/              # optional web-component source
  static/              # optional committed, built bundle
  test/src/            # standalone host resources and tests
  test/wippy.yaml      # standalone harness manifest
  test/.wippy.yaml     # local replacement and DB profiles
```

Each directory with entries has an `_index.yaml` declaring its exact
namespace. File/folder names have no identity authority. Keep a single owner
for each declaration. An endpoint in `api/` calls its domain service; the
repository in `persist/` owns SQL; a projection in `persist/` folds events
into read tables and public meta. The sink invokes the same domain writer as
the API and agent tool, preserving access checks and event emission. Product
settings and defaults are registry entries in source, not seed SQL.

Tests that need registered fixtures, host resources, a database, or bootloader
live in `test/`, outside the module tree. Colocated logic tests can live near
their source as `<name>_test.lua` and use `meta.type: test`; the manifest
excludes them from release. A reusable conformance kit for third-party module
authors may ship under `src/testing/` as product API.

A web component's `ui/src` is editable source. Its built `static/` output is
the served and published artifact; build through the module Makefile and
commit the regenerated asset. Do not edit the emitted JavaScript by hand.
The root `wippy.yaml` embeds the relevant `fs.directory` and excludes
`test/**`, `test:**`, local `.wippy/`, root lock, `node_modules`, and source
maps. See [Packaging, Publishing, And Installing](15-publishing.md) and
[Testing And Migrations](13-testing.md).

## Repository locations

The [module template](https://github.com/kicksideai/module) provides the starter
layout. Shared platform modules live in
[kicksideai/kickside](https://github.com/kicksideai/kickside); integration
providers live in [kicksideai/providers](https://github.com/kicksideai/providers).
Domain applications use independent repositories and declare the shared modules
as dependencies.
