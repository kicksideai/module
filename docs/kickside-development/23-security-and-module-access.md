# Security and module access

Groups carry module access. An administrator selects public module policies in
System → Security, saves a group, and assigns that group in System → Users.
A user's effective scope is the union of the policies in every assigned group.
A deny takes precedence over an allow, including an allow from another group.

Security projects each distinct sorted group set into one named native group,
`kickside.security.scopes:set_<sha256>`. Users with the same groups share that
name. Login tokens, session startup, agent resolution, relay and MCP recover
that named group. Policies retain native union and deny precedence. Membership
changes revoke the user's sessions and select another set at the next login.
Administrator and default-member sessions retain their declared group names.

`app.security:user` supplies the signed-in baseline: the shell, sessions, own
profile, agent selection for chat, asynchronous Jobs, and the core capabilities
declared in `app.composition:core_access`.
Users retain this baseline when an administrator replaces their module groups.
`kickside.security.groups:members` is the platform-owned module group. Its
declarative composition selects installed public policies with
`meta.intent: module_access`. The application's default group,
`app.security:members`, includes that group and the core group's policies.
Application-owned enrollment declarations add existing accounts to these groups
once. Later membership removals persist across restarts and module updates.

New accounts join the default group when the Users setting `join_default_group`
is true, its default. An explicit group list remains explicit. Passwordless
provisioning uses the same setting through the Users provisioning contract.
An administrator grants narrower access by removing the Members membership and
assigning one or more composed groups. For example, a Sales group includes CRM;
a group without CRM omits the CRM policy. Own-profile access remains available
when a group omits the Users module's directory capabilities. User-management
endpoints remain administrative.

Each module declares HTTP endpoints in its `api` namespace. Member-access
policies list the exact endpoint ids that members may reach. Endpoint names
do not determine access; separate audiences use their own policies and lists. The authenticated router runs `token_auth` and
`endpoint_firewall`. The firewall evaluates `access` on the endpoint's registry
id. Public callbacks use an intentional public router and verify their own
signature or token.

Registry discovery, navigation, pages, views, contract calls and MCP tool calls
use the same security scope. MCP resolves the credential owner's current groups
for each invocation and retains the credential's restrictions. Component record
ACLs remain a second required grant: module access does not grant access to
another user's records. Direct record grants cascade through the whole subtree;
removing module authority also hides its implementations through generic
component reads. Access reductions invalidate affected user sessions: removed
allow policies, added denies, removed memberships and deleted groups. Allow-only
expansions leave existing sessions valid and grant added authority through their
live memberships. A module install
therefore never signs a member out. An unchanged boot or metadata edit writes no policy
composition and leaves sessions valid.

## Execution principals and configuring authority

An execution identity records a principal, a configuring authorizer, its root,
and inherited credential/link restrictions in the existing v2 format. Selection
authority and execution access are separate. Immediate preflight authenticates
the recorded authorizer against the caller and checks the selected principal
against the selected actor. Users resolves live accounts, memberships and
native `security.actor.delegate` policy decisions. Component ADMIN alone grants
no delegation. Self-selection retains its existing rule.

The signed-in baseline opens the canonical Users scope resolver independently
of Users directory membership. The resolver retains the caller's actor and scope
and checks self-selection, live delegation and deferred-owner authority through
the same Execution path. Its function frame adds the existing private native evaluation
capability and permission to call the private subject lookup. Native evaluation
returns a decision under the live authorizer's scope; it grants no delegation
or effect authority. The lookup retains its Users-owned database identity. Raw subject lookup, credential lookup, directory management and arbitrary
actor/scope creation remain outside this baseline capability.

Component selection calls Execution's capture and live authorization before its
transaction for a delegated principal. It consumes the same native group-bound
decisions as execution, including deny precedence and live root ADMIN. It does
not interpret a policy as a separate grant record. Request digests, identity
generations and atomic identity/audit writes remain on the existing SET path.
Supervised projection processes resolve that same identity before spawning a
child. Core checks process context, spawn, monitor, link, host and any actor/scope
binding capabilities through the native evaluator with the current process PID.
A removed capability returns a nonretryable permission denial before child
creation; the native spawn operation retains its enforcement. This admission
applies to ordinary Users and system workers through the same process path.

