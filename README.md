<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/kickside-logo-dark.png">
  <img src="assets/kickside-logo-light.png" alt="KickSide" width="320">
</picture>

# KickSide module template

A template for an independently installable module with Lua APIs, persistence, migrations, a web component and Lua unit-test harnesses for SQLite and PostgreSQL.

[Documentation](https://kicksideai.github.io/docs/) · [Get started](https://kicksideai.github.io/docs/getting-started/) · [KickSide](https://kickside.ai) · [Organization](https://github.com/kicksideai)

Use [this template](https://github.com/kicksideai/module/generate), then initialize its identity:

```sh
make init ORG=your-org MODULE_NAME=your-module TITLE="Your module"
make setup
make lint typecheck build test
```

Read the [module authoring guide](https://kicksideai.github.io/docs/building-modules/) and the module’s [Makefile](Makefile) for the development commands. Lua unit suites and wippy harnesses ship with the template.

License: [MIT](LICENSE). Dependencies retain their respective licenses.
