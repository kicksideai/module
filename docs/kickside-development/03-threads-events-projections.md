# Threads, Events, And Projections

A component's thread is addressed by the same runtime ID as the component.
The thread stores immutable events; a projection folds them into a read model.
A realtime notification tells a client to refetch committed state. See
`core/core/src/threads/contract`, `core/core/src/threads/contract/event_authorization.lua`,
and `core/core/src/projections` in the release source.

## Declare the event vocabulary

Each application event is a `registry.entry` whose `meta.type` is
`kickside.core.threads.event` and whose `schema` describes its body. The entry
namespace belongs to the component kind's module. A component kind's
`contract.binding` divides exact event IDs under `meta.events.input` and
`meta.events.output`:

```yaml
- name: workspace
  kind: contract.binding
  meta:
    class: deals
    title: Deals
    events:
      input:
        - { type: acme.deals.events:deal.created }
      output:
        - { type: acme.deals.events:deal.won }
  contracts:
    - contract: kickside.contract:component
      methods: { get_status: kickside.core.threads:thread_status }
```

A binding may set `meta.events.read: admin` to require component ADMIN for raw
thread event reads, external-event lookups, pullables, and Core projection body
reads, cursor listings, and catch-up progress. Reads use the current declaration
of the thread's stored component kind. Adding or removing the field applies to
existing threads of that kind as soon as the declaration changes. Thread metadata
stays readable at READ. Realtime updates for `admin` threads, unresolved component
links, and publishers without a matching source binding carry an invalidation.
Clients refetch through the authorized read APIs.
Omitting the field keeps READ, including for the generic `kickside.core:thread`
kind and kinds absent from the registry. Invalid values produce a declaration
error. The Threads contract requires WRITE
and ADMIN to register or reconfigure a caller-selected projection on an `admin`
thread. Pause and resume also require both grants. Each batch applies the live
event read policy to the cursor's run-as identity before loading input. The
built-in lifecycle reaper uses the system actor that owns its queue. Each
catch-up observation uses the current policy and grants. Before a post-commit
callback receives the fold's input, Core checks that its run-as identity can
still read the source and that its declarations and cursor generation still match.
A denied cursor becomes invalid with `thread_event_read_denied`. Once the identity
can read the source, re-register without `reset` to continue from the saved
position.

An authenticated component writer may append its stored kind's declared input
and output events. Component WRITE applies to owners, direct and group grantees,
and inherited grants; WRITE does not require READ. Outputs marked `system_only:
true` require the trusted framework maintenance path. Input events use the `user`
role and the caller's external identity. Ordinary callers cannot set `created_at`
or append reserved framework events. Every target in a batch is authorized before
insertion, and a denied target rolls back the batch. Plain Threads accept the
input events declared by their stored kind.

The HTTP message endpoint appends before reading back the committed message.
On an `admin` thread, a WRITE grantee without ADMIN receives a committed,
nonretryable HTTP 403 if the append succeeded and readback was denied. The
message is already stored.

`kickside.core:threads` is the public contract. `emit` ensures the thread at
the component ID and appends its event; `append_event` and `append_events`
accept explicit thread IDs and can batch multiple writes atomically. Use the
current actor and scope of the caller. The `impl_id` selects the component
kind's retention and projection declarations on first touch. For restricted
threads, Core uses the attached component's kind for these declarations. Event `body` is
JSON encoded by the writer. `trace_context` carries `trace_id`, `run_id`,
`caused_by_event_id`, and `correlation_key` for downstream work. An external
identity contains `external_source`, `external_id`, and optional
`external_version` for deduplication. The writer owns sequence allocation,
deduplication, access checks, and post-commit wakeup.

## Subject streams and optimistic concurrency

An event may carry `subject`, a non-empty string of at most 256 bytes with no
control characters. Each inserted event receives that subject's next
`subject_version`, starting at 1. Multiple events for the same subject advance
in input order. Events and append results include both fields. A separate
stream-head row preserves the version when retention prunes events; thread
deletion removes it.

Read `threads:find({ thread_id = id, subject = "settings" })` to obtain
`subject_version` without scanning events. The result is the readable thread
with `subject` and `subject_version`; an absent subject has version 0. The
existing thread access check applies.

```lua
local saved, err = threads:append_events({
    thread_id = id,
    expect = { subject = "settings", version = current_version },
    events = { { type = "acme.settings.events:saved", subject = "settings", body = values } },
})
if err then return nil, err end
```

Each write accepts `expect = { subject = S, version = N }`, `expect = { head = H }`,
or both checks in the same object. Versions and heads are non-negative integers;
version 0 requires an absent subject. `head` is the thread's `event_count`.
Expectations are checked under the thread lock. Different subjects can advance
independently. A stale head returns CONFLICT with
`{ reason = "head_mismatch", head, expected_head }`; a stale subject returns
CONFLICT with `{ reason = "version_mismatch", subject, version, expected }`.
Malformed expectations return INVALID. A conflict in any entry of
`append_events({ writes = { ... } })` rolls back every write and stream version.
`append_event` accepts the same write-level `expect`.

An exact retry whose every event matches an existing ID or external identity
returns duplicates even after the head or subject version advances. Callers
with event-read access receive the stored receipt. Other callers receive a
duplicate indicator without the event ID, sequence, subject or version. A
sequence-only match with `expect` returns CONFLICT. Explicit event IDs are
deduplicated within the addressed thread, and an ID used by another thread
produces a collision.