An admitted execution frame cannot replace its principal, root or original
configuring authorizer through selection. SET retains captured credential/link
restrictions together with existing stored restrictions; conflicting references
refuse before a write, and replay cannot silently introduce a new restriction.

Security generates exact-root or explicit all-root delegation policies using
Execution's canonical policy IDs and length-prefixed resources. Its writer requires
Security administration and native `registry.apply` authority on the policy ID.
An optional `kickside.security:delegation_validator` supplies live host validation
of ordinary-user targets and execution roots. An empty or unavailable binding
withholds generated saves; Security has no mandatory Users dependency.
Operator groups come from the existing assignable Security catalog.
KickSide binds this capability to the existing protected Users subject lookup and
a minimal Component root read. Targets use canonical ordinary-user IDs and live
active status; email aliases cannot substitute a principal. Root existence grants
no Component ADMIN or execution authority. The host callback holds only subject
and root read capabilities.

Administrators open System → Security → Act-as grants to choose an ordinary User
account and explicit operator groups with the shared principal picker. They enter
an existing execution component UUID or explicitly choose all component roots.
This writes the same native group policy; it does not add membership, component
access, or implicit creator selection rights. Inventory retains revoked policy
identities. Revocation uses the same native writer and completes its reduction
fences before the UI confirms success. An uncertain result keeps the exact payload
and operation UUID for retry; a definite refusal stays visible and permits
correction. Scopes and their composition keep the existing administration path.

Delegation administration uses `/security/delegations` and its recovery endpoint.
Each mutation prepares a protected SQL operation before one native registry batch
writes the policy and an immutable operation receipt. The receipt records the
operation ID, normalized intent and expected registry revision; it never grants
authority. The SQL operation and request digest fence duplicate or conflicting
requests. Existing group/session fences and acknowledged projection finish before
success is reported. Recovery uses the same native mutation authority, preserves
the original audit actor and separately records the recovering administrator.
A revoked declaration retains its canonical ID with mutually exclusive native
resource conditions, so references remain valid while every native evaluation
returns undefined. Regrant restores the declaration through the same writer.
Revocation reduces an existing managed grant without requiring a live target/root
or an available host validator. Its administration, native policy-write, audit
and projection checks still apply.

Automation admission checks declared resources under both the operator and
the selected principal. A worker's module visibility or broad scope supplies
neither user's access. Nested execution retains the admitted principal,
authorizer, root and restrictions. Deferred owners revalidate live authority
at each execution boundary. Human sessions retain their credentials across
allow-only membership additions and use live memberships; access reductions
revoke them.

The approved bot account capability uses ordinary `{kind="user", id=<UUID>}`
principals. Users owns immutable account classification, status, credential
eligibility and memberships. Security owns native group-bound selection
policies and their reduction fences. Execution constructs actors; Component
stores protected identity and audit; Automation admits and fences installed
work. Bot memberships grant execution access, while operator memberships grant
permission to select a bot. The creator supplies provenance rather than access.
Bot creation requires exclusion at every KickSide authentication and credential
boundary and the supported-install compatibility proofs. Keeper issues tokens
only to its authenticated calling administrator. The required invariant is that
a bot never authenticates through KickSide, including when assigned the admin
group, and therefore never becomes a Keeper caller. Bot accounts add no Keeper
dependency or hook.

Users stores only newly created bot classifications in `app_user_bot_accounts`;
absence means human, including existing passwordless SSO accounts. Migration 13
creates the table without rewriting existing rows. The Users-owned
`credential_eligibility` check reads that marker live. Password verification,
password writers, provisioning lookup and completion, shared session minting and
final token indexing refuse marked accounts. Final indexing discards an ineligible
token before returning it. Future default human enrollment excludes marked
accounts; existing enrollment claims and human session credentials stay intact.

