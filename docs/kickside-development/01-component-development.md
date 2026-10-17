# Component Development

Components are the canonical resource model for things users can create, share,
open, render, and delete.

File citations in backticks (for example `core/component/src/types.lua:52`) are
monorepo-relative source grounding. The page stands alone; the citations tell you
where each rule is pinned in code or tests.

Use a component when the thing has any of these properties:

- it is owned by a user
- it has access grants
- it appears in lists or navigation
- it has public renderable state
- it has private configuration
- it owns other data or a backing store
- it needs deletion/teardown

Examples: knowledge bases, uploads surfaces, connections, automations, inboxes,
agents, skills, and provider resources.

## Component Row Shape

One component row carries planes that must never be mixed:

- **`component_id`**
  - **Plane:** Stable resource id
  - **Home:** `kickside_components`
- **`impl_id`**
  - **Plane:** Contract-binding id that gives the row behavior
  - **Home:** `kickside_components`
- **`private_context`**
  - **Plane:** Private config/state, frontend-invisible
  - **Home:** `kickside_components.private_context`
- **`meta` (public)**
  - **Plane:** Renderable snapshot
  - **Home:** `kickside_component_meta`
- **access grants**
  - **Plane:** Owner/share/group masks
  - **Home:** `kickside_component_access`
- **`parent_id` / `position` / `path`**
  - **Plane:** Placement, not ownership
  - **Home:** `kickside_components`

Table names and the DB resource (the host-injected `target_db` requirement) are
pinned in `core/component/src/types.lua:13-20`. Public meta is written only
through `component.set_meta`. `component_id` is a UUID v7 only on the
imperative register path; provisioned/autoinit components use a deterministic
HMAC-SHA256 id in v5 shape (`core/component/src/autoinit.lua:119-124`), as do
thread-upsert natural-key ids.

## Declare A Component Kind

A component kind is one `contract.binding` whose registry id becomes the
component's `impl_id`. The binding IS the kind — declaration and runtime are a
single entry (`core/component/src/autoinit.lua:5-9`). An author declares:

1. A `contract.binding` implementing `kickside.contract:component`, with
   `meta.class` (broad UI class), `meta.title`, `meta.icon`.
2. Optionally `kickside.contract:deletable` in the same binding, if the
   component owns private tables or blobs.
3. Optionally a `meta.provision` block so autoinit materializes one per-actor or
   per-system instance.
4. Optionally `meta.projections` + `meta.retention` + `meta.events` to self-wire
   a read model over the component's own thread.
5. Optionally `meta.placement` to constrain the component's parent kind.

`meta.placement` belongs on the kind's binding:

```yaml
meta:
  placement:
    parents: ["example:workspace_kind", "root"]
    fixed: true
```

`parents` is a non-empty array of installed component-kind binding ids. `root`
allows top-level components with no component parent. An unknown kind id or an
empty array fails declaration validation with a typed error naming the binding.
Omitting `placement` preserves unrestricted placement.

Persistence checks the stored parent's `impl_id` inside the write transaction
for registration, declared and provisioned creation, portable import, and moves.
A refusal returns `errors.INVALID` with details
`{reason="placement", kind=<child impl>, parent_kind=<parent impl or "root">}`
and writes nothing; the error message names the allowed parents.

`fixed: true` sets the parent at creation and prevents later parent changes for
every actor, including owners and admins. Reordering within that parent and
moving an ancestor subtree remain allowed. Delete and cascade teardown remain
allowed. A fixed-parent refusal returns `errors.INVALID` with details
`{reason="placement_fixed", kind=<child impl>}`. Omitting `fixed` allows moves
between the declared parent kinds.

Complete real example, the uploads kind (`platform/uploads/src/_index.yaml:348-381`):

```yaml
  - name: uploads_component
    kind: contract.binding
    meta:
      title: Uploads
      comment: Completed file uploads from this workspace.
      icon: tabler:upload
      container: true
      class:
        - kickside.uploads
      provision:
        scope: user
      retention:
        event_days: 7
        drain_aware: true
      projections:
        - kind: "kickside.uploads:summary"
          worker_ref: "func://kickside.uploads.persist:uploads_projection_worker"
          input_mode: prefetch_events
      events:
        input: []
        output:
          - type: kickside.uploads.events:upload.completed
          - type: kickside.uploads.events:upload.deleted
    contracts:
      - contract: kickside.contract:component
        methods:
          get_status: kickside.core.threads:thread_status
      - contract: kickside.contract:deletable
        context_required:
          - component_id
        methods:
          delete: kickside.uploads.binding:delete_uploads_func
```