## Declare a projection worker

The normal author path is the kind's `meta.projections`:

```yaml
projections:
  - kind: acme.deals:read_model
    worker_ref: "func://acme.deals.projection:worker"
    input_mode: prefetch_events
```

Use `func://` with a `function.lua` entry for a bounded fold, such as CRM's
transactional read model. Use `proc://` with a supervised `process.lua` entry
for work such as KB10 source materialization. Both declare
`meta.type: projection.worker`. Core owns the execution frame for both.
A worker that needs a native capability can declare `security.policies` entries
marked `meta.service_only: true` with no groups. Keep each policy scoped to
the operation and resources the worker uses. [CRM fold](https://github.com/kicksideai/crm/blob/crm-v0.6.14/src/persist/projection.lua) · [KB10 source process](https://github.com/kicksideai/providers/blob/kb10-v0.2.39/kb10/src/injection/_index.yaml)

Use `register_projection` when worker selection, configuration or lifetime
depends on a particular instance. Work uses it when a board enables a plugin.
The call takes projection and cursor keys, start position, config, event filters
and optional paired `debounce_idle_ms` and `debounce_max_ms`. On a user-owned
primary thread, the Threads contract loads the component's protected execution
identity. The HTTP projection registration endpoint captures the authenticated
requester's identity for the component. Core checks the selected identity's
current access before delivering a batch.
Access to the source stream and authorization for returned appends are separate
checks. [Work plugin registration](https://github.com/kicksideai/components/blob/work-v0.1.24/work/src/extensions/plugin_projections.lua)

In `prefetch_events` mode, `run(input)` receives `thread_id`, `cursor`,
`projection`, `events`, `trace_context`, and `range = { from_seq, to_seq,
target_seq, processed_count }`. Each event has a sequence, type, decoded body,
role, timestamp, external identity, and trace. Return `{ body = next_fold,
last_seq = input.range.to_seq }` only after read-model writes commit. Make SQL
writes idempotent by thread and sequence or stable domain keys; a leased batch
may run again. Check source gaps against retention before advancing. A worker
must release every DB connection or transaction before it returns or calls a
child process; SQLite's single pooled connection otherwise deadlocks.
`cursor_only` workers read their own page. The worker can return a `patch`,
but a returned `meta` field does not update component public metadata.

For UI badges and status, Channel's responder calls `component.set_meta` on
its component. Inbox publishes summary counts from a declared post-commit
callback through its scoped publisher. Each effect uses the authority required
by its destination. [Channel responder](https://github.com/kicksideai/kickside/blob/channel-v0.2.15/platform/channel/src/responder/responder_projection.lua) · [Inbox fold and callback](https://github.com/kicksideai/kickside/blob/inbox-v0.1.79/platform/inbox/src/persist/_index.yaml)

A durable writer that needs projection acknowledgment can call
`catch_up_projection({ thread_id = id, kind = kind, deadline = deadline })`.
Pass `target_seq` to wait for a committed sequence. The default is the thread
head sampled at entry, and a target above that head returns InvalidArgument.
`deadline` is an RFC3339 instant; pass the enclosing job or round's work deadline
so the blocking wait ends within its execution ceiling. The wait wakes the
projection slot and observes its cursor; it does not execute the projection in
the caller. Core's projection slot job declares `meta.job_class: awaited` for
reserved worker capacity. Read endpoints continue to read committed state.

### Fold a framework-created component's primary thread

For a component created by your module without a stored user execution
identity, declare the fold in the kind's `meta.projections` with
`input_mode: prefetch_events`. Mark its function worker as private and
component-owned.

```yaml
kind: function.lua
meta:
  type: projection.worker
  private: true
  component_owned: true
```

The kind, worker and worker policies must belong to the same installed module.
Core validates the framework-created component's declaration when it attaches
the primary projection. On dispatch it matches the thread, projection and cursor
keys, worker, event filter, configuration and debounce settings. It delivers
the assigned range under an isolated actor with an empty caller scope. Give
the worker a service-only policy for any SQL resource or owner function it
uses. For example, a fold can update its own tables and return `body` and
`last_seq`. Access to another component, publishing an event or contacting
an external service requires its own authorized path.

This mode supports function workers that return a fold without returned
event appends or a `post_commit_ref`. If the same kind also has user-owned
instances, Core checks the marked worker against the same installed declaration
and uses the stored execution identity and its current credential restrictions
for access to the source.

## Reads, retention, and realtime

Read endpoints query committed read-model tables. They do not run the
projection synchronously or poll for catch-up. If an action needs immediate
acknowledgment, answer with the appended event or admitted run ID and let the
client observe eventual read-model state. A `component.<id>` realtime topic
wakes subscribed clients; the client refetches the authoritative endpoint and
disposes its subscription on unmount. Retention never prunes past the lowest
retention pin or projection cursor, so every cursor and event Automation drive
can drain; `retention.event_days` sets the age cutoff. See [Automations And Dataflows](21-automations-and-dataflows.md),
[Execution Identity And Deadline Jobs](20-execution-identity-and-jobs.md), and
the [Deals CRM](22-deals-crm.md) walkthrough.
