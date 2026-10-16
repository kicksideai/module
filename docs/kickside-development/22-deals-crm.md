# Worked Application: Deals CRM

This walkthrough builds `acme/deals` as a workspace CRM with an event log,
read model, agent tool, event-driven workflow, and live board. The entry shapes
come from `platform/webhooks`, `platform/inbox`, `platform/workflows`, the
module template, and the external `crm-port` implementation. Replace
`acme` with your organization through the template initializer before adding
the domain files. The exact namespace is declared by `ns.definition`.

## 1. Package and host bindings

Run `make init ORG=acme MODULE_NAME=deals TITLE="Deals" GITHUB_OWNER=acme`
in a new checkout of `kicksideai/module`. Keep its `wippy.yaml` without
a release `version`, `test/` outside the publish tree, and the Makefile as the
build-command source. Add dependencies for `kickside/component`,
`kickside/core`, `kickside/automation`, `kickside/contract`,
`kickside/workflows` (when the workflow destination is used), and
`wippy/migration` as `ns.dependency` entries with `*` or `>=` compatibility ranges.
Keep module-owned `target_db`, `api_router`, `ui_server`, and
`user_security_scope` requirements without host defaults. `target_db` rewrites
both migration `.meta.target_db` and the module's `db_config.meta.db_id`, as
in `platform/webhooks/src/_index.yaml`. `api_router` rewrites endpoint
`.meta.router`; `ui_server` rewrites the module's `http.static.meta.server`.
A host supplies concrete resources and an authenticated role group at install.

Use one `acme.deals:workspace` component per workspace. Deal rows are domain
records with stable IDs in the read model; they need component shells only if
they require independent sharing, placement, or lifecycle. The workspace
component ID is also its thread ID. Register it through
`kickside.component:component` with the exact `impl_id`, `parent_id`, and
private context needed by the domain. Check the component's WRITE access in
each command handler. The shell's route and a `view.component` entry make the
board discoverable, but the registry entry ID is not a workspace ID.

## 2. Event contract and producer policy

Create `src/events/_index.yaml` in namespace `acme.deals.events`. The smallest
useful event pair is:

```yaml
version: "1.0"
namespace: acme.deals.events
entries:
  - name: deal.created
    kind: registry.entry
    meta: { type: kickside.core.threads.event }
    schema:
      type: object
      properties:
        deal_id: { type: string }
        title: { type: string }
      required: [deal_id, title]
  - name: deal.won
    kind: registry.entry
    meta: { type: kickside.core.threads.event }
    schema:
      type: object
      properties:
        deal_id: { type: string }
        amount: { type: number }
      required: [deal_id]
```

Declare `deal.created` as input and `deal.won` as output on the workspace
binding's `meta.events`, along with `meta.class`, `meta.retention`, and the
projection. A component writer may append both declared directions. Inputs use
the `user` role and the caller's external ID. The domain writer emits `deal.won`
under its execution identity; Core validates WRITE and the stored kind's output
declaration. Callers cannot set `created_at`. Mark engine attestations
`system_only: true` on their output declarations. Every new event has a registered
type and occurs in the binding's direction list. The event namespace stays under
the owning module. `core/core/src/threads/contract/event_authorization.lua` enforces
these checks for append, emit, and returned projection writes.

Use one writer for the HTTP handler, agent tool, and writable destination.
The output producer's function entry imports `component`, `contract`, and
`security`; the handler checks access before opening Threads. This follows
`core/core/test/src/test_output_publisher.lua` and
`core/component/src/component.lua`:

```lua
local component = require("component")
local contract = require("contract")
local security = require("security")

local M = {}
function M.win(args)
    local _, access_err = component.validate_access(args.workspace_id, component.ACCESS.WRITE)
    if access_err then return nil, access_err end
    local definition, get_err = contract.get("kickside.core:threads")
    if get_err or not definition then return nil, get_err or "Threads unavailable" end
    local threads, open_err = definition:with_actor(security.actor())
        :with_scope(security.scope()):open()
    if open_err or not threads then return nil, open_err or "Threads open failed" end
    return threads:emit({
        component_id = args.workspace_id,
        impl_id = "acme.deals:workspace",
        thread_class = "deals",
        type = "acme.deals.events:deal.won",
        body = { deal_id = args.deal_id, amount = args.amount },
        trace_context = args.trace_context,
    })
end
return M
```

The function entry for `M.win` sets `method: win` and attaches the output
policy above. Validate `deal_id`, amount, and the current stage before
calling it; `deal.won` is an asserted domain fact, not an untrusted UI
instruction. Append `deal.created` from a separate input command with the
same contract-open pattern and WRITE check. Do not let a request set
`created_at` or `role`. Other stage transitions need their own declared
input event and projected update.