The deletable func named by the binding has this shape
(`platform/uploads/src/binding/delete_uploads_func.lua:12,55`):

```lua
local function handle(request_dto)   -- reads ctx.get("component_id")
  ...
  return { success = true, deleted = deleted }
end
return { handle = handle }
```

A kind created on demand (KB, connection) omits `provision:` and is created
imperatively via the service. Note `meta.class` is an array; autoinit reads the
first element as the provisioned class (`core/component/src/autoinit.lua:219-228`).

## Component Service API

Contract id: `kickside.component:component_service`
(`core/component/src/types.lua:71-74`). Obtain an actor-bound instance through
the `component` client library (`component.get_service()`,
`core/component/src/component.lua:46-65`) or open the contract under the current, authenticated security frame.
Do not synthesize an actor or scope to select execution identity. The client library is the
`kickside.component:component` `library.lua` entry; pull it into a lua entry
via

```yaml
imports:
  component: kickside.component:component
```

On an opened instance you call the contract method itself — `svc:register(dto)`,
`svc:set_meta(dto)` (`platform/knowledge/src/registry/knowledge_bases.lua:199`);
the underlying-function column names the `function.lua` handler behind each
method, not a callable.

- **`register`**
  - **Underlying function:** `register_component(dto)`
  - **Argument shape:** `{ impl_id, private_context?={}, meta?={}, additional_access?=[], component_id?, parent_id?, position? }` → `{ component_id, impl_id, parent_id, created_at, success }`
- **`get`**
  - **Underlying function:** `get_component(dto)`
  - **Argument shape:** `{ component_id }` → `{ component_id, impl_id, meta, parent_id, position, created_at, updated_at }`
- **`list`**
  - **Underlying function:** `list_components(dto)`
  - **Argument shape:** `{ filters={ impl_ids?, meta?, access_mask? }, pagination?, ordering? }` — filter by class via `filters={ meta={ class=... } }`
- **`query` / `count`**
  - **Underlying function:** `query_components(filter)` / `count_components(filter)`
  - **Argument shape:** flat DTO `{ component_ids?, impl_ids?, parent_id?, path_prefix?, meta?, include?, order_by?, limit?, offset?, access_mask?, actor_id?, scope? }`. Actor-scoped by default; `actor_id` (read-as) or `scope:"all"` require the `list_all` capability
- **`set_meta`**
  - **Underlying function:** `set_meta_component(dto)`
  - **Argument shape:** `{ component_id, fields, delete_keys? }`. Client helper `component.set_meta(component_id, fields, opts?)` (`core/component/src/component.lua:612-640`)
- **`update`**
  - **Underlying function:** `update_component(dto)`
  - **Argument shape:** `{ component_id, expected_revision?:integer, commands:[{ type:"SET_CONTEXT"\|"PATCH_CONTEXT"\|"SET_META", payload }] }` → `{ component_id, changes_made, context_revision, results, success }`. The batch applies atomically. Every context command advances the row's `context_revision`; `PATCH_CONTEXT` merges under the row lock, so concurrent patches to different keys keep every key, and concurrent writes to the same key resolve last-writer-wins. Conflict detection uses subject-scoped `expect` on the component's thread; projections fold from events; components do not own private event stores. Optional `expected_revision` is the context-subject form of `expect = { subject = "context", version = expected_revision }`, checked against the existing `context_revision` under the component row lock before any command writes. A mismatch returns CONFLICT with `{ reason = "version_mismatch", subject = "context", version = current_revision, expected = expected_revision }` and the entire batch writes nothing. Without the field, writes keep their existing behavior. Read the revision with private context through `get_access_context({ component_id, include_context = true })`. Client helper `component.update(component_id, commands, { expected_revision = revision })`
- **`delete`**
  - **Underlying function:** `delete_component(dto)`
  - **Argument shape:** `{ component_id, child_policy? }` → `{ component_id, deleted, success }`
- **`grant_subtree` / `revoke_subtree`**
  - **Underlying function:** `grant_subtree(dto)`
  - **Argument shape:** `{ root_component_id, subject={ subject_id, subject_type }, access_mask }` (`subject_type` is required: `user`, `group` or `service`)
- **`list_access`**
  - **Underlying function:** `list_access(dto)`
  - **Argument shape:** `{ component_id }` → `{ owner, access:[{subject_id, subject_type, access_mask, owner}] }`
- **`set_placement` / `list_children`**
  - **Underlying function:** `set_placement(dto)` / `list_children(dto)`
  - **Argument shape:** `{ component_id, parent_id?, position? }` / `{ parent_id?, pagination? }`
