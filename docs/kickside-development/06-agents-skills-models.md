# Agents, Skills, And Models

Agents are component-backed user resources assembled at runtime by a resolver.
Skills are versioned procedure bundles agents author and invoke. Models are
DB-discovered catalog records resolved through classes. Traits and tools are the
registry surface any module uses to extend agents.

File citations in backticks (for example
`platform/agents/src/agent_resolver.lua`) are kicksideai/kickside repository paths for source
grounding. The page stands alone; the citations tell you where each rule is
pinned.

## Ownership

- **`kickside.agents`** — `agents`/`tools` contracts, `user_agent` kind, resolver binding, runner, built-in traits, agent CRUD API
- **`kickside.skills`** — skills/skill_versions/skill_files storage, store dispatchers, Skills trait, `Skill`/`SkillFile` tools, reserved runtime
- **`kickside.models`** — model classes, DB provider profiles, model discovery, model card overlays, `wippy.llm:model_resolver` binding
- **any module** — its own traits and tools under `src/traits/`

## Traits

A trait (a "capability" in the UI) is one `registry.entry` with
`meta.type: agent.trait`: a static prompt fragment, optional prompt/build
functions, and member tools. The agents module discovers traits purely through
the registry; a contributing module has no code coupling back to
`kickside.agents` (`platform/inbox/src/traits/_index.yaml`).

Modules ship traits under `platform/<module>/src/traits/` with an `_index.yaml`
whose namespace is `kickside.<module>.traits`. Sub-families nest with their own
`_index.yaml` (`platform/knowledge/src/traits/kb_ingest/`).

Trait entry fields (`platform/knowledge/src/traits/_index.yaml`):

- **`meta.type: agent.trait`** — Required; makes the agents module pick the entry up
- **`meta.title` / `icon` / `comment` / `tags`** — Picker metadata
- **`meta.public: true`** — Offered in the Capabilities picker
- **`meta.private: true`** — Never listed; resolver-attached only
- **`meta.web_component`** — Config UI element for the trait
- **`meta.context_schema`** — JSON schema for the trait's `trait_contexts` payload; properties carry `role: picker\|value` and their own `web_component`
- **`prompt`** — Static prompt injected while the trait is active
- **`build_func_id`** — Function run once at compile; folds config context into the prompt
- **`prompt_func_id`** — Function run each step; injects a dynamic prompt
- **`tools`** — Member-tool registry ids the trait activates

A static trait needs only `prompt` + `tools`. Complete example
(`platform/inbox/src/traits/_index.yaml`):

```yaml
  - name: inbox_submit
    kind: registry.entry
    meta:
      type: agent.trait
      title: Submit to Inbox
      public: true
      icon: tabler:inbox
      comment: Escalates an item to a person's review inbox for approval or attention.
      tags: [inbox, review, hil]
    prompt: |
      You can send an item to the human review inbox using the SubmitToInbox tool.
    tools:
      - kickside.inbox.traits:inbox_submit_tool
```

A configured trait declares `context_schema` + `web_component`; the agent
editor writes chosen values into the agent's `trait_contexts[<trait_id>]`, and
the resolver validates that map against each schema before launch
(`platform/agents/src/agent_resolver.lua`). Trait config UI is the
declared web component, never code inside the agent editor.

The function hooks are ordinary `function.lua` entries with `method: execute`:
`init_skills` (build) folds `context.skill_ids` into the prompt at compile
(`platform/skills/src/traits/_index.yaml`); `active_skills` (prompt) runs
each step (same file, lines 28-37).

Runtime activation: `trait_curator`/`trait_master`
(`platform/agents/src/traits/_index.yaml`) let an agent toggle other
traits mid-session by emitting a `_control.config.traits` directive that
recompiles the session.

## Tools

A tool is a `function.lua` entry with `meta.type: tool` — the only registry
kind an LLM calls directly. Complete example
(`platform/inbox/src/traits/_index.yaml`):

