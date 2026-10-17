# Automations And Dataflows

An Automation is an installed component with ongoing behavior. Its declaration
selects source ports, optional transforms, and destination ports. The shared
`kickside.automation` owner persists drives, rounds, cursor positions, delivery
ledger, receipts, controls, and bounded retries. Data Sync (`platform/sync`),
Channel Responder (`platform/channel`), and the automation round fixtures are
working references. A Flow is one durable DAG run; a Workflow is a user-owned
visual definition that publishes exact Flow versions. See
[Blocks, Flows, Workflows, And Ports](18-blocks-flows-workflows.md).

## Declare an automation kind

`platform/sync/src/_index.yaml` declares a `contract.binding` with
`meta.type: kickside.automation`, `meta.class: automation`, a validated
`meta.inputs` schema, an `actions` allowlist, and bindings for
`kickside.contract:component`, `kickside.contract:installable`,
`kickside.trigger:round_consumer`, and `kickside.contract:deletable`. Its
kind-specific `kickside.sync:sync_contract` handles reconfiguration; generic
round acquisition, scheduling, ledger, and receipt ownership remain in the
Automation engine. Start from that concrete binding when defining a new kind.

The install input for Data Sync requires `title`, `trigger`, `sink_port`,
`enabled`, and `transform`. `trigger` is the v2 spec: `{ v = 2, source =
"<port ID>", config = { thread_id = "<component ID>" }, backfill = "none" }`
for an event stream, or a selected collection port and its connection/config.
`transform.kind` is `none`, `expr`, `llm`, `func`, or `code` as declared by the
Data Sync schema. The source port, transform, and sink port form the dataflow;
validate sample envelopes with `/api/v1/transform/validate` before installing.
A `func` transform names its function and the resource it reads:
`{ kind = "func", ["function"] = "acme.deals:transform", resource_id =
"<component ID>" }`. Declare additional resources in `resources` as needed.
Install and reconfigure refuse a function transform without enforceable resource
references; both the operator and stored execution principal need the declared
access (`platform/transform/src/strategy/func.lua`, `platform/sync/src/round/plan.lua`).
A recurring Data Sync schedule uses `trigger.schedule = { type = "interval" |
"ticker" | "cron", expression = "..." }`. Other Automation kinds may use
`once`; the Data Sync input schema deliberately requires a recurring cadence.

An event source is a `registry.entry` with `meta.type:
kickside.automation.port`, `binding` set to its component kind, `event` set to
an exact declared event entry, and `config_schema` choosing its thread ID.
`platform/webhooks/src/_index.yaml` declares `webhook_received` this way.
Collection ports bind `kickside.data:pullable`; destination ports bind
`kickside.data:writable` and declare `operations` such as `upsert` and
`delete`. The release source has complete destination examples in
`platform/knowledge/src/sink/_index.yaml` and `platform/workflows/src/_index.yaml`.

## Drives, rounds, and timing

An installed Automation has a `main` drive and may have schedule timer drives.
One leased `kickside.automation:round` slot job per drive performs a bounded
round. A source's declared output schema describes `item.payload`. Declare its
fields directly in `output_schema.properties`; `item_key`, `dedup_key`, `op`,
and `source_version` belong to the pull envelope. Data Sync checks required
destination fields against this payload schema for a pass-through transform.
Keep provider-specific fields distinct from destination controls: a Jira issue
priority is `issue_priority`, while an inbox `priority` selects an inbox enum.
For an event
source this is the decoded event body, so an expression reads `payload.filename`
for a declared `filename` field. Event type, role and external identity belong to
the pull item's envelope, alongside its stable keys and sequence.

Event acquisition reads `kickside.core.threads:events_pullable` from a
committed sequence; collection acquisition reads the selected port's
`kickside.data:pullable`; timer acquisition reads
`kickside.automation:timer_pullable` for a persisted occurrence. These are
acquisition interfaces, not per-kind polling daemons. `platform/automation/src/round/pull.lua`
shows their exact request and page envelopes, including `source_gap`.