- **`export` / `import`**
  - **Underlying function:** `export_component` / `import_component`
  - **Argument shape:** portability envelope ("kxc"); ADMIN required

The client library also exposes higher-level openers, preferred over raw
contract calls: `component.open(id, required_access, target_contract_id?)`,
`component.open_by_meta`, `component.get_context`,
`component.read_context(id, required_access)` (→ `{ context, revision }` for a
compare-and-set write-back through `component.update`),
`component.validate_access(id, required_access)`, plus trusted no-actor reads
`component.open_private`, `component.get_private_context`,
`component.list_system`, `component.system_delete`
(`core/component/src/component.lua:642-665`).

Client operations return `(value, error?)`. Check the error before using the
result. Service methods retain their declared domain result shapes; do not
assume a uniform envelope.

## Public Meta Fields

Public meta is the current render snapshot, not a stats endpoint. If a list
shows counts or status, those values come from public meta. Prefer flat names:

- **`title`** — User-facing name
- **`description`** — User-facing description
- **`icon`** — Icon key
- **`class`** — Broad UI class such as `knowledge`, `automation`, `connection`
- **`status`** — Render status such as `ready`, `syncing`, `error`, `paused`
- **`last_error`** — User-facing failure summary
- **`<thing>_count`** — Flat count fields, for example `document_count`
- **`last_synced_at`** — Renderable activity timestamp

The public/private split is enforced: `set_meta` rejects a fixed denylist of
keys case-insensitively — `config`, `private_context`, `context`, `secret(s)`,
`credential(s)`, `token(s)`, `access_token`, `api_key`, `password`, `auth`,
`actor_id`, `execution_identity`, and similar — via
`FORBIDDEN_PUBLIC_META_KEYS` (`core/component/src/types.lua:27-50`, enforced at
`core/component/src/persist/ops.lua:136-148` for both create-time
`initial_meta` and every `set_meta`).

Write paths are separate: public meta goes through `set_meta`; private context
goes through `update` with `SET_CONTEXT`/`PATCH_CONTEXT` commands.

## Private Context Fields

Private context holds arbitrary component-specific state. Keep names clear and
avoid duplicating public state.

Use private context for:

- provider auth config
- selected resource ids
- rollback state
- schedule ids
- source watermarks
- declared public-state schema for automation types
- install-time options

Do not store UI-only counts in private context. Do not use private context as an
audit log. Real pattern: a connection stores credentials in `private_context`
and only `{title, class, provider}` in public meta
(`platform/connection/src/registry/connections.lua:94-107`).

## Access

Bitmask (`core/component/src/types.lua:52-63`), re-exported as
`component.ACCESS.*`:

- **`NONE`** — 0
- **`READ`** — 1
- **`WRITE`** — 2
- **`DELETE`** — 4
- **`ADMIN`** — 8
- **`READ_WRITE`** — 3
- **`FULL`** — 15

Subject types: `user`, `group`, `service` (`core/component/src/types.lua:65-69`).

Mask defaults: `READ` for view/list, `WRITE` for mutating component-owned data
and for creating a child under a parent, `DELETE` to delete, `ADMIN` to share.

The service provides for free:

- On `register`, the creating actor gets a direct `FULL` grant and is recorded
  as reserved `owner` meta (`core/component/src/persist/ops.lua:238-270`).
- Every write is gated by the service's access check; authors never write SQL
  permission checks.
- Sharing is subtree-based: `grant_subtree`/`revoke_subtree` require ADMIN on
  the root and reach descendants through indexed ancestry. Access checks use
  the selected principal and its live Users group memberships. Notification
  fanout expands groups through `kickside.contract:group_members`.

The author implements: choosing the right `required_access` when opening
(`component.open(id, component.ACCESS.WRITE, ...)`), and grants beyond the
owner via `additional_access:[{subject_id, subject_type, access_mask}]` at register time or
`provision.grants` for autoinit kinds. Workers and tools open resources through
the component/contract service under the correct actor.

## Teardown

If a component owns private tables, implement `kickside.contract:deletable`.
Trusted `component.system_delete` is idempotent: an already-removed component
is a successful no-op. The public delete conceals absence and denied access
with the same `PERMISSION_DENIED` envelope.

There is one delete cascade, shared by the gated request path
(`delete_component`) and the trusted `component.system_delete` used by the
lifecycle reaper; the only difference is the access gate
(`core/component/src/persist/teardown.lua:1-6`). Order:

1. `begin_delete` checks caller DELETE access and commits the `deleting_at`
   fence before cleanup; `system_delete` uses the same fence without the caller gate.
2. `run_deletable` — if the binding implements `kickside.contract:deletable`,
   open it with the private context plus `component_id` and call `:delete({})`
   for the impl's own backing-data teardown.