Administrators manage bots in System → Users → Bots. `POST /users/bots`
accepts only a display name (`full_name`) and an explicit `groups` array, including
an empty array. Users generates the ordinary User UUID, immutable internal email,
active status and native creator provenance. The existing passwordless insertion
primitive commits the User, marker, initial memberships and lifecycle audit in
one transaction. Bots receive no default Members enrollment. Creation checks the
live credential readiness inventory before writing anything. `GET /users/bots`
returns only marked ordinary Users through the existing user-list projection.

The existing Users management capability grants these additive endpoints and
existing group/profile/disable operations. It grants no Security administration
or execution delegation. The shared inline account editor hides bot credential
controls and default enrollment; disable retains the account, marker and audit.
The ordinary user listing includes optional `bot_account: true` only for marked
accounts; existing human rows and request bodies remain unchanged.

Bot classification and the generated internal address remain immutable. Ordinary
profile edits use the existing Users update transaction; status changes advance
the existing account and delegation fences. Deleting a marked account disables
and retains it with its marker and memberships, and never reports
`principal.deleted`. Human deletion retains the existing durable event and
cleanup. Users records bot profile, disable and effective membership changes in
`app_user_bot_audit` within the mutation transaction. Native actor context supplies
the initiating actor; request fields cannot replace it. Audit failures roll back
the mutation and its fences. Audit rows have no account or creator foreign key,
so deleting a creator preserves provenance. The shared membership helper covers
manual assignment, removal, replacement and sourced writers.

Credential consumers call the same live check through
`kickside.users.binding:credential_eligibility`. The protected function owns its
database scope and returns a boolean or the native typed error. SSO binds this
optional host capability through `kickside.sso:credential_eligibility`; an absent
binding preserves existing human hosts, while a configured binding fails closed.
Link-start and link completion check before creating a flow or provider identity,
including an idempotent link. With the guard bound, verified-email provisioning
permits only Users'
typed `USER_NOT_FOUND` result to create an account; a missing function, refusal or
lookup outage propagates. Callback presentation retains the existing error
fragment and renders the native error message. Bot readiness requires every
installed KickSide credential consumer to bind the guard before creation opens.

MCP binds the same optional capability through
`kickside.mcp:credential_eligibility`. Common mint and active credential reads
check the authenticated owner; OAuth exchange checks the stored consenting owner
before returning a bearer. Consent cannot label a credential with another actor.
A presented MCP bearer is checked during handshake as well as tool dispatch;
anonymous protocol handshakes retain their existing responses. Unbound custom
hosts retain their behavior, and KickSide bot readiness requires the installed
MCP consumer to enforce the Users guard through the host or its local binding. Credential and ExecutionIdentity shapes,
existing human tokens and their restrictions stay unchanged.

External account linking binds the same capability through
`kickside.identity:credential_eligibility`. Code generation and completion check
the stored account owner before any claim or link write. Scalar resolution,
complete link reads and stable restriction reads check the stored owner live.
Identity module access includes only the configured guard's call permission;
callers do not need Users management or a new DM policy dependency.
Unbound custom hosts retain their behavior. DM propagates a link-read refusal
before admitting a notice or turn and renders the error as a string in its
existing response envelope. Human links, pending codes and successful response
shapes stay unchanged; no linked identity is rewritten.

Core Contract owns the optional host-wide credential capability
`kickside.contract:host_credential_guard`. Its empty default leaves generic hosts
unchanged. KickSide binds it to Users. Each credential consumer discovers the
host capability live at its existing admission boundary and enforces it in
addition to its local guard, so installing MCP later with an empty local binding
still excludes bot credentials. The protected host function validates guard
results and preserves errors. A permissive local guard cannot override the host.
Consumer-first updates require no new static library or policy import; Core-first
updates leave the capability disabled until the host binds it. Existing IDs,
credential shapes, human account data and execution authorization stay intact.

Users also owns live credential readiness through
`kickside.users.binding:credential_readiness`. The host supplies its reviewed
credential boundary inventory with the optional `kickside.users:bot_account_consumers`
requirement. Its empty default withholds new bot creation. Each row names required
entry kinds and scalar metadata; an optional `installed` registry ID activates a
row only when that module is present. Missing, legacy or mismatched boundaries
withhold creation. Malformed inventories fail even for absent optional modules.
The check requires the canonical Core-to-Users host binding and a readable marker
schema, rereads current registry entries, preserves infrastructure errors, and
changes no data or human credentials. Execution-owner admission remains a separate
creation prerequisite. Custom installed credential paths require explicit review
and inventory entries; these declarations do not infer security from source code.
Keeper contributes no inventory entry, dependency or readiness prerequisite.