## 3. Fold the read model

Create a `function.lua` with `meta.type: projection.worker`, `source:
file://projection.lua`, and `method: run`. Do not attach custom security to the
worker entry. On the component binding declare:

```yaml
projections:
  - kind: acme.deals:read_model
    worker_ref: "func://acme.deals.projection:worker"
    input_mode: prefetch_events
```

The worker receives `input.thread_id`, `input.events`, the current
`input.projection.body`, and `input.range` with `from_seq`, `to_seq`,
`target_seq`, and `processed_count`. Fold `deal.created` and `deal.won` into
`acme_deals` and an activity table in a transaction. Put a
unique `(workspace_id, deal_id)` key on the deal table and advance only after
all writes commit. Release every SQL handle before calling another component
or returning: SQLite has one pooled connection. The worker returns `{ body =
next_body, last_seq = input.range.to_seq }`. To publish board counts, call
`component.set_meta(input.thread_id, { open_deals_count = count })`
explicitly; returning a `meta` field does not update public meta. The Inbox
worker (`platform/inbox/src/persist/projection.lua`) demonstrates this fold
and public-meta pattern. Handle source gaps and duplicate sequences according
to the projection range and retention policy; do not rely on a read endpoint
to catch up the cursor.

For the minimal board, a dual-engine first migration creates the same
portable table in both `database("sqlite", ...)` and
`database("postgres", ...)` `up` branches. Use `migration.define` and
`db:execute` as the template migration does:

```sql
CREATE TABLE acme_deals (
  workspace_id TEXT NOT NULL,
  deal_id TEXT NOT NULL,
  title TEXT NOT NULL,
  stage TEXT NOT NULL,
  amount REAL,
  last_event_seq INTEGER NOT NULL,
  PRIMARY KEY (workspace_id, deal_id)
)
```

For PostgreSQL change `amount REAL` to `amount DOUBLE PRECISION`; the other
columns work in both branches. Add an index on `(workspace_id, stage)` for
board reads. Project `deal.created` with a parameterized insert using
`ON CONFLICT (workspace_id, deal_id) DO UPDATE` and set `last_event_seq` to
the event's `seq`. Project `deal.won` with a parameterized update of `stage`
to `Won` and `amount`, guarded by `last_event_seq < $4`. A replay of an
already applied event then leaves the row unchanged. Decode event bodies if
they arrive as JSON strings, as in `platform/inbox/src/persist/projection.lua`.
Within `db:begin()`, fold the batch and query `COUNT(*)` for open deals;
commit, release the DB, call `component.set_meta`, and return the advanced
body and sequence. The release `crm-port/src/projection.lua` shows that exact
transaction, release, public-meta, return order. A board read function
checks `component.validate_access(workspace_id, component.ACCESS.READ)` and
queries this table with bound `workspace_id`; its HTTP endpoint attaches to
the host-provided authenticated `api_router`. The read path never appends or
folds events.

Give the first migration `meta.type: migration`, `meta.target_db` supplied by
`target_db`, and an ISO-8601 UTC `meta.timestamp`. The migration runner orders
by timestamp and then entry ID. Put SQLite and PostgreSQL SQL in their
respective branches. Store UTC timestamps in a form both readers parse; use
parameterized statements in the repository. Create each table in its final
shape and verify both engines.
`test/src/_index.yaml` supplies `foreign_keys: true`; `test/.wippy.yaml` has
`vars.sqlite_path` and the PostgreSQL profile. Run `make verify`, then
`make postgres-up`, `make test-pg`, `make postgres-down`.

## 4. Publish an event source and a writable destination

The `deal.won` source port is a registry entry with
`meta.type: kickside.automation.port`, `binding: acme.deals:workspace`, and
`event: acme.deals.events:deal.won`; expose a `thread_id` picker in
`config_schema`. This is the `platform/webhooks` event-port pattern. A
provider import into Deals needs a separate `kickside.data:writable` binding
and port. Declare `meta.delivery: at_least_once` and
`meta.input_shape: record`, implement `write`. The stable
`identity_key` maps to a unique deal ID. Every writable call requires a stable
`origin`; round writes use the automation ID. Receipt identity is
`(origin, sink_op, idempotency_key)`. The real `crm-port/src/sink` shows record,
activity, relation, and membership writes and a `list_keys` reconciliation
function. Keep the destination config's `crm_id` as a runtime component ID and
check its WRITE access before appending domain facts.

