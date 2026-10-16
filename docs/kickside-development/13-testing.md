# Testing And Migrations

A module's source and its standalone `test/` harness are separate trees. The
module owns behavior; the harness supplies host resources and runs registered
`meta.type: test` functions. The module template is an executable
example. Its Makefile defines `make setup`, `make test`, `make postgres-up`,
`make test-pg`, and `make postgres-down`; Wippy repositories use their own Makefile
for every build and test command.

## Register and execute cases

A test is a `function.lua` with `meta.type: test`, `source`, `method: run`,
and `imports.test: wippy.test:test`. A case file must call the runner wrapper:

```lua
local test = require("test")
local registry = require("registry")
local function cases()
    test.describe("wiring", function()
        test.it("loads the exact binding", function()
            local entry, err = registry.get("acme.starter:log_sink")
            test.is_nil(err)
            test.not_nil(entry)
        end)
    end)
end
local run_cases = test.run_cases(cases)
return { run = function(options) return run_cases(options) end }
```

The test entry also declares `modules: [registry]`. Merely defining a
`test.describe` tree does not execute its assertions. Check the runner's case
count, and fail on `No tests found`; the template's Makefile does both.
Register behavior tests for the sink or handler, wiring tests for exact IDs
and references, and actor-scoped tests for denied and allowed paths. For
event/projection code, test repeated delivery, source gaps, component WRITE output authorization,
and public-meta update. For a writable sink, test single-write receipt
results, duplicate item keys, stable `identity_key`, and a redelivery.

## Standalone harness

`test/wippy.yaml` names the harness. `test/src/_index.yaml` declares its
`app:db`, `app:api`, `app:gateway`, `app:processes`, and env storage. It
declares `ns.dependency` entries for the module under test, bootloader,
migration, security, contract, and test runner. The module dependency's
`parameters` supply every host-owned `ns.requirement`: database, router,
server, and security group. The module stays app-agnostic and declares no
host-owned default. `test/.wippy.yaml` uses `workspace.replacements` to load
the local module, and a PostgreSQL profile overrides `app:db` for the second
engine. Harness files stay under `test/` and are excluded from the published
module tree.

The SQLite resource must declare `foreign_keys: true`. The harness can set
`vars.sqlite_path: ":memory:"` and override `app:db:file` from that variable.
Use a unique per-run file under the harness `.wippy/` directory when a suite
reopens the SQLite resource across registry versions; keep that generated file
untracked. A PostgreSQL profile supplies `host`, `port`, `database`,
`username`, `password`, and SSL mode from local test variables. Give each
module a distinct test database name. Never use live application credentials.

`wippy/bootloader` finishes migrations before tests when its service has
`lifecycle.startup: complete`. Wire its `application_host`, `env_storage`, and
migration DB requirements. Do not add a boot-readiness polling test. A test
can assert migration rows after boot if wiring is in doubt.

A behavioral end-to-end check uses a running, source-free KickSide host when
the harness cannot represent app routing, identity, realtime fanout, OAuth,
or shell behavior. First build the relevant frontend package to its served
`static/` directory and confirm `index.js` exists; then use visible
Playwright, navigate through the shell, and inspect console errors after each
material interaction. Verify the runtime state, not only an HTTP success or
process exit code.

## Migrations

A migration is a `function.lua` with `meta.type: migration`, an ISO-8601 UTC
`meta.timestamp`, and `meta.target_db` supplied by a host requirement. The
runner sorts by timestamp, then entry ID. `depends_on` does not order
execution. The template's `src/migrations/01_create_log_entries.lua` shows
`migration.define`, separate `database("sqlite", ...)` and
`database("postgres", ...)` blocks, and `up`/`down` functions. Use SQL
appropriate to each engine: PostgreSQL `UUID`, `BOOLEAN`, or `TIMESTAMPTZ`
syntax does not run inside SQLite's branch. Parameterize data writes and
release database handles on every path.

New installations create tables in their final shape. Changes to stored shapes
also include forward-only, idempotent, resumable migrations from earlier
published data. Exercise those migrations on both SQL engines and preserve
existing records and callers. Product defaults such as CRM stages and settings
definitions belong in registry declarations and normal domain events.

## Shared actor ownership

Durable shared-table services register in the consistent process registry plane.
A second node monitors the current singleton owner and waits for its exit before
claiming the name. Execution-child and lease-release names use the same plane so
recovery can verify a lease from any node. Scope projection, model token refresh,
and composition snapshots register locally because they maintain node-local state.

The Jobs pool and Core cursor broker suites check contention, cancellation,
and registration errors through their public module harnesses. Cursor waits
retain their explicit deadlines. The public CI matrix refreshes dependencies,
runs the SQLite and PostgreSQL suites, and validates package creation.