Users binds the native token store's `subject_lookup` to
`kickside.users.binding:credential_subject_lookup`. This function admits credentials
through the same live `credential_eligibility` check as the issuers, then uses
Users' existing subject lookup for current groups and preserved session metadata.
The execution subject lookup remains available to active bot principals; a
background executor does not authenticate with a bearer. RA-H53 guards native
validation, header, query, cookie, Views and websocket upgrade-request ingress,
including absent or forged actor metadata and lookup outages. Existing human
tokens retain their stored bytes and current group resolution. The host readiness
inventory names the session admission function and both authenticated routers.
Keeper remains unchanged: a bot never authenticates as its calling admin.

Personal owner ceilings require a live restriction intersection. Organization
ownership and tenant boundaries attach to Users metadata, group administration
and resource ACLs. They do not introduce another principal kind. This release
design excludes group execution, a separate service catalog, bot credentials,
direct MCP impersonation and authority that survives authorizer deletion without
adoption. All product surfaces use the same protected owner admission path.

## Selected installation and identity commands

A type supports selected installation by implementing
`kickside.automation:prepared_installable.prepare_install`. Preparation returns a
pure plan in the existing install-result shape. It creates no components, jobs,
provider effects or other resources. Existing effectful install bodies keep their
existing endpoint and behavior; this capability never calls them. Recovery reads
the reserved plan and does not rerun preparation.

`POST /automations/selected` supplies the type, input, component UUID, request ID,
selected ordinary Users principal and optional parent. Automation captures the
operator and selected subject through Execution. The selected capture names the
new root and refuses any inherited root replacement. The creator's capture retains
its original root: a new component does not have ADMIN before creation.

The command reserves its plan and creates paused, fenced drives in one transaction.
The existing privileged Component creation records the operator as creator and
initial executor, with its initial ADMIN grant. The existing identity command and
Component SET then select the requested principal under the operator's live
scope. The final declaration checks both principals' live declared-resource access.
Matching identity/declaration receipts, authorizer, root and credential/link
references precede drive release and slot provisioning. Group delegation,
Component ADMIN and execution access remain separate requirements.

Every new identity-change command stores the server-captured operator identity.
The deferred writer reads that immutable command, verifies its request/generation
and preserves captured restrictions through the existing SET path. Writer
arguments cannot supply authority or replacement restriction references. A replay
with different restrictions conflicts. Previously pending commands without the
optional capture keep their established behavior. The identity shape remains v2;
no bot executor or permission snapshot appears.

A new selected-install command authorizes the proposed identity through Execution
before preparation or durable allocation. Without an existing root, Users requires
live all-roots act-as authority. A denied or unavailable preflight leaves no
component, command or drive. Existing admitted commands retain their root-bound
identity/declaration recovery checks. The selected-install HTTP boundary receives
only the existing confined actor/group/scope evaluation capabilities and retains
the authenticated operator; those capabilities do not grant delegation.

The generic `kickside.automation.manual:task` implements the same preparation
capability and recurring writable target resolution. It declares a fixed workflow,
agent prompt or writable action and has no schedule. Only an explicit `run_now`
command admits a durable occurrence; replay admits it once, pause retains queued
requests and retries retain their original item identity. Installing or selecting
an executor never starts a manual task. Existing `none` sources remain inert.

A human MCP credential may trigger a configured task through `AutomationsManage`
`run` with ordinary WRITE on its whitelisted component. The credential remains
owned by that human; the occurrence uses the task's saved executor and configuring
authorizer. Triggering does not grant act-as permission. The fixed manual task
accepts no replacement input or principal on `run` and does not support
reconfiguration. Changing its execution identity still requires ADMIN and live
act-as authorization. Native tool calls and the `call_tool` route retain the same
credential tool and component restrictions; client transport metadata supplies
neither an executor nor additional authority. A bot never owns an inbound MCP
credential or authenticates to obtain one.