CRM activity `correlation_key` identifies one real-world event across sources
that share no external ID. Colliding activity identities fold into one surviving
activity, retaining absorbed identities for lookup. A membership write to a
missing record returns retriable `dependency_missing` with the record's
`dependency_key`; it can retry when that record arrives. The sink's projection
catch-up wait ends at the round's work deadline and returns a retriable failure
if the cursor does not catch up in time. See the `kickside/crm` module's
`src/persist/repo.lua`, `src/command/writer.lua`, and `src/sink/crm_sink.lua`.

## 5. Start onboarding from a win

Publish an onboarding Workflow version in Workflows. Its exact reference is
`{ kind = "flow", id = workflow_component_id, version = 1 }` for version 1
(`platform/workflows/src/execution/flow_ref.lua`). Install a Data Sync with
`trigger = { v = 2, source = "acme.deals:deal_won_port", config = {
thread_id = workspace_id }, backfill = "none" }`, `sink_port =
"kickside.workflows:run_sink"`, `sink_config = { flow_ref = exact_ref }`,
`transform = { kind = "none" }`, and `enabled = true`. Supply `title` too,
as required by `platform/sync/src/_index.yaml`. The emitted `deal.won` is
pulled by the event drive; the round gives each item a stable identity; the
Workflow writable admits one run against that exact published version and
returns its run ID. Inspect run state through Workflows. For a human approval
step, use the Inbox Block or sink and a Flow wait tied to `trace_context`
(`run_id` and `correlation_key`); the Inbox resolution event resumes the run.
For a timed SLA, declare a schedule drive or an exact-deadline job as described
in [Execution Identity And Deadline Jobs](20-execution-identity-and-jobs.md).

## 6. Add a CRM agent tool

Declare a `registry.entry` trait with `meta.type: agent.trait`,
`meta.public: true`, `tools: [acme.deals.traits:deals_tool]`, and a
`context_schema` containing `workspace_id`. Declare the tool as
`function.lua` with `meta.type: tool`, `llm_alias`, `input_schema`, and
`output_schema`. `crm-port/src/traits/_index.yaml` is a full read/write tool
example; `platform/inbox/src/traits/_index.yaml` shows a small tool with an
output-event policy. In the handler, read the validated trait field with
`ctx.get("workspace_id")` for configured workspace selection; accept an explicit tool argument only after
checking component access, then call the same domain writer as HTTP and the
sink. Keep results inside the declared output schema. Sessions and agent
kinds are described in [Agents, Skills, And Models](06-agents-skills-models.md).
A session invokes the tool under its selected principal; deferred work
resolves that principal's live authority. Do not let a prompt choose a
privileged service principal.

## 7. Mount the live board

Build `ui/src` with the template's `make build` target. Its
`view.component` has `announced: true`, `auto_register: true`, a unique tag,
`base_path`, and `entry_point: index.js`; `http.static` serves the emitted
`static/index.js` from this module's `fs.directory`. The shell's `ui.nav_item`
points at the tag. The page uses `@wippy-fe/proxy` for authenticated reads,
then subscribes to `component.` plus the workspace component ID. On a
notification, invalidate/refetch the board read endpoint; the notification is
a wakeup, not the board state. Dispose that subscription on unmount. A route
action in the shadow root dispatches:

```ts
root.dispatchEvent(new CustomEvent('navigate', {
  detail: { path: '/deals/' + dealId }, bubbles: true, composed: true
}))
```

Size `:host` to `display: block; height: 100%; min-height: 0;`; put
`height: 100%; overflow-y: auto;` on the page root. Use PrimeVue and
`--p-*` semantic tokens. The facade owns focus ring values; the component
chooses its `:focus-visible` element using those variables. Follow the
[frontend source directive](07-frontend-and-web-components.md) and the
current official Wippy pages before editing implementation details.

## 8. Prove the complete path

The standalone test harness should assert registry IDs and references, one
input append, one authorized output emission, one denied output attempt,
projection idempotency and public-meta update, single-write destination receipts,
and a duplicate `identity_key` delivery. Exercise both SQL engines. In a
running host, create a workspace component, append a deal input, wait for its
committed read-model result through an event-driven test condition, move it to
Won, observe the one onboarding run, resolve any Inbox approval, and confirm
the board refetches on a realtime wake. Inspect the browser console after
navigation and each interaction. Run the module Makefile's verification and
publish targets; install or update it through System → Hub, with the host
supplying its requirements.

## CRM delivery recovery

CRM receipts are single-phase: a row records only a completed delivery after
its event and projection settle. The CRM event stores the payload digest,
outcome, and destination reference. Recovery checks that digest before
answering or rebuilding a missing receipt; changing the payload under the same
delivery identity returns a conflict. Receipt retention is 30 days. The live
CRM writer lease remains in the final schema and protects receipt writes.
Deleting a Data Sync retires its engine receipts and keeps destination records.