```yaml
  - name: inbox_submit_tool
    kind: function.lua
    meta:
      type: tool
      title: Submit to Inbox
      mcp:
        required_scopes:
          - state.read
          - state.write
      llm_alias: SubmitToInbox
      llm_description: Send an item to the human review inbox for approval or attention. Returns the created item id.
      input_schema: |
        {
          "type": "object",
          "properties": {
            "title": { "type": "string", "description": "Short summary shown in the inbox" },
            "content": { "type": "string", "description": "Detail and context for the reviewer" },
            "priority": { "type": "string", "enum": ["low", "normal", "high", "urgent"], "description": "Defaults to normal" },
            "item_type": { "type": "string", "description": "Declared inbox item kind; defaults to notice" },
            "trace_context": {
              "type": "object",
              "properties": {
                "trace_id": { "type": "string" },
                "run_id": { "type": "string" },
                "caused_by_event_id": { "type": "string" },
                "correlation_key": { "type": "string" }
              },
              "additionalProperties": false
            }
          },
          "required": ["title"]
        }
      output_schema: |
        {
          "type": "object",
          "properties": {
            "success": { "type": "boolean" },
            "id": { "type": "string" },
            "error": { "type": "string" }
          },
          "required": ["success"]
        }
    source: file://inbox_submit.lua
    method: handle
    modules: [security]
    security:
      policies: [kickside.inbox.security:submit_output_publish]
    imports:
      inbox_writer: kickside.inbox.persist:inbox_writer
```

- **`meta.type: tool`** — Required
- **`meta.llm_alias`** — Function name the model sees (`SubmitToInbox`, `QueryKB`)
- **`meta.llm_description`** — Model-facing description
- **`meta.input_schema`** — JSON string (block scalar or escaped inline); argument contract
- **`meta.output_schema`** — JSON string documenting the return; must match the return convention
- **`meta.mcp.required_scopes`** — Capability scopes (`state.read`, `state.write`)
- **`source` / `method`** — Lua file and exported function
- **`modules`** — Host modules the impl may require (`security`, `contract`, `ctx`, `funcs`, `json`)
- **`imports`** — Aliased registry entries the impl may require

Tools call service/contract layers, not direct SQL, unless the tool belongs to
the persistence module.

### Binding paths

Two independent paths put a tool on an agent
(`platform/agents/src/agent_resolver.lua`):

1. Via a trait: the trait's `tools:` list. A trait can wildcard a whole
   namespace — File Manager binds `kickside.uploads.traits:*`
   (`platform/uploads/src/traits/_index.yaml`).
2. Directly on the agent: the persisted `tools: [...]` array in private
   context, copied verbatim into the tool list.

### Trait context reaches tools through ctx

The compiler binds `trait_contexts` values onto the tool's execution ctx; the
tool reads them with `ctx.get("kb_ids")`. The positional `context` parameter is
the unit-test injection seam only
(`platform/knowledge/src/traits/kb_query.lua`). A tool that reads config
from its args gets nils at runtime.

### Return conventions

A tool handler returns `(result, err)`. One convention covers every tool;
`kickside.contract:tool_result` provides typed and domain error constructors
(`core/contract/src/tool_result.lua`).

- **Success** is any non-nil result: an object, a compact collection page
  with its declared continuation fields, a Markdown document string, or a
  control object. Return that value directly. `tool_result.ok(value)` returns its input
  unchanged; it adds no success envelope.
- **Typed failure** for invalid input, a missing resource, denied access or an
  unavailable or failed dependency: `return nil, err` with
  `errors.new({ kind = errors.INVALID | NOT_FOUND | PERMISSION_DENIED |
  UNAVAILABLE | INTERNAL, message = ... })`. `tool_result.fail(kind, message,
  details)` constructs it. Libraries a tool calls return typed errors, so the
  tool returns an operation's error unchanged (`return nil, err`) or adds
  context with `errors.wrap(err, message)`, which keeps its kind.
- **Domain error** for an outcome the caller acts on:
  `{ success = false, error = "...", <structured fields such as code> }`,
  built with `tool_result.domain_error(message, fields)`. Preserve domain fields
  when returning it.
- A bare string is never an error: `return nil, "..."` is a defect.

`output_schema` describes the actual result and domain error fields. Do not
JSON-encode a table into text. List operations return compact summaries and
retain paging. Use the declared `fields` input to select extra row fields,
then the corresponding get operation to read one whole object. Paging uses
the tool’s declared cursor, offset, or provider page token; the names are not
interchangeable. CRM lists project selected `values` while `CRMGetRecord`
returns the whole record. Provider get operations return the complete
sanitized object; lists use their declared summary projections.

Callers receive both failure forms:

