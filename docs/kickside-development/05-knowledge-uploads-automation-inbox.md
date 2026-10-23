# Knowledge, Uploads, Automation, And Inbox

These modules are the main workflow-building blocks. They should compose through
components, contracts, ports, thread events, trace context, and public meta.

## Knowledge

`kickside.knowledge` is the KB control plane. It owns:

- KB component create/list/read/update/delete
- KB engine discovery
- the `kickside.knowledge:kb_store_lifecycle` engine store contract
- the `kickside.knowledge:knowledge_bases` registry contract
- ingestion/injection workers
- engine-neutral content admission and source projection wiring
- memory/tool traits
- the Knowledge web component surface

KB engines are independently published providers. An installation profile may
select KB10 as its default, but the control plane discovers installed engine
descriptors rather than importing provider source.

## KB Engine Descriptor

Add one `registry.entry` per engine. This trimmed document-engine declaration
shows the contract; inspect an installed engine through Hub `include_entries`
for its current ids and capabilities:

```yaml
- name: engine_document
  kind: registry.entry
  meta:
    type: kickside.kb_engine
    kb_type: document
    default: true
    title: Document
    icon: tabler:files
    impl_id: kickside.kb10:embeddable
    query_binding: kickside.kb10:queryable
    store_contract: kickside.knowledge:kb_store_lifecycle
    component:
      create: { view: kickside.kb10.ui:create_view }
      manage: { view: kickside.kb10.ui:document_view }
    projections:            # provisioned on the KB primary thread at create
      - kind: knowledge.injection.source
        worker_ref: "proc://kickside.kb10.injection:source_worker_proc"
        input_mode: prefetch_events
        events:
          input:
            - type: "kickside.knowledge.events:content.upserted"
            - type: "kickside.knowledge.events:content.deleted"
    default_config: { chunk_size: 1000, chunk_overlap: 150 }
```

`store_contract` names the engine's `kb_store_lifecycle` binding
(create/get/update/delete of the per-component store). There is no materializer
contract: source materialization is wired through the descriptor's declared
`projections` — the engine's own `worker_ref` workers. The control plane
resolves engines by descriptor. Do not branch centrally on engine names.

## Source Materialization

Public content writes go through the KB-owned durable thread. The engine's
declared source projection turns those events into engine storage:

```text
KB thread event -> declared source projection (engine worker_ref) -> kb10_*
```

Document, summary, chunk, and image source nodes are materialized from thread
events.

## KB Public Meta

The knowledge registry initializes the component-level render snapshot with:

- `status = "ready"`
- `kb_type` from the selected engine
- `auto_summary = ""` and `auto_description = ""`
- `embedding_count`, `document_count`, `concept_count`, `chunk_count`,
  `summary_count`, and `claim_count`, each set to zero

The engine owns subsequent updates to this snapshot. Its component-state
projection or another clearly owned component-state path maintains the public
meta that its views and declared stats consume. Domain helpers should not all
recompute stats and call `set_meta` independently.

## Uploads

`kickside.uploads` owns:

- upload API
- upload records
- core-job-backed processing targets
- upload tokens
- upload type registry
- processors
- original bytes
- derived artifacts
- preview endpoints
- upload web component surface

Upload types are `registry.entry` records with `meta.type = upload.type`.
Specific types outrank generic types by priority. Pure converters stay below
uploads; upload-specific artifact policy lives in uploads.

Use uploads as a conversion pipeline for workflows. If another module needs file
content, it should use the upload content/provider contract or a signed upload
token, not read upload storage directly.

Upload read-model retention obtains the safe event boundary through
`kickside.core:threads.prune_boundary`, under its declared
`threads.prune_boundary.read` policy. It does not read Core retention tables.
Retention runs every ready owner independently: one owner's failure is recorded
without stopping the other owners.

## Upload Tokens

Use upload tokens when external or decoupled code needs safe access to an upload
without inheriting the caller's ambient session.

Use ambient component/API access when code is already inside the app under the
right actor and has the upload id.

Do not pack broad private context into upload tokens. Pack only what the receiver
must prove or route:

- upload id
- purpose
- expiry
- minimal trace context if needed
- callback/correlation key if needed

The upload row may keep user-facing origin metadata for UI, but token authority
is the signed token.

## Automations

Automations are installed components driven by leased rounds over event,
collection, or timer pullables. Data Sync composes a source port, optional
transform, and writable destination. A destination implements `write`
with stable record identity and per-delivery idempotency; the
engine owns bounded cursors, receipts, and retry state. Kind authors use the
shared `kickside.trigger:round_consumer` binding shown in
`platform/sync/src/_index.yaml`. The complete current contracts and a
Workflow trigger are in [Automations And Dataflows](21-automations-and-dataflows.md).

## Inbox

Inbox is the human-in-the-loop seam.

It owns:

- item events
- inbox projection
- declarative item kinds
- public meta counts
- `/inbox` API
- `kickside.inbox.sink:inbox_sink`

Inbox item kinds are `registry.entry` records. The built-in Notice declaration
in `platform/inbox/src/_index.yaml` is a working example:

```yaml
- name: item_type.notice
  kind: registry.entry
  meta:
    type: inbox.item_type
    value: notice
    title: Notice
    icon: tabler:info-circle
    color: blue
    category: general
    severity: info
    component_tag: kickside-inbox-notice
    component_base_path: kickside-inbox
```

Workflow builders discover inbox through ports. Do not add a special inbox-only
catalog when ports can describe the sink.

## Canonical Flow Example

KB ingestion with human review:

1. User uploads files through uploads.
2. Upload processor writes artifacts.
3. KB ingest request event references upload/content by safe id/token.
4. The declared source projection writes KB source nodes.
5. Digest/enrichment emits durable events.
6. Inbox item asks for human approval.
7. User approves.
8. Workflow projection observes approval and continues.
9. KB component-state projection updates public meta.
10. Frontend receives `component.<kb_id>` and renders the new snapshot.
