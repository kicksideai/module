# Registry And Source Conventions

Wippy source files use `_index.yaml` to declare registry entries. A namespace
file begins with `version: "1.0"`, `namespace: <exact namespace>`, and an
`entries` list. The module root has one `ns.definition`; each nested source
folder declares its own namespace. A package's `organization/module` identity
does not determine any namespace. Use `registry.get("namespace:name")` for
known entries and typed `registry.find` for extension discovery. See
[Discovery, Addressing, And Context](19-discovery-addressing-and-context.md).

## Dependencies and host requirements

Declare every package dependency as `ns.dependency` with a compatibility range:

```yaml
- name: dep.kickside.contract
  kind: ns.dependency
  version: "*"
  component: kickside/contract
```

A module declares host-owned inputs with `ns.requirement` and exact rewrite
targets. It does not choose a host database or router in source:

```yaml
- name: target_db
  kind: ns.requirement
  meta:
    comment: SQL resource for Deals rows and migrations.
  targets:
    - entry: acme.deals:db_config
      path: .meta.db_id
    - entry: acme.deals.migrations:01_deals
      path: .meta.target_db
- name: db_config
  kind: registry.entry
  meta:
    comment: Database selected by the host.
```

This matches the `db_config` and `target_db` pattern in
`platform/webhooks/src/_index.yaml`. The host's `ns.dependency.parameters`
passes the concrete value, for example `{ name: acme.deals:target_db, value:
app:db }`. Requirements for authenticated `http.router`, `http.service`,
process host, and security group use the same mechanism. A group target can
append with `path: ".groups +="`; see
`platform/workflows/src/security/_index.yaml` and the template.

## Functions, bindings, and ports

A `function.lua` points at `source: file://...`, lists permitted `modules`
and registry `imports`, and selects an exported `method`. A
`contract.binding` maps each contract method to a function entry ID. A
`registry.entry` with `meta.type: kickside.automation.port` publishes a
source or destination for a builder. A writable binding must declare
`meta.delivery`, `meta.input_shape`, and `write`.
Port `binding`, `event`, `operations`, `config_schema`, and `input_schema`
are top-level fields, as in `platform/webhooks/src/_index.yaml` and
`platform/knowledge/src/sink/_index.yaml`. Details are in
[Contracts And Ports](02-contracts-and-ports.md) and
[Automations And Dataflows](21-automations-and-dataflows.md).

## Native structured errors

Every error that leaves a function is a native Wippy error with the correct
kind. This includes returned or raised errors, contract and `funcs` results,
process messages, job outcomes, and HTTP or MCP responses. Set `retryable`
explicitly when the default retry policy is wrong for the operation, especially
after a non-idempotent side effect. Do not depend on automatic classification
of plain strings at a boundary. A native `UNKNOWN` error is eligible for the
default function and contract retry policy unless it explicitly opts out.

Create errors with `errors.new({message = ..., kind = errors.INVALID,
retryable = false, details = {code = ...}})`. Callers branch on
`errors.is(err, errors.INVALID)` or a stable machine code in `err:details().code`,
never on message text. Messages describe the failure for people; kinds and
codes define behavior.

Add context with `errors.wrap(err, message)`. Recreating an error retains its
kind, message, retryable value, and details. A data-only boundary serializes
`{kind, message, retryable, details}` and rehydrates with `errors.new` at the
receiving side. Verify the fields against the runtime at each boundary rather
than assuming that transport preserves native errors.

When a boundary adds classification metadata, use `error_envelope.wrap(err,
message, annotations)` from `kickside.contract:error_envelope`. It retains the
native kind, retryable value, and source details, and stores the full source
error in `details.cause`, including metadata replaced by the annotations.
`wrap_secondary` uses the same mechanism for cleanup refusals and retains the
preceding failure in `details.operation_error`.

