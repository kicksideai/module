# Security and module access

Module access lets an administrator decide which groups can discover and use a
module. Declare it when signed-in people need the module's pages, APIs, tools,
or runtime contracts. Keep module access separate from record access and from
authority to administer the module.

## What to declare

Declare one public `security.policy` for the member capability. Give it a stable
registry id, an empty `groups` list, and the metadata that lets Security list it
as a selectable module capability:

```yaml
version: "1.0"
namespace: acme.orders.security
entries:
  - name: module_access
    kind: security.policy
    meta:
      title: Orders
      surface: acme.orders
      intent: module_access
      includes:
        - acme.orders.security:module_runtime
        - acme.orders.security:member_endpoints
    groups: []
    policy:
      resources:
        - acme.orders:*
        - acme.orders.api:*
      actions: [registry.get, registry.find]
      effect: allow

  - name: module_runtime
    kind: security.policy
    meta: {private: true}
    groups: []
    policy:
      resources:
        - acme.orders:*
        - acme.orders.api:*
      actions:
        - contract.get
        - contract.open
        - contract.call
        - contract.implementations
        - contract.security
        - funcs.call
        - funcs.security
      effect: allow

  - name: member_endpoints
    kind: security.policy
    meta: {private: true}
    groups: []
    policy:
      resources:
        - acme.orders.api:list_orders.endpoint
        - acme.orders.api:create_order.endpoint
      actions: access
      effect: allow
```

The public policy is the administrator-facing bundle. Its private included
policies keep registry discovery, runtime calls, and endpoint access explicit.
Grant only the module's resources and actions. Add each endpoint id that members
may call; an endpoint's name, route, or UI placement does not grant access.

Give optional capabilities their own public policies. For example, an Orders
module can expose an **Orders tools** policy with `intent: tool_access` rather
than making tools part of ordinary member access. Likewise, management actions
belong in a separate policy so an administrator can assign them without giving
them to every member.

## Connect the policy to member groups

The platform Member role uses the scope
`kickside.security.groups:members`. A normal module declares its member-scope
requirement with the canonical platform default and a declared value kind:

```yaml
  - name: user_security_scope
    kind: ns.requirement
    default: kickside.security.groups:members
    meta:
      value_kind: security.scope
      description: Application group with member access to this module.
    targets:
      - entry: acme.orders.security:module_access
        path: .groups +=
      - entry: acme.orders.security:module_runtime
        path: .groups +=
      - entry: acme.orders.security:member_endpoints
        path: .groups +=
```

The requirement places its resolved group on every policy that makes up the
capability. Retain published requirement ids and targets when adding a policy,
then append the new policy target. This lets an installation updated from an
earlier release retain its existing binding.

The default above selects the platform Member scope. Other host requirements
declare their `meta.value_kind` and receive their
resource from the host binding; module source does not set an `app:*` default.
See [Settings And Environment](16-conventions.md#settings-and-environment) for
that pattern.

Some modules contribute member HTTP endpoints through the shared Contract
composition. Such a policy declares
`meta.member_scope: kickside.contract.http:user_security_scope`; Contract's
group-composition declaration selects those contributors. Use this only when
the module follows that shared endpoint interface. Otherwise, use the module's
own member-scope requirement as in the example.

## How access is evaluated

An application composes its selected module policies into roles. KickSide ships
two default roles: Administrator and Member. Member uses the platform scope
`kickside.security.groups:members`; the application adds its core capabilities
to that role. Signed-in shell and own-profile access is supplied during
authentication, without a separate User role or stored membership. Administrators
assign roles to users; a user's effective scope combines the policies from all of
their groups. A deny takes precedence over an allow.

The same scope controls registry discovery, navigation, pages, views, contract
calls, and MCP tools. A navigation or page contribution can declare an `access`
resource so discovery follows the policy that protects its surface. Do not use
the presence of a navigation item as an authorization check.

Module access and component access are separate grants. A member policy may
allow use of the Orders module while a component record ACL still denies access
to another person's Order data. Check the component's access for every record
or component id the operation uses.

For durable work, capture a selected execution identity through the execution
contract and let it resolve live authority when the work runs. A module policy
does not let code construct an actor or scope. See
[Execution Identity And Deadline Jobs](20-execution-identity-and-jobs.md).

## HTTP endpoints and public callbacks

Attach member endpoints to the host's authenticated router requirement. That
router runs authentication and `endpoint_firewall`; the firewall evaluates
`access` against the endpoint registry id. The endpoint policy must therefore
list the exact `*.endpoint` ids that the intended group can call.

Keep a public callback on an intentional public router. It does not inherit
member access and must verify its provider signature or token before taking an
action. A callback must not treat a request field as a user identity or security
scope. See [Connections And Integrations](04-connections-and-integrations.md).

## Author checklist

- Declare one stable, public `module_access` policy with `title`, `surface`,
  and `intent: module_access`.
- Put only owned registry, runtime, endpoint, page, and tool resources in the
  policy or its private included policies.
- List every member endpoint explicitly with the `access` action.
- Give optional and administrative capabilities separate public policies.
- Declare `user_security_scope` with `meta.value_kind: security.scope` and the
  platform Members default; preserve existing requirement ids and targets.
- Bind host-owned routers, databases, process hosts, and other host resources
  through requirements without an `app:*` default.
- Test the policy with an allowed member and a user outside the selected group,
  including endpoint access, discovery, and the component ACL boundary.

See [Conventions](16-conventions.md) for requirements, HTTP declarations, and
component access patterns, and [Discovery, Addressing, And Context](19-discovery-addressing-and-context.md)
for registry and context authorization.
