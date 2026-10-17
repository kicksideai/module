# Execution Identity And Deadline Jobs

A component's durable work uses one selected principal and live permissions. The
owner of a deferred operation records an execution identity; the trusted worker
resolves it again at execution. A deleted, suspended, or unauthorized principal
cannot keep exercising an old grant. See `core/execution/src/execution_identity.lua`,
`core/component/src/persist/context_ops.lua`, and `core/jobs/src/jobs.lua` in the
KickSide release source.

## Select a principal

`kickside.execution:execution_identity` is the sole constructor and resolver.
A principal is `{ kind = "user" | "group" | "service", id = "..." }`. Its `id`
is a canonical ID without a colon or whitespace. `capture()` selects the
ambient caller; `capture({ principal = { kind = "user", id = "..." },
component_id = id })` selects a delegated principal and binds a component
root. `authorized_by`, `captured_at`, credentials, and links are derived by the
owner and cannot be supplied in capture input. Selection is recorded at
capture; `resolve()` checks current authority before execution. A policy must
allow the authorizer to `security.actor.delegate` for `may_act_as` delegation.

The persisted v2 object has `version`, `principal`, `authorized_by`, optional
`component_id`, `credential_id`, `link_id`, and `captured_at`. `to_row` and
`from_row` own the SQL representation (`actor_id`, `actor_context`). Do not
construct those columns or actor keys by hand. Projection cursors, workflow runs, channel turns, and automation drives use
the same model. Jobs carry no execution identity; each worker resolves the
identity held by its owning domain record. A
trusted deferred worker needs `kickside.execution.defer` on its owner entry;
the Users scope resolver still checks the recorded principal and authorizer.

`_execution_identity` is a reserved component private-context key. An owner
changes it through the ADMIN-gated `SET_EXECUTION_IDENTITY` path: the component
service prepares a one-use identity token; its command carries that token.
Automation's `set_execution_identity` control coordinates this path. A regular
`SET_CONTEXT` or `PATCH_CONTEXT` cannot change it. Product execution roots
select ordinary User principals, including bot accounts for durable work. Grant
the bot’s resource access and the operator’s delegation separately. Framework
workers use their declared system identity. The component owner cannot grant itself `may_act_as`.

A synchronous tool or Block executes in its calling frame. It should check
component access in that frame and pass the selected identity to durable
work through the owner contract. Do not manufacture a scope or user actor in
application code.

## Schedule a durable job

`kickside.core.jobs:jobs` owns leased jobs and exact deadlines. The public
`enqueue` input requires `namespace`, `scope`, `key`, `owner_locator =
{kind, id}`, `job_type` (the worker entry ID), and an `immutable_payload`
table. Optional fields in `core/jobs/src/jobs.lua` include `scheduled_at`,
`slot`, `wake_key`, `parked`, `thread_id`, `trace_context`, `priority`, `max_attempts`, and
`concurrency_key`. For example, a domain owner can enqueue a single deadline:

```lua
local jobs = require("jobs") -- function entry imports jobs: kickside.core.jobs:jobs
local result, err = jobs.enqueue({
  namespace = "deals", scope = workspace_id, key = "sla:" .. deal_id,
  owner_locator = { kind = "component", id = workspace_id },
  job_type = "acme.deals.jobs:sla_worker",
  immutable_payload = { workspace_id = workspace_id, deal_id = deal_id },
  scheduled_at = deadline_rfc3339,
})
if err then return nil, err end
```

Declare the referenced worker in `acme.deals.jobs/_index.yaml` and give the
function a bounded `run(input)` method. The jobs service passes the immutable
payload as `input.payload` and the execution ceiling as the RFC3339 instant
`input.job.deadline`. Pass that deadline to blocking waits such as
`catch_up_projection`; a round supplies its earlier work deadline. Its worker
return follows the release
`core/jobs/test/src/generic_job_target.lua` pattern:

```yaml
- name: sla_worker
  kind: function.lua
  source: file://sla_worker.lua
  method: run
```

Its `run(input)` must perform the domain action from `input.payload`, return
`{ ok = true, record = { status = "completed" } }` only after that action
commits, and return `{ ok = false, job_error = "..." }` on failure. See the
executable `core/jobs/test/src/generic_job_target.lua` for the worker result
shape. Attach the domain action's required policies and grant
`kickside.execution.defer` to this exact worker entry.

The worker entry ID, owner locator, and worker's owner-held identity must be
valid for that job family; copying the example into a module without its worker and owner policy
will be refused. `enqueue` rejects `worker_ref`, `payload`, `job_identity`, and
`idempotency_key` as caller fields. The returned identity includes whether an
existing job was reused. `wake_tx(tx, wake_key)` participates in a transaction;
`wake_job(id, opts)` targets one job. `complete`, `complete_tx`, and `cancel`
close the lease lifecycle. A parked slot wakes from a transaction signal;
a sleeping slot wakes at its exact `scheduled_at`. No polling loop, periodic
schema wait, or test boot waiter belongs in a module.

A producer that commits a job and a thread fact together owns the SQL
transaction: call `jobs.enqueue_tx(tx, dbtype, params)` and the thread writer
on that transaction, then notify the job pool after commit. Public enqueue
rejects `thread_event`. Thread event declarations and output authorization
still apply. Automations, projections, and workflows
already own their job slots: application code calls their public contracts
instead of creating a competing scheduler.

## Awaited jobs and termination

A worker entry may declare `meta.job_class: awaited` when other jobs wait for
its completion, as Core's projection slot does. The policy
`kickside.core.jobs:policy.meta.worker.awaited_slots` reserves worker slots for
these job types in addition to the general pool, so waiting general jobs do not
occupy all workers needed to make progress.

Termination fences settle only when the token-qualified execution child is no
longer live; supervisor disappearance alone does not prove termination. On a
hot upgrade the pool upgrades in place, retaining its PID, slots and assignments.
Busy slots finish under their original code and then exit for replacement; idle
slots are replaced immediately. The execution deadline bounds the drain. Completion,
failure, cancellation, and recovered termination settlement wake owner deletion;
a delete waiting on a lease resumes when that execution settles.

## Security checklist

- Declare runtime capabilities on the exact resources that require them.
  Component WRITE authorizes declared domain outputs. Background producers and
  returned projection appends use the persisted execution identity with live
  resolution; framework attestations declare `system_only: true`.
- Keep product endpoints on an authenticated router with module-owned access
  policies. The host supplies security-group, router, database, and server
  `ns.requirement` values. Module source declares no host-owned defaults.
- Check component access for each runtime component ID; a registry declaration
  grants no access to its instances. Keep secrets in runtime storage, never in
  public meta or events.
- A caller's synchronous success is distinct from asynchronous projection,
  automation, or workflow completion. Read committed status from the owner.