Automation owns `wc-manual-task-launcher` for domain invocation screens. A domain
supplies a fixed target, title and explicit existing parent. The launcher mounts
Users' shared picker, stages through `/automations/selected`, then submits one
explicit `run_now` command. It retains installation and wake request UUIDs across
retries, checks the returned root, and reports queue admission. An unconfirmed
installation never wakes; a pending wake never reports completed execution.
The parent supplies ordinary inherited group access; the launcher grants none.
Before a root exists, selecting another account requires the existing all-roots
delegation. Domains reuse this launcher rather than constructing execution frames.

Agents' background action freezes an ordinary agent component and task prompt
before mounting the same launcher. The agent component is the task's parent;
its existing group access carries to the protected root. The existing resolver,
dataflow, model and tool caller retain the admitted executor and original human
authorizer. Ordinary Chat keeps its existing session startup contract.

Workflow's separate Run published action reads the frozen version's schema and
pins `flow_ref` to that version. The mutable draft Run/simulation path keeps its
existing identity and behavior. Workflow nodes and Await/resume inherit the
admitted Automation identity; a reviewer supplies a decision and never becomes
the executor or authorizer.

An independent reviewer cannot restore a disabled executor or revoked selection
grant. The existing resume boundary rechecks these before signaling the parked
flow. Inbox preserves native callback errors through the existing HTTP classifier;
a refused approval retains its pending decision and form for retry after authority
is restored. Dataflow currently rebuilds frozen policy IDs for subsequent nodes;
live group reduction during Await remains an upstream qualification failure.

A selected executor needs its own live group WRITE access to the protected Automation
root and declared resources. Permission to select that account does not grant
execution access. Changing an executor never retags a delivery already admitted
under another identity. Such deliveries retain their principal, original
authorizer, root and restrictions through recovery.

## Declare a module policy

Declare a public `security.policy` with a stable id and empty `groups`. Set
`meta.title`, `meta.surface`, and `meta.intent: module_access` so the administrator
composer and application default group discover it. The endpoint grant includes
the exact ids of the endpoints members may reach:

```yaml
namespace: acme.orders.security
entries:
  - name: module_access
    kind: security.policy
    meta:
      title: Orders
      surface: acme.orders
      intent: module_access
      includes: [acme.orders.security:module_runtime]
    groups: []
    policy:
      resources: [acme.orders.api:list_orders.endpoint]
      actions: access
      effect: allow
  - name: module_runtime
    kind: security.policy
    meta: {private: true}
    groups: []
    policy:
      resources: ["acme.orders:*", "acme.orders.api:*"]
      actions: [registry.get, registry.find, funcs.call, funcs.security,
                contract.get, contract.open, contract.call,
                contract.implementations, contract.security]
      effect: allow
```

List the module's real namespaces. Include private companion policies for its
navigation, view/page resources, tools and specific runtime actions. `meta.includes`
composes these grants through the existing Security projector; service-only
policies cannot enter member groups. Avoid broad grants across other modules.
Verify owned and foreign resources with the native security evaluator.

The module bundle retains the authority members already hold. Extra capabilities
use separate public policies with their own title, surface and intent, such as
`tool_access`. The default Members composition selects `module_access` only;
an administrator explicitly adds optional capabilities to a group. ChestOr's
Workspace, Graph, Journal, Roadmap and DB Schema tool policies follow this rule.