Cadence uses `kickside.automation:cadence.next_after` with interval, cron,
once, or ticker and a timezone. A timer drive calculates an exact deadline
and sleeps its slot to that deadline. An event append wakes waiting work.
Owner policy in `platform/automation/src/runtime_contracts/_index.yaml` bounds
work per round (page size, pages, items, and retries). The round's work deadline
is the earlier of its start plus `round.timeout` and `input.job.deadline`, minus
`round.commit_reserve`; pull, transform, delivery, and blocking sink waits use
that deadline, leaving the reserve for commit.

Stored data is bounded by age-based retention windows, with no volume caps.
The remaining size limits are `max_row_bytes`, `prepared_bytes_per_item`, and
`destination_slots_per_item`; oversized rows are refused with reason
`row_too_large`. A module should expose operational `status` and
`health` and honor `pause`, `resume`, `reconfigure`, `resync`, `replay`,
`run_now`, and `set_execution_identity` through `kickside.automation:automation` where
the kind declares them. A disabled or unhealthy drive is visible through its
owner; it is never repaired by an app-side polling loop.

## Answer a round

A `kickside.trigger:round_consumer` returns `delivered_items`, `skipped_items`,
`waiting_items`, `uncertain_items`, and `failed_items`. Every input item appears
in exactly one list, with `key = item.delivery_key`. `item_key` names a source
record and can repeat across changes; it cannot correlate delivery outcomes.
See `core/contract/src/trigger/_index.yaml` and
`platform/automation/src/round/deliver.lua`.

## Write a destination

A writable binding must declare `meta.delivery` (`exactly_once`,
`at_least_once`, or `at_most_once`) and `meta.input_shape` (`record` or
`content`), and map `write`. The engine refuses a sink without both fields.
The CRM sink uses `at_least_once` and `record`; a module binding follows this
pattern:

```yaml
- name: deal_sink
  kind: contract.binding
  meta:
    title: Deals
    delivery: at_least_once
    input_shape: record
  contracts:
    - contract: kickside.data:writable
      methods:
        write: acme.deals.sink:write
```

A `write` receives `config`, `sink_op`, `input`, stable `identity_key`,
per-delivery `idempotency_key`, and REQUIRED `origin`. The shared
`kickside.data:writable_sink.origin(request)` check rejects a missing origin or
one that differs from `automation_ref.id`. Round writes name the automation
ID. Non-round producers pass a stable explicit origin such as
`example.meetings.link`; they never derive it from an individual source item. The
stable key names the destination record; the idempotency key names one
delivery. A sink that keeps receipts keys them by `(origin, sink_op,
idempotency_key)` and scopes any key listing to the asking origin. Store the stable key under a unique
constraint and return `{ success = true, result = "created" | "updated",
dest_ref = { id = ... } }`, or a classified `{ success = false, error = {
code, message, retriable, scope } }`. `scope` is `item`, `flow`, `connection`,
or `provider` as constrained by the writable contract. Do not silently
acknowledge an uncommitted side effect.

The Automation round
commits a receipt in `kickside_automation_receipt` when a confirmed write maps
a new or changed destination; an unchanged destination keeps its row. The
round commits its cursor past the whole page, and an item it did not deliver
retries independently from the ledger in its record's order. Only held or failed
items create ledger rows; first-attempt deliveries create none. Resolved/dead
tombstones carry `expires_at`; unresolved work remains until it settles.
Deleting a sync retires its receipts and keeps the destination's records.
The `kickside.core:write_receipt` library supports reserve, commit, replay,
and reconciliation for a destination that must settle ambiguous writes; read
its library API before implementing one.

## Launch a Workflow from a component event

Declare the event on the component kind, publish an event port over it, and
install Data Sync with that port as `trigger.source`. Select
`kickside.workflows:run_sink` as `sink_port` and set
`{ flow_ref = { kind = "flow", id = "<workflow component ID>",
version = <published version number> } }` as `sink_config`.
The Run Workflow port maps to the `kickside.workflows:run` writable binding,
whose `write` implement admission (`platform/workflows/src/runs/run_writable.lua`).
The source item's stable identity becomes the run's deduplication identity;
the current automation revision travels in `automation_ref`. Publish the Flow
version first, use its exact reference, and inspect the run's admitted and
terminal states through the Workflows owner. A successful event append proves
the trigger fact, not that a run finished.
