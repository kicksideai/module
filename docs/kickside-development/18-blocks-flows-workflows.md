# Blocks, Flows, Workflows, And Ports

This page defines the executable-composition vocabulary. These terms are not
interchangeable.

- **Block**
  - **Contract:** `registry.entry`, `meta.type: kickside.block`, `data.block.api_version: kickside.block/v1`
  - **Owns:** One typed executable capability
- **Flow**
  - **Contract:** One native Dataflow DAG and its durable run state
  - **Owns:** Execution, nesting, parking, signals, recovery
- **Workflow**
  - **Contract:** A user-owned, versioned visual definition
  - **Owns:** Authoring, validation, publishing, run history
- **Port**
  - **Contract:** A named connection point
  - **Owns:** A Block result route or an Automation source/destination
- **Automation**
  - **Contract:** A configured, ongoing product behavior
  - **Owns:** Trigger and domain lifecycle

## Block

A Block is one exact capability declaration. It owns:

- object schemas for `input`, `config`, and `output`;
- an `error` schema paired with a `failed` output port;
- explicit output ports;
- display-only presentation metadata;
- exactly one execution target: `function`, `agent`, or `wait`.

A Block lowers directly to one native Dataflow node. There is no Block wrapper
executor and a Block does not return another graph. The caller that composes a
Flow owns the DAG; Blocks supply validated node plans.

Minimal function Block:

```yaml
- name: block.enrich
  kind: registry.entry
  meta:
    type: kickside.block
    public: true
    title: Enrich record
  data:
    block:
      api_version: kickside.block/v1
      input:
        type: object
        additionalProperties: true
      config:
        type: object
        additionalProperties: false
        properties:
          mode: { type: string, enum: [fast, thorough] }
      output:
        type: object
        additionalProperties: true
      error:
        type: object
        required: [code, message]
        properties:
          code: { type: string }
          message: { type: string }
      ports:
        - { id: result, label: Result, direction: out }
        - { id: failed, label: Failed, direction: out }
      presentation:
        category: Data
        icon: tabler:sparkles
        hue: blue
      execution:
        kind: function
        function_id: acme.enrichment:run
```

The function receives exactly `{ input, config }`. Its declaration is closed:
unknown fields fail validation. A `failed` port and `error` schema must be
declared together.

Public registry tools are projected as virtual Blocks by `kickside/blocks`.
Their function id and JSON schemas stay authoritative; do not duplicate a tool
as a second Block declaration.

## Flow

A Flow is an executable Dataflow DAG. It is the single durable execution state
for every node in the graph, including nested nodes. Dataflow owns scheduling,
node data, nesting, parking, signaling, and restart recovery.

Headless composition does not require `kickside/workflows`:

1. Discover or resolve exact Blocks through `kickside.blocks:blocks`.
2. Validate instance config.
3. Lower each Block to one native node plan.
4. Assemble those plans and edges into one Dataflow command stream.
5. Start the Flow under the caller's actor and scope.

Portable package declarations use `registry.entry`, `meta.type: kickside.flow`,
and `data.flow.api_version: kickside.flow/v1`. Their checksum, references,
binding, and materialization contract is owned by `kickside/blocks`, so a
business module can publish the declaration without depending on Workflows.
The resulting materialized document may be compiled by Workflows when that
optional product is installed, or its Blocks may be lowered by a headless
Dataflow composer.

The application binds Dataflow's execution-identity contract to
`kickside.execution:execution_identity`. A deferred or restarted Flow
resolves the selected principal against live authority; the Flow does not
select an application-wide user scope.

## Durable Human Wait

A wait Block lowers to `kickside.blocks:await`. The node commits its park
before invoking an optional provider-owned arm. A callback resumes it with the
Flow id and the native signal id through `kickside.blocks:resume`.

This remains true when the wait is below an Agent node or nested Flow:

- the concrete node id, not the declaration id, is the durable signal identity;
- the park belongs to the one Dataflow state;
- the Flow's persisted execution identity authorizes resume;
- restart recovery reconstructs that identity before the orchestrator resumes.

