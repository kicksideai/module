<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/kicksideai/docs/main/getting-started/assets/brand/kickside-logo-dark.png">
  <img src="https://raw.githubusercontent.com/kicksideai/docs/main/getting-started/assets/brand/kickside-logo-light.png" alt="KickSide" width="320">
</picture>

# KickSide module template

A working `acme/starter` module scaffold. It writes log entries through an automation sink and Block, persists them with migrations, and exposes a status API and Vue web component. Lua harnesses exercise SQLite and PostgreSQL.

Create a repository from [this template](https://github.com/kicksideai/module/generate), then initialize its identity:

```sh
make init ORG=your-org MODULE_NAME=your-module TITLE="Your module"
make setup
make lint typecheck build test
```

`make init` also accepts `NAMESPACE`, `TAG`, and `GITHUB_OWNER` (default: `ORG`). It runs once per checkout. Commit the rebuilt `static/` bundle with your source changes.

Run the PostgreSQL suite before changing SQL or migrations. `make postgres-up` starts PostgreSQL on port 5433 with an empty test database:

```sh
make postgres-up
make test-pg
make postgres-down
```

`make release-check` runs every gate and a publish dry run. Releases go through the GitHub Release Please workflow, which opens a reviewed release proposal and publishes only after it merges.

The [Makefile](Makefile) owns the commands. The bundled [developer handbook](docs/README.md) is an exact copy of the canonical handbook shipped by KickSide; `make sync-handbook` updates it and `make check-handbook` detects drift. See the [module authoring guide](https://github.com/kicksideai/docs/blob/main/building-modules/index.md) for contracts, requirements, and application integration.

![The starter status page shows an empty log in a fresh demonstration installation](https://raw.githubusercontent.com/kicksideai/docs/main/using/assets/module/starter.png)

License: [MIT](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md).

[Documentation](https://github.com/kicksideai/docs) · [KickSide](https://kickside.ai)