HTTP and MCP responses retain their existing JSON shape; kind and code fields
are additive. Published API paths, contracts, event identities, and stored
shapes retain compatibility. Error handling propagates a failure or handles an
explicit kind or code. It never swallows an error, supplies a default that
hides a failure, or parses a message to recover its classification.

## Events, components, and security

An event type is `kind: registry.entry` with `meta.type:
kickside.core.threads.event` and a body `schema`. The owning component
kind is `kind: contract.binding` with a `kickside.contract:component`
contract, `meta.class`, and explicit `meta.events.input` and
`meta.events.output`. Component WRITE authorizes declared domain outputs under the caller's identity.
An output declaration may mark `system_only: true` for framework attestations.
Public input appenders use the user role. A component kind
may declare `meta.projections` with a `func://` or `proc://` worker reference;
its worker entry declares `meta.type: projection.worker` and has no custom
security frame. See [Threads, Events, And Projections](03-threads-events-projections.md).

Endpoint access is a selectable module-owned `security.policy` with `groups: []`.
Application group compositions select its `meta.intent: module_access` bundle;
published member-scope requirements retain their ids and targets. See
[Security And Module Access](23-security-and-module-access.md). The endpoint's
`meta.router` also comes from a requirement. Domain handlers check component
access after router authentication. Give public callback endpoints a separate,
intentional public router and verify their signature or token before acting.
See `platform/webhooks/src/api` and
[Connections And Integrations](04-connections-and-integrations.md).

## Settings and environment

A setting definition is a `registry.entry` with
`meta.type: kickside.settings:definition`, `namespace`, `key`, `value_type`,
`default`, and scope/visibility/editability fields. A product default is
owned by the module; a host-owned resource ID is supplied by requirement.
`platform/settings/src` owns overrides and access. Credentials belong in
private component context, encrypted OAuth storage, or host runtime storage,
never in setting defaults or public meta.

An `env.variable` can expose an operator value. In `kickside/uploads`,
`kickside.uploads.env:database_resource` declares `variable:
KICKSIDE_UPLOADS_DATABASE_RESOURCE` and `meta.private: true`; the
`database_resource` requirement rewrites its `.default` target. The source
declares no host-owned value. Read the installed entry to learn which storage
backend supplies it. Runtime knobs owned end-to-end by an engine can have a
module code default; an application resource cannot.

## HTTP and UI

An authenticated `http.endpoint` declares `method`, `path`, `func`, and a
router injected at `.meta.router`. Paths are relative to the router; the host
owns its `/api/v1` prefix and authentication chain. A module page uses
`fs.directory` for built `./static`, `http.static` for the served path,
`view.component` for tag/entry metadata, and `ui.nav_item` for a shell route.
The module Makefile builds the page and the artifact is committed. Follow the
[frontend directive](07-frontend-and-web-components.md).

## Useful entry kinds

- `ns.definition`, `ns.dependency`, `ns.requirement`: package identity and
  composition.
- `registry.entry`: typed documentation, event, view, nav, setting, agent,
  Block, and port declarations.
- `contract.definition`, `contract.binding`: published interface and concrete
  implementation.
- `function.lua`, `library.lua`, `process.lua`: executable entrypoints and
  shared code.
- `db.sql.sqlite`, `db.sql.postgres`, `env.variable`, `security.policy`,
  `http.endpoint`, `http.static`, `fs.directory`: host resources and surfaces.

## Contract surface verification

Every method of a public `contract.definition` needs an invocation path or a
documented external caller. Verify exact contract IDs and method names against
registered Lua and the owning module's harness. Bindings declare their methods
explicitly; tests exercise the binding under the caller's identity.

For app-declared dependencies and onboarding composition packages, every
`ns.requirement` has a non-null default or a host-supplied parameter. Empty
strings, false, and empty collections are valid defaults. Requirements of
optional modules are resolved when the Hub installs those modules. Validate
these declarations through the public module CI lint and packaging checks.
