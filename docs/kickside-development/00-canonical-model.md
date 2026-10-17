# Canonical Model

KickSide is a module platform. Each product area ships as a Wippy module with
registry entries, contracts, bindings, libraries, functions, migrations, web
components, and tests. The app composes those modules.

The model is intentionally small:

- **Module**
  - **Meaning:** A published Wippy package with `_index.yaml` entries
  - **Canonical home:** Each module directory
- **Registry entry**
  - **Meaning:** Declarative discovery record
  - **Canonical home:** `kind: registry.entry`
- **Documentation page**
  - **Meaning:** Versioned Markdown available to people and agents
  - **Canonical home:** `registry.entry` with `meta.type: wippy.documentation.page`
- **Contract definition**
  - **Meaning:** Stable interface shape
  - **Canonical home:** `kind: contract.definition`
- **Contract binding**
  - **Meaning:** Implementation of a contract
  - **Canonical home:** `kind: contract.binding`
- **Component**
  - **Meaning:** User-owned/shareable resource row
  - **Canonical home:** `kickside.component`
- **Private context**
  - **Meaning:** Private config/state for one component
  - **Canonical home:** `kickside_components.private_context`
- **Public meta**
  - **Meaning:** Renderable component state
  - **Canonical home:** component meta service
- **Thread**
  - **Meaning:** Durable event stream
  - **Canonical home:** `kickside.core.threads`
- **Event**
  - **Meaning:** Durable domain fact
  - **Canonical home:** `kickside_event`
- **Projection**
  - **Meaning:** Event consumer/read-model builder
  - **Canonical home:** `kickside.core.projections`
- **Job**
  - **Meaning:** Deferred side effect or worker unit
  - **Canonical home:** `kickside.core.jobs`
- **Automation timer drive**
  - **Meaning:** Time trigger
  - **Canonical home:** automation timer drive
- **Block**
  - **Meaning:** One typed executable capability
  - **Canonical home:** `kickside.block/v1`
- **Flow**
  - **Meaning:** One native executable DAG and durable run
  - **Canonical home:** `wippy/dataflow`
- **Workflow**
  - **Meaning:** Versioned visual Flow definition
  - **Canonical home:** optional `kickside/workflows`
- **Port**
  - **Meaning:** Named connection point
  - **Canonical home:** Block `data.block.ports` or standalone `kickside.automation.port`
- **Web component**
  - **Meaning:** Module-owned UI element
  - **Canonical home:** `view.component`
- **Surface**
  - **Meaning:** App navigation target
  - **Canonical home:** `ui.nav_item`

## Layering

Use the lowest layer that owns the concern:

- **`core/contract`**
  - **Owns:** Interface and binding system
  - **Does not own:** Product semantics
- **`core/component`**
  - **Owns:** components, access, public meta, teardown
  - **Does not own:** Domain tables
- **`core/core`**
  - **Owns:** threads, events, projections, retention, lifecycle cleanup
  - **Does not own:** Product modules
- **`core/execution`**
  - **Owns:** principal encoding, live execution identity, trace context
  - **Does not own:** durable job dispatch
- **`core/jobs`**
  - **Owns:** durable leased jobs, exact deadlines, and worker dispatch
  - **Does not own:** product scheduling semantics
- **`platform/*`**
  - **Owns:** product modules and contracts
  - **Does not own:** Provider-specific APIs
- **independently published provider/engine modules**
  - **Owns:** external APIs and engines
  - **Does not own:** Core/component schema
- **`app`**
  - **Owns:** composition, app shell, facade, nav
  - **Does not own:** Module internals
- **`app/frontend`**
  - **Owns:** host-rendered UI and web components
  - **Does not own:** Persistence

## Data Planes

Do not mix these planes.

- **Registry metadata**
  - **Stored in:** `_index.yaml` entry `meta`
  - **Visible to frontend:** Indirectly through discovery APIs
  - **Examples:** contract tags, nav item labels, web component tags
- **Component private state**
  - **Stored in:** `private_context`
  - **Visible to frontend:** No
  - **Examples:** credentials, provider config, rollback chain, cursor config