`kickside.inbox:block.review` is the reference implementation: Inbox owns
assignment and the review item; Blocks/Dataflow own parking and signaling.
Visual Workflows is not a dependency of the Inbox Block.

### Inbox review fields

`kickside.inbox:block.review` receives the object to review as `input` and requires
`config.prompt`. Without `title_expr`, the prompt remains the Inbox item title.
An optional `title_expr` derives a title for each item, including each iteration
of a For each. When it differs from the title, the prompt appears above the
reviewed facts. The expression uses the same Wippy expression language as Automation expression
transforms, with `input` bound to the reviewed object; there is no string template
syntax. The expression must return a non-empty string.

`config.form` is an optional JSON Schema object. Each property can declare a
`default_expr` using that same `input` environment. The Inbox arm evaluates it
once when creating the review and stores its result as the property's `default`
in the item schema. It overrides a static `default` only when explicitly declared;
otherwise static defaults keep their existing behavior. Expression errors,
missing results, and values that do not match the field's type or enum fail the
arm. Expressions do not mutate the input or the configured schema.

```yaml
prompt: Review the follow-up and approve or reject it.
title_expr: "'Follow-up: ' + input.deal.name"
form:
  type: object
  required: [subject, body]
  properties:
    subject:
      type: string
      title: Subject
      default_expr: input.email.subject
    body:
      type: string
      title: Email draft
      format: textarea
      default_expr: input.email.body
```

String fields render as text inputs; `format: textarea` selects a multiline
editor. Number/integer, boolean, and scalar enum fields retain their numeric,
checkbox, and select controls. Enum options and defaults preserve their string,
number, or boolean types through submission. The reviewed input and context remain read-only
facts rendered by Inbox's `decision_content`; editable fields appear below them.

Approval and rejection return `{outcome, form}` through the existing Block
output. `form` contains the submitted values, including reviewer edits. A
following step must read `output.form.subject` and `output.form.body` to use the
approved email, rather than copying the original draft. For example, an edge
transform can map `{subject: output.form.subject, body: output.form.body}` into
the next Block's input. Approve routes through `then`; reject routes through
`else`. Existing item metadata, persisted decisions, ports, and output shapes
remain valid without migration.

## Workflow

`kickside/workflows` is the optional visual authoring and lifecycle plugin.
A Workflow is a component whose authoritative definition is its event stream.
Published versions are immutable. Its executable nodes are exact Blocks or
exact published nested Workflows.

The structural node kinds are `start`, `finish`, `error`, `branch`
(Condition), `cycle` (Loop), `for_each` (For each), and `combine`. Start, Finish, and Error compile into routing boundaries; they are not
placeholder functions.

Publishing folds and validates the document, freezes the compiled version, and
records the version. Launch remints native node and data ids for an independent
Dataflow run. The UI is one consumer of the same Block catalog; it does not own
Block execution.

## Ports

Port is one word with two precise declaration locations:

- A **Block output port** lives in `data.block.ports`. It routes the result of
  one Block instance inside a Flow. Block ports currently have
  `direction: out`.
- An **Automation port** is a standalone `registry.entry` with
  `meta.type: kickside.automation.port`. It exposes a source or Destination
  backed by an event, `kickside.data:pullable`, or
  `kickside.data:writable` binding.

Do not declare ports in a binding's `meta.ports`. The standalone Automation
port is the discoverable catalog record; the binding remains the callable
contract implementation.

Use a Block for an executable step in a Flow. Use an Automation port when an
ongoing Automation must connect to an external source or Destination. A module
may publish both when both surfaces are real.

## Ownership Boundaries

- `kickside/blocks`: Block contract, discovery, validation, lowering, portable
  Flow declaration materialization, durable wait and resume.
- `wippy/dataflow`: Flow runtime state and orchestration.
- `kickside/workflows`: optional visual definitions, publishing, compiler,
  and Workflow run UI.
- Product modules: their own Blocks, Automation ports, contracts, events, and
  provider-specific wait arms.

This separation lets a module publish reusable business capabilities without
depending on the visual Workflow product.