Retain every published requirement id and its existing targets. Append new
policy targets to the published member-scope requirement so installed apps keep
access when modules update before the root application. Every module's
`user_security_scope` requirement declares `meta.value_kind: security.scope`
and `default: kickside.security.groups:members`. Keeper binds this declared
default during Hub planning when the requirement has no existing binding.
An existing exact binding takes precedence during updates. Modules reference
the platform group, so any application installs them without adding a manual
composition parameter. Administrators narrow access through group memberships.
Core requirements that need a different group use a qualified binding, such as
`wippy.relay:user_security_scope` for the signed-in core group.
The Contract module retains its published shared endpoint policy for existing app
bindings. The application keeps that binding outside its member groups.
Modules that use this shared member interface declare
`meta.member_scope: kickside.contract.http:user_security_scope` on their owned
module policy. The existing requirement binds a group-composition declaration
that selects these contributors and expands their existing policy includes.
Its default remains platform Members; an explicit historical binding keeps its
supplied group. Contract's own endpoint policy stays bounded to Core. Modules
without this metadata keep their existing scope requirements and composition.
The shared declaration retains scalar `group_id` as platform Members. A projector
that reads only this field keeps the existing default-member authority while
Security updates add support for the supplied targets.
Group-composition declarations retain scalar `group_id`; optional `group_ids`
accepts several target groups or an empty list. The requirement appends its
existing scalar or array value to this list. Relative names use the declaration
namespace, and an empty member binding contributes no group. Projection, group
validation and reduction fences read the same target-group helper.

Module tests exercise SQLite and Postgres with fresh dependencies. Smoke tests
compose and assign groups through the public API, then verify REST, browser,
registry discovery, component access and MCP behavior. The default-member matrix
compares effective decisions on registry resources before and after composition.

Users management is a separate selectable capability, `kickside.users.security:module_access`, titled **Users management**. An administrator attaches it to groups that manage accounts. It grants user listing, creation, updates, deletion and membership management, plus access to the System tabs API. The default Members group includes `kickside.users.security:directory_access` for principal discovery and sharing, and excludes Users management. Own-profile and session operations remain in the signed-in core baseline. A shell contribution or navigation item may declare `access: <resource-id>`; discovery includes it only when the caller can read the entry and access that resource. Every System tab declares the endpoint its surface administers, for example the user-list endpoint for Users and the navigation configuration endpoint for Appearance, and the System navigation item declares the System tabs endpoint. A Users management group therefore sees System with only its Users tab; signed-in users without a System capability see no System item. Accounts created without an explicit group list receive the declared new-account memberships whoever creates them; an explicit list must come from the creator's assignable catalog.

Security-managed execution delegation policies bind operator groups to an exact
canonical delegation resource. Mutating a custom scope that attaches or removes
one of these policies requires Security administration and native policy-write
authority. This rule also applies through policy `includes`; projection reads do
not grant callers mutation authority. Ordinary and existing unmanaged policy
composition retains its current behavior. The scope writer compares the stored
policy bytes at persistence so a concurrent policy change invalidates an earlier
mutation authorization.

## Run-as candidates and the shared picker

Users owns `GET /users/run-as-candidates` and `wc-run-as-picker`. The endpoint
returns Me and active marked ordinary Users that the authenticated operator may
select. It calls Execution capture and live authorization for every proposed
principal, retaining the operator, root and credential/link restrictions. It
checks root ADMIN through Component for an existing execution. With no root,
only an explicit all-roots delegation authorizes another principal. General
principal discovery remains separate and supplies no selection authority.

The API calls the Users candidate function through native function dispatch.
Its confined policy permits actor/scope evaluation and the Users database read,
retaining the caller's actor. Those runtime capabilities do not grant selection:
Execution evaluates delegation against the recorded operator's live Users scope.
The policy is not attached to member groups and cannot mint credentials or run
effects. Direct native calls enforce the same authenticated-operator checks.

Pages scan a bounded, ordered set of active bot accounts. The cursor advances
past examined rows, including refused candidates; a page can be empty and still
have a next cursor. Search treats wildcard characters literally. Authorization
denials exclude a candidate; storage and infrastructure failures return errors.
Every submission repeats the owning command's authorization, even when the
picker recently offers the account. Candidate reads mint no credential.

Consumers mount the same Users picker with `root` set to the existing execution
component and `value` set to its principal UUID. An empty value displays Me. A
selection emits one `config-changed` event with `{principal: {kind: "user", id},
label}`. The domain owner submits that ordinary principal through its protected
Automation admission. The picker renders the existing shared select widget with
remote search and paging; it neither interprets delegation policies nor creates
an execution frame. An unavailable or revoked selection does not auto-select
another account. Personal or tenant-scoped bot designs continue to use ordinary
Users and this admission path; any additional authority ceiling belongs in the
existing authorization model before those features are exposed.

