# Glossary

Use these terms consistently in product text, registry declarations, and code.

## Product terms

- **Automation:** Installed, configured ongoing behavior with drives and
  rounds owned by `kickside.automation`.
- **Data Sync:** Automation kind that connects a Source through a transform to
  a Destination.
- **Source / Destination:** Readable/pullable input port and writable output
  port of a Data Sync.
- **Block:** Reusable typed executable capability.
- **Flow:** Native Dataflow DAG and one durable run.
- **Workflow:** Saved visual definition that publishes immutable Flow versions.
- **Capability:** Agent feature selected by a user; its registry type is
  `agent.trait`.
- **Chat:** User-facing agent session. **Channel:** External room or direct
  message transport. **History:** Past runs, events, or activity shown in UI.
- **Interval, Periodic, Cron, Once:** User-facing schedule choices. The
  Automation cadence library computes their deadlines.

## Author terms

- **Package ID:** Hub `organization/module` identity in `wippy.yaml`.
- **Root namespace:** Name declared by the package's root `ns.definition`.
- **Entry ID:** Exact static `namespace:name` registry identity.
- **Component ID:** Runtime resource UUID owned by `kickside.component`.
- **Component kind:** `contract.binding` used as a component's `impl_id`.
- **Private context / public meta:** Component configuration and protected
  state / component render state. Public meta contains no secret.
- **Thread:** Durable event stream whose ID equals its thread-backed
  component ID.
- **Input / output event:** Declared request event / declared domain result event.
  Both require component WRITE; `system_only: true` outputs require trusted
  framework maintenance authority.
- **Projection:** Leased worker that folds events into a read model and may
  explicitly update public meta.
- **Automation drive / round:** Source and cursor for an installed Automation /
  bounded leased execution of that drive.
- **Port:** `kickside.automation.port` registry entry for a source or
  destination; Block result ports are `data.block.ports`.
- **`identity_key` / `idempotency_key`:** Stable destination record identity /
  one delivery's retry identity in the writable contract.
- **Execution identity:** Selected typed principal and authorizer stored with
  durable work, resolved against live authority before execution.
- **Job slot:** Reusable leased job addressed by canonical identity and woken
  by transaction signal or exact deadline.
- **Host requirement:** `ns.requirement` whose concrete resource is supplied
  by the application profile or install plan.