3. `unregister` consumes the committed fence without repeating authorization
   after retention removes grants. It removes the component row, meta, and access
   rows, appends the `deleted` lifecycle event, and records a durable primary-thread
   reap pointer in the same transaction. Direct children fail the delete unless
   `child_policy="reparent_root"` is passed.
4. `purge_primary_thread` reaps the component's event log after unregister commits.
   A failed or bounded purge retains its pointer for retention continuation;
   the public response reports the committed deletion and reap outcome. The
   pointer disappears only after the purge supplies completion proof.

Ownership and placement are different relations: ownership drives lifecycle
reaping, while `parent_id` is only placement. The workspace is a view, not an
owner: workspace entries are placements or pointers, and backing data lives and
dies in its home surface or with the owner lifecycle. Deleting a workspace
folder deletes descendant workspace entries only; pinned/provisioned/system
entries refuse the delete before any row changes, and deleting a workspace file
entry removes only the pointer.

Do not create a parallel delete endpoint that bypasses component teardown. Order
your own cascade so a yanked dependency cannot leave the component alive: KB
delete tears down engine stores first and calls `svc:delete` last
(`platform/knowledge/src/registry/knowledge_bases.lua:349-411`).

## Autoinit Components

`kickside.component:autoinit` reads component-kind bindings and creates
idempotent per-actor or system components. Use it for resources every actor or
system needs, such as inboxes or default workspaces.

Requirements for a kind to be picked up:

- The binding must carry both a `meta.provision` block and a `meta.class`
  array; miss either and the kind is silently skipped
  (`core/component/src/autoinit.lua:233-257`).
- `meta.class` is an array; the first element is the provisioned class.
- `provision.scope` selects per-`user` or per-system instances;
  `provision.grants` adds grants beyond the owner's implicit FULL
  (`core/component/src/autoinit.lua:91-99,167-183`).

Ids are deterministic: `component_id(scope_key, class)` is an HMAC-SHA256
(namespace `kickside.autoinit`), so `ensure` converges — safe to run on every
login without duplicates. Same (actor, class) yields the same id, distinct per
class and per actor (`core/component/test/src/autoinit_test.lua:64-69`).

Keep the provision block declarative. Autoinit is a pure library; actual
materialization lives in `kickside.core.threads:provision`. Runtime business
logic belongs in the component kind or projection, not in the autoinit
declaration.

## Public Meta Projection Pattern

Preferred pattern:

1. Domain code writes durable thread events or domain rows.
2. Component-owned projection consumes those facts.
3. Projection computes the complete public meta snapshot.
4. Projection calls `component.set_meta`.
5. Component service emits `component.meta.changed`.
6. Frontend merges the full meta snapshot.

Direct `set_meta` from a worker is acceptable only when that worker owns that
state and runs under the correct actor. This keeps UI state, durable facts, and
domain storage clear.

## Gotchas

- **notify_access resolves recipients live.** `set_meta` broadcasts
  `component.meta.changed` with the full public-meta snapshot on topic
  `component.<id>` when metadata changes. Fanout combines each user's direct
  and ancestor grants with group grants; the union must carry READ. Service
  subjects receive no realtime. Each group expands once per notification;
  there is no recipient cache, so revocation applies on the next event. An
  unavailable realtime binding returns `{success=true, skipped=true}`. The
  notification uses the caller's current frame. See
  `core/component/src/meta_service.lua` and
  `core/component/test/src/suites/notify_access_test.lua`.
- **Forbidden public meta keys.** Secrets and identity keys are rejected by
  name on every meta write, including create-time `initial_meta` (see Public
  Meta Fields above). Do not work around the denylist by renaming; the fix is
  moving the value to private context.
- **emit_singleton requires an ambient actor — it is not a skip.**
  `component.emit_singleton_event(class, event)` resolves the owner from the
  ambient security frame; a missing actor is `PERMISSION_DENIED`, and a missing
  `event.type` or empty `class` is `INVALID`
  (`core/component/src/component.lua:531-564`,
  `core/component/test/src/emit_singleton_test.lua:82-110`). It emits onto the
  singleton's own thread.
- **`errors` is a global.** The component client uses `errors.new` unqualified
  without a `require` (`core/component/src/component.lua:25`). Follow that
  convention in component-adjacent code.
- **Private context is immutable through some domain services.** A connection's
  `update` patches only public `title`; rotating auth is delete + register
  (`platform/connection/src/registry/connections.lua:178-193`). Decide upfront
  whether your kind allows `PATCH_CONTEXT` or forces recreate.