- **Component public meta**
  - **Stored in:** component meta table
  - **Visible to frontend:** Yes
  - **Examples:** title, status, counts, last_error, badges
- **Durable facts**
  - **Stored in:** thread events
  - **Visible to frontend:** Through APIs/read models
  - **Examples:** `kb.ingest.requested`, inbox item events, agent turns
- **Engine tables**
  - **Stored in:** module-owned SQL
  - **Visible to frontend:** Through module contracts/APIs
  - **Examples:** `kb10_*`, upload artifact tables, CRM read tables

Registry metadata is configuration for the module registry. Component public meta
is runtime state for a specific component. They are different planes even though
both are named `meta`. Documentation page bodies and their titles, paths, kinds,
and statuses are registry entry data, not registry metadata.

## Component Public Meta

Public meta is the one component-level render state. It is written through the
component service and broadcast on the canonical component topic.

Use public meta for:

- `status`
- user-facing `last_error`
- flat summary counts such as `document_count`, `chunk_count`, `pending_count`
- timestamps that help render state, such as `last_synced_at`
- display fields such as title, icon, description, class

Do not use public meta for:

- secrets
- provider credentials
- raw configuration
- per-viewer unread state
- large payloads
- internal worker cursors
- durable audit records

When possible, a component-owned projection should compute public meta from
events. Direct `set_meta` from a worker is acceptable only when that worker is
the owner of that component state and is running under the correct actor/system
context.

## Private Context

`private_context` is a component's private configuration and durable internal
state. It is opened through the component service. It is not a public status API.

Use private context for:

- provider credentials or encrypted credential references
- source config and watermarks owned by an automation/connection
- rollback chains
- install-time options
- small private state needed to run component actions

Do not mirror public meta into private context just to render a list. If a field
is renderable, put it in public meta through the component service.

## Threads And Events

Threads are the durable event log. Use them for workflows, human-in-the-loop
flows, source ingestion, agent turns, and correlation across components.

Events should carry facts, not UI patches. The public meta projection can reduce
facts into renderable state.

Canonical trace shape:

```lua
trace_context = {
  trace_id = "...",
  run_id = "...",
  caused_by_event_id = "...",
  correlation_key = "...",
}
```

Use `run_id + type + correlation_key` for indexed waits. The event id is already
the step/span id; do not add `step_id`.

## Identity

Use precise names:

- **`owner_user_id`** — User who owns a component or domain row.
- **`principal`** — Typed selected `{ kind = user | group | service, id }` for durable execution.
- **`authorized_by`** — Typed principal whose authority selected that principal.
- **`actor_id` / `actor_context`** — SQL representation owned by `kickside.execution:execution_identity.to_row` and `from_row`; do not construct it in application code.
- **`grantee_id`** — Subject receiving component access.

Synchronous code uses the caller's security frame. Deferred workers resolve
stored execution identity against live authority at the execution boundary;
see [Execution Identity And Deadline Jobs](20-execution-identity-and-jobs.md).

## Access

The component service is the resource access authority. App endpoints are mounted
behind token auth and endpoint firewall; module handlers then perform only the
domain access check they own, normally `component.open` or `component.validate_access`. Trusted private
openers belong only to framework workers and teardown.

Avoid direct SQL access checks outside persistence modules. If a tool or worker
needs a resource, open the resource through the service/contract layer.

## Realtime

Component public meta changes emit the canonical component topic:

```text
component.<component_id>
event_type = component.meta.changed
data.meta = <full public meta snapshot>
```

Feature-specific realtime topics are for internal high-frequency streams that
are not component public state. Lists and cards should subscribe to component
meta, merge the full snapshot in one canonical place, and reload details through
APIs when needed.

## Vocabulary Budget

Before creating a new abstraction, try to model it as one of:

- a component kind
- a contract definition/binding
- a registry entry
- a thread event
- a projection/read model
- an automation timer drive or deadline job
- a Block or Flow
- an Automation port
- a module-owned web component

If none of those fit, document why the new concept is genuinely different.
