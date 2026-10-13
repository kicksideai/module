# KickSide Module Template

A standalone starter for a KickSide module with a Lua backend and web component.

The example publishes a typed log destination, contract binding, reusable Block,
authenticated status API, SQL migration, persistence layer, and UI. It builds and
tests independently of a KickSide source tree and includes the developer handbook.

## Quick start

Create a private repository from the template, then initialize its identity:

```sh
gh repo create my-company/invoices --template kicksideai/module --private --clone
cd invoices
make init ORG=my-company MODULE_NAME=invoices TITLE="Invoices" GITHUB_OWNER=my-company
make verify
```

The initializer updates package identity, namespace, routes, SQL names, test
identity, and bundle metadata together. It runs once; repeat initialization
with different values fails.

Install the initialized module into a KickSide host through **System → Modules**.
For a module available on the Hub, record its dependency in the host directory:

```sh
wippy add my-company/invoices
wippy install
```

Review the module's requirements and bind its authenticated router, database,
UI server, and user security scope through the host install plan. Local source
replacement and host bindings are described in the
[development loop](docs/kickside-development/14-dev-loop.md).

## Key concepts

Before initialization, the package is `acme/starter`:

- `acme.starter:definition` declares the root namespace.
- `acme.starter:log` is the typed automation destination port.
- `acme.starter:log_sink` binds the shared writable contract.
- `acme.starter.persist:repo` owns parameterized SQL storage.
- `acme.starter.blocks:block.write_log` declares the reusable Write Log Block.
- `acme.starter:starter_view` declares the module-owned web component.

The writable log sink requires a nonblank `origin` and `idempotency_key`.
The writing automation ID supplies the origin. Storage binds each
`(origin, sink_op, idempotency_key)` to one log row and its label/content.
A retry returns the original destination; changed label or content returns a
non-retriable `conflict`. The unique constraint also deduplicates concurrent
retries. The Block creates an independent log entry on each invocation.

The starter is an append-only log example. It has no thread projection or
Dataflow execution dependency. Hosts install Block consumers separately;
visual Workflows are optional. Package names, registry namespaces, and component
IDs are distinct identities.

`src/` holds registry declarations and Lua, `ui/` holds editable frontend source,
`static/` holds served assets, and `test/` holds the isolated host. The
[handbook](docs/kickside-development/developer-handbook.md) explains contracts,
events, security, module composition, and testing. Template instructions live
in [AGENTS.md](AGENTS.md).

## Requirements

Wippy 0.3.x; repository validation uses 0.3.44a. Use current Hub dependencies
for the contracts declared by the module.
SQLite and PostgreSQL are both supported by the example migration and harness.
Development uses Node.js 22 or newer, npm, Make, and the Wippy CLI.

## Development

```sh
make verify
```

This resolves dependencies, checks identity and initializer behavior, lints,
typechecks, builds, and runs the SQLite suite. Individual targets are
`make check`, `make lint`, `make typecheck`, `make build`, and `make test`.

Create a dedicated PostgreSQL database and run the same suite against it:

```sh
cd test
wippy test --profile postgres --set vars.pg_database=kickside_readme_test
```

Configure the connection variables in `test/.wippy.yaml` and drop the scratch
database afterward. `make test-pg` uses the configured database. For the bundled
Docker service, use `make postgres-up`, `make test-pg`, and `make postgres-down`.

Edit `ui/src` and rebuild; commit regenerated tracked `static/` assets. Keep
credentials, local runtime state, and dependency caches out of source control.
The bundled handbook matches the canonical KickSide handbook; `make sync-handbook`
and `make check-handbook` manage that relationship.

## Links

- [KickSide](https://kickside.ai)
- [Developer handbook](https://hub.wippy.ai/kickside/kickside/wiki/docs/kickside-development/developer-handbook.md)
- [Wippy documentation](https://wippy.ai)
- [Wippy CLI releases](https://hub.wippy.ai/releases)

## License

[MIT License](LICENSE). Review dependency licenses when distributing a module.