- **Agents**: a typed failure is the tool call's error; a domain error is the
  call's structured result.
- **MCP** (`platform/mcp/src/dispatcher.lua`): successful objects are JSON in
  text content. Both failure forms are `isError: true`. A
  typed failure carries `structuredContent.error = { kind, message,
  retryable, details }`; a domain error carries the table itself as
  `structuredContent`. Domain-error text is the same JSON; typed-error text
  contains the diagnostic message.
- **Workflows**: a tool Block routes a typed failure to its Failed port
  (`code = FUNCTION_EXECUTION_FAILED` with the message) and delivers a domain
  error on its Result port as structured data.

Current examples:

- Typed failures: `RunFlow` (`platform/workflows/src/agent/agent_tool.lua`,
  `INVALID` input, `NOT_FOUND` version), WebScout read, links and search
  (`providers/webscout/src/traits/read.lua`), the documentation reader
  (`app/src/app/documentation.lua`, `NOT_FOUND` page), the remote MCP tool
  (`providers/mcp-client/src/invoke_tool.lua`, the worker's typed error carried
  across the process boundary as `{ kind, message, retryable, details }`).
- Domain errors: `RunFlow` returns `{ success = false, error, run_id }` for a
  run that ends failed; Journal handle resolution returns
  `{ success = false, code = "handle_ambiguous", candidates }`
  (`chestor/journal/src/traits/support.lua`); provider tools return
  `{ success = false, error }` for refused provider operations
  (`providers/github/src/traits/read_tool.lua`); CRM tools
  (`crm/src/traits/crm_tool.lua`).
- Markdown: `kb_get_node_tool` (`providers/kb10/src/traits/node_tools.lua`).
- Control: `redirect_action` and `skill_tool` activate
  (`platform/skills/src/traits/skill_tool.lua`) return an object carrying a
  `_control` directive; a tool that returns either Markdown or a control
  object declares `output_schema` as a `oneOf`.

## Rich Artifacts

`kickside.agents.traits:artifacts` is the public **Artifacts** capability. New
user agents receive it by default from both registry and HTTP creation paths;
existing agents retain their persisted capability set, and an explicit empty
`traits` array remains an opt-out (`platform/agents/src/types.lua`,
`platform/agents/src/registry/agents.lua`,
`platform/agents/src/binding/user_agents_func.lua`).

The capability contributes `CreateArtifact` plus a bounded live catalog of
approved page and component identifiers. `CreateArtifact` is intentionally not
public as an individual tool: selecting it without the capability would omit
the catalog and could register the same LLM alias twice. Configure it through
the agent editor's Capabilities picker.

The tool accepts exactly one content mode
(`platform/agents/src/traits/create_artifact.lua`):

1. bounded Markdown or HTML text with its required `content_type`
   (`text/markdown` or `text/html`);
2. an auto-registered component tag present in the live component registry;
3. a component or page registry id from which the server constructs package
   JSON.

Arbitrary package JSON, unregistered tags, mixed modes, unknown registry ids,
undeclared or unsafe component props, oversized props, and empty content fail
before an artifact control record is emitted. Component props are validated
against the live projected JSON schema and cannot set event-handler or
host-control attributes. Catalog output is sorted, deduplicated,
identifier-only, and bounded so registry descriptions cannot become artifact
prompt instructions
(`platform/agents/src/traits/build_artifacts_catalog.lua`).

The tool returns `_control.artifacts` with canonical
`display_type: standalone|inline`; `type` is reserved for the persisted artifact
content kind. `wippy/session` owns persistence and the opaque token used for
`instructions: true` inline rendering. Session owns standalone artifact persistence and chat messages; Web Host owns
rendering and the artifact catalog exposed to the client. Install current
compatible releases through Hub Update all. Verify the resulting artifact in
chat or the gallery under the intended user; a successful creation result
alone does not prove the client renders it.

## Skills

A skill is a Component whose primary thread stores append-only version events.
A projection folds those events into the current read model. Bundle files live
in the injected filesystem and are referenced by SHA-256 in each version event;
there is no separate skills/versions/files SQL schema. Refinement appends a new
immutable version through the same writer. See `platform/skills/src/README.md`.