Channel responders use this same editor on their Automation Config surface.
The responder root owns the selected identity; the external message sender,
connection owner and agent creator supply no replacement authority. Provider
authentication admits the inbound delivery, while Channel resolves the protected
root identity and live access before the session/tool and outbound reply
boundaries. A configuring user does not gain access to a conversation owned by
the selected principal. Provider replay and untrusted payload identity fields
retain the existing deduplication and admission rules.

Automation owns `wc-execution-identity-editor` for installed execution roots.
It mounts the Users picker and reads the current generation through the additive
ADMIN-only `GET /automations/{id}/identity`. That reader projects only principal,
authorizer and generation from Component's canonical receipt. It exposes no
credential/link references, private context or hashes. READ/WRITE sharees cannot
open it; the details UI uses the existing access-level projection to hide the
editor from them, and the endpoint repeats ADMIN enforcement.

The protected editor labels the committed executor as “Runs as” and its human
authorizer as “Authorized by”. Users directory resolution supplies account
labels; an unavailable account stays unavailable. An unsaved picker choice
does not replace this provenance. After a confirmed identity command, the
editor refetches the canonical receipt and its labels before reporting success.
Directory or receipt failures remain visible, and a response from an older root
cannot supply the current account labels. The person who triggers an occurrence
does not replace either stored account; the occurrence executes through the
same captured identity and live authorization boundaries.

Generic drive controls retain the initiating ambient actor key in a private
`initiation` command receipt. The existing command writer records it atomically
with the reservation and control, including deferred event resync. Request fields
cannot select that actor, and replay preserves the original receipt, digest and
outcome even when another authorized caller retries. Existing commands without
initiating evidence remain unknown; no backfill or inference applies. Initiation
records who requests a control, while retained admission records determine who
executes. READ status exposes neither the private receipt nor trigger evidence.

Automation retains each committed delivery outcome in its private history,
including first-attempt success. The existing fenced commit copies the exact
admission evidence before clearing the journal or settling prepared output.
Retries append separate round records without replacing earlier evidence;
history never supplies authority or a replay decision. Missing evidence stays
unknown, and recorded unresolved or inferred evidence remains marked as such.
No existing delivery receives a backfill. The complete key includes the root,
drive, round token, source port, item and delivery identity. Row size limits and
bounded dispatcher expiry use the existing resolved-ledger retention policy.
Control initiation and delivery admission remain independent facts, without an
inferred command-to-delivery association.

The additive `GET /automations/{id}/history` reader requires a current
authenticated actor and native root ADMIN on every page. `kind=deliveries`
pages retained committed outcomes; `kind=controls` pages retained request
initiation. Each page has at most 100 records. Its cursor binds the authorized
root, record family and complete ordering tuple, and remains usable after an
anchor expires. It exposes no command digest, other target receipts or cleared
command input. Existing READ status stays unchanged.

Activity shows these independent histories only for ADMIN. Users directory
resolution supplies display labels for the historical ids; it never replaces
the recorded executor or authorizer with the current selection. Missing,
inferred and unresolved admission evidence stays explicitly unknown or
unverified. Account ids remain on each identity label even when directory
information is unavailable. A failed page clears detailed history and reports
the error. History neither authorizes execution nor reconstructs a relationship
between a control request and a delivery.

An explicit choice, including the same principal for reauthorization, submits
the existing identity command with a request UUID and expected generation.
Loading never saves. A failed or pending change reports its state without
confirmed success; retries reuse the admitted request UUID until the choice
changes. Responses from a previous root cannot update the current editor.
Future domain screens reuse this editor for installed roots. New installation
surfaces select through the Users picker and the prepared install capability;
they do not create another identity setter or change legacy installation.

Automation's private identity-apply boundary retains the authenticated operator
while granting the native actor/group/scope evaluation capabilities needed by
the shared authorization path. Component SET still checks live ADMIN,
delegation, credential/link restrictions, the pending owner command and the
identity generation. These capabilities never become member group grants.
