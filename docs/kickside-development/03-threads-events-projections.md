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

An authenticated component writer may append its stored kind's declared input
and output events. Component WRITE applies to owners, direct and group grantees,
and inherited grants; WRITE does not require READ. Outputs marked `system_only:
true` require the trusted framework maintenance path. Input events use the `user`
role and the caller's external identity. Ordinary callers cannot set `created_at`
or append reserved framework events. Every target in a batch is authorized before
insertion, and a denied target rolls back the batch. The generic
`kickside.threads:message.created` input belongs to plain Threads.

`kickside.core:threads` is the public contract. `emit` ensures the thread at
the component ID and appends its event; `append_event` and `append_events`
accept explicit thread IDs and can batch multiple writes atomically. Use the
current actor and scope of the caller. The `impl_id` selects the component
kind's retention and projection declarations on first touch. Event `body` is
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
returns the stored duplicates and their original subject versions, even after
the head or subject version advances. A sequence-only match with `expect`
returns CONFLICT. Without `subject` or `expect`, append semantics stay unchanged.

## Declare a projection worker

The normal author path is the kind's `meta.projections`:

```yaml
projections:
  - kind: acme.deals:read_model
    worker_ref: "func://acme.deals.projection:worker"
    input_mode: prefetch_events
```

The referenced entry is a `function.lua` with `meta.type:
projection.worker`, `method: run`, and no configured `security` frame.
`func://` targets `function.lua`; `proc://` targets a supervised
`process.lua`. Both schemes are required and the registry kind must match.
A non-system worker cannot be private. The owner may register a cursor through
`register_projection`, including `kind`, optional keys, start position,
worker config, event filter, and paired `debounce_idle_ms` and
`debounce_max_ms`. The scheduler stores the component's execution identity (or
an explicit system identity) on the cursor. It does not capture the first
user to touch the thread.

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

For UI badges and status, call `component.set_meta(thread_id, fields)` from
the projection. `platform/inbox/src/persist/projection.lua` is the working
fold and public-meta example; `crm-port/src/projection.lua` shows a larger
normalized read model. The worker runs under its stored, live-resolved
execution identity. Do not synthesize an actor or scope in the worker.

A durable writer that needs projection acknowledgment can call
`catch_up_projection({ thread_id = id, kind = kind, deadline = deadline })`.
`deadline` is an RFC3339 instant; pass the enclosing job or round's work deadline
so the blocking wait ends within its execution ceiling. The wait wakes the
projection slot and observes its cursor; it does not execute the projection in
the caller. Core's projection slot job declares `meta.job_class: awaited` for
reserved worker capacity. Read endpoints continue to read committed state.

## Reads, retention, and realtime

Read endpoints query committed read-model tables. They do not run the
projection synchronously or poll for catch-up. If an action needs immediate
acknowledgment, answer with the appended event or admitted run ID and let the
client observe eventual read-model state. A `component.<id>` realtime topic
wakes subscribed clients; the client refetches the authoritative endpoint and
disposes its subscription on unmount. Event retention must allow every cursor
and event Automation drive to drain; `drain_aware: true` preserves that
boundary. See [Automations And Dataflows](21-automations-and-dataflows.md),
[Execution Identity And Deadline Jobs](20-execution-identity-and-jobs.md), and
the [Deals CRM](22-deals-crm.md) walkthrough.