Store dispatchers are per-method `function.lua` entries
(`platform/skills/src/_index.yaml`): commands (`skill_create`,
`skill_refine`, `skill_delete`, `skill_share`) route to `persist/writer.lua`;
queries (`skill_get`, `skill_list`, `skill_list_files`, `skill_read_file`,
`skill_list_versions`) to `persist/reader.lua`. Each runs under the caller's
actor so the component service enforces per-skill access; calling
reader/writer outside that actor context bypasses the access model. The
`skill_runtime` contract exposes only `activate`/`list_files`/`read_file`.

The agent surface (`platform/skills/src/traits/_index.yaml`):

- Skills trait: `web_component: kickside-skill-picker`,
  `context_schema.skill_ids`, `build_func_id: init_skills`,
  `prompt_func_id: active_skills`, tools `skill_tool` + `skill_file_tool`.
- `Skill` tool: actions `list`/`use`/`activate`/`deactivate`/`save`/`refine`/
  `delete`/`share`/`unshare`. The handler maps each action to a store
  dispatcher via `funcs.call("kickside.skills:" .. fn, parsed_args)`
  (`platform/skills/src/traits/skill_tool.lua`), carrying the caller's
  actor. `activate`/`deactivate` mutate the session's `active_skills` set with
  a `_control` directive, not the store.
- `SkillFile` tool: reads bundled files on demand by `skill_id` + `path`.

Pinned skills: when `trait_contexts["...:skills"].skill_ids` is set,
`init_skills` bakes those skill bodies into the prompt at compile.

Bundled scripts are stored as files and are not executed. `skill_runtime`
exposes only `activate`, `list_files`, and `read_file`. Procedure activation
retains the agent’s execution identity and grants no additional resource access.

## Agents

User-created agents are Components. Built-in agents use registry declarations. Core entries in
`platform/agents/src/_index.yaml`:

- **`kickside.agents:agents`**
  - **Kind:** `contract.definition`
  - **Role:** CRUD facade: create/find/upsert/update/delete/list, attach/detach kb and tool
- **`kickside.agents:tools`**
  - **Kind:** `contract.definition`
  - **Role:** Read-only tool discovery: find/list
- **`kickside.agents:user_agent`**
  - **Kind:** `contract.binding`
  - **Role:** The kind backing every user agent; its id is the `impl_id` discriminator (`platform/agents/src/types.lua`); component class `agent`; binds `kickside.contract:component`, `kickside.contract:deletable`, `kickside.data:writable`
- **`kickside.agents:agent_resolver`**
  - **Kind:** `contract.binding`
  - **Role:** Binds `wippy.agent:resolver` (`default: true`)

Registry-authored agents are `registry.entry` declarations with
`meta.type: agent.gen1`, `prompt`, `model`, and optional `traits`. The
`kickside.dm.agents:greeter` entry in `platform/dm/src/agents/_index.yaml`
shows this shape. User agents are component instances with `impl_id:
kickside.agents:user_agent`; their sessions resolve the component configuration
through `kickside.agents:agent_resolver`. A session uses `wippy/session` and
retains its acting user while traits and tools compile. The resolver accepts
`user_agent:<component_id>` for an instance, checks READ access, and fails
closed when its configured model or trait context is invalid.

Agent config persists in the component's private context as `AgentConfig`
(`platform/agents/src/types.lua`): `prompt`, `model`, `temperature`,
`max_tokens`, `thinking_effort`, `traits`, `trait_contexts`,
`trait_agent_options`, `agent_options`, `tools`, `delegates`,
`memory_target_id`, `memory_provider_id`. Rendered fields
(title/description/icon/status/model) are public meta.

### Resolver assembly

`platform/agents/src/agent_resolver.lua:resolve` (bound to
`wippy.agent:resolver`):

1. Accepts `user_agent:<component_id>` or a bare id (lines 154-160).
2. Opens the component service under the caller's actor + scope and gates on
   READ access (lines 124-145, 183-194).
3. Rejects components whose `impl_id` is not `kickside.agents:user_agent`.
4. Builds traits from `private_ctx.traits`, attaching validated per-trait
   `context` and `agent_options`; seeds master-trait runtime context
   (lines 221-264).
5. Auto-attaches the private `delegate` trait when delegates exist and turns
   each delegate into a sanitized LLM tool (lines 273-302).
6. Copies `private_ctx.tools` verbatim into the tool list (lines 266-271).

### Memory

Memory provider behavior stays inside provider contracts: activate/load the
memory target, list/read memory files, write recall or ingest through the
owning KB/skill/upload services. The agent runner carries no provider-specific
memory storage.

## Models

An agent's `model` is a concrete model name or a class reference
`class:<name>`; the create-time default is `class:fast`
(`platform/agents/src/types.lua`). The resolver fails closed when `model`
is missing rather than substituting a default
(`platform/agents/src/agent_resolver.lua`).

Model classes are `registry.entry` with
`meta.type: kickside.models:model_class`
(`platform/models/src/classes/_index.yaml`), each carrying `key`, `title`,
`weight`, `capability`. The shipped vocabulary is exactly:

- **`nano`** — generate
- **`fast`** — generate
- **`balanced`** — generate
- **`premium`** — generate
- **`embed`** — embed

`llm.model` cards are not shipped statically; the catalog ships only the
`policy` library. Models are discovered from a configured provider profile at
onboarding, then admins assign classes. Discovered models get no broad
inferred aliases, so an agent hard-coding a vendor model id may not resolve on
another install — reference classes (`platform/models/src/README.md:12-19`).

Provider profiles are DB-backed (`llm.provider`, encrypted secrets), holding
endpoint/auth/config; model cards hold call defaults and classes.
`kickside.models:model_resolver` binds `wippy.llm:model_resolver`
(`default: true`) so `llm.generate/structured_output/embed/status` resolve DB
model cards before registry defaults (`platform/models/src/_index.yaml`).

Adding a provider: one adapter in `platform/models/src/discovery/providers/`,
registered in the discovery registry, published in the discovery
`_index.yaml`, with the provider id wired through DB profile types/presets. Do
not patch vendored `wippy.llm` for connector-level discovery.

## Identity

Tool execution uses the session's current actor and scope. The resolver checks
READ access to `kickside.agents:user_agent` and its component config. A tool
uses `ctx.get("<trait field>")` for its validated trait context; for example,
[CRM’s tool adapter](https://github.com/kicksideai/crm/blob/main/src/traits/crm_tool.lua)
reads `ctx.get("crm_id")`. A trait that
manages dynamic capabilities can read the validated `ctx.get("trait_contexts")`
map. Do not treat a prompt-provided component ID as authorization: call
`component.validate_access` in the current frame. For deferred work, the
owner stores a selected execution identity and resolves live authority at
execution; see [Execution Identity And Deadline Jobs](20-execution-identity-and-jobs.md).

Actor guard inside a tool (`platform/inbox/src/traits/inbox_submit.lua`):

```lua
    local actor = security.actor()
    if not actor or not non_empty_string(actor:id()) then
        return { success = false, error = "authenticated actor is required" }
    end
```

Component access from a tool uses the actor-bound client and preserves errors:

```lua
local opened, err = component.open(kb_id, component.ACCESS.READ, target_contract)
if err then return nil, err end
return opened:get_status({})
```

Because the tool runs under the caller's actor, `validate_access` resolves
against that user's grants, and the actor propagates into any service or store
the tool calls (uploads `contract:open`, skill `funcs.call` dispatchers) — no
tool re-implements authorization. Modules are permission-agnostic: HTTP auth
is the host router's job; per-resource access is the component service's job.

## Gotchas

1. An empty system prompt is substituted with "You are a helpful AI
   assistant." because the Claude provider rejects empty text blocks tagged
   for prompt caching (`platform/agents/src/agent_resolver.lua`). The
   missing-model case, by contrast, fails closed.
2. Dangling delegates are dropped, not errored: when a delegate's target agent
   is deleted, the resolver omits it from both the tool list and the delegate
   prompt. Delegate tool names are slugged to `^[a-zA-Z0-9_-]+$` with
   collision suffixes (`agent_resolver.lua`).
3. Some traits are hidden or auto-attached: `redirect` is assignable but
   hidden from the Capabilities picker (configured via a dedicated tab);
   `delegate` is `meta.private: true`. A picker listing `agent.trait` entries
   must honor `public`/`private`
   (`platform/agents/src/traits/_index.yaml`).
4. Master traits recompile the session mid-turn via `_control` directives
   (`config.traits`, `context.session.set`); the resolver seeds
   `base_traits`/`self_id` so activation never drops the agent's own traits
   and does not leak across a redirect (`agent_resolver.lua`).
