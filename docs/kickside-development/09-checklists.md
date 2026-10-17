# Checklists

Use these before merging or publishing a module.

## Vocabulary Checklist

- Did you reuse component, contract, port, thread, projection, job, automation drive, or web
  component before adding a new concept?
- Are names precise: `owner_user_id`, typed `principal`, `authorized_by`, and `grantee_id`?
- Did you avoid module-specific trace aliases?
- Did you avoid `get_stats` endpoints when component meta is the read snapshot?
- Did you avoid central switches for provider discovery?

## Discovery And Identity Checklist

- Is the package `vendor/module` identity kept separate from the root namespace?
- Does every persisted reference use an exact `namespace:name` id?
- Does discovery use the extension point's canonical `.kind` and `meta.type`?
- Are components queried/opened through the actor-scoped component service?
- Are tools and Blocks listed through their normalized catalogs?
- Is `context_required` supplied by an instance-bound contract open rather than
  forged in arguments or searched as metadata?
- Does a missing declaration/context fail clearly without a heuristic fallback?

## Component Checklist

- Resource is a component if it is owned/shared/rendered/deleted.
- Secrets and config are in private context.
- Public render state is in component meta.
- Access goes through component service.
- Delete goes through component teardown.
- Backing data has an idempotent deletable binding.
- Derived public meta has one owner.
- Tests cover access and deletion.

## Event/Projection Checklist

- Durable facts are thread events.
- Projection workers declare `meta.type: projection.worker`, an explicit worker URI, and stored execution identity.
- Every event has a registered type and a direction declared by the stored component kind; output producers hold component WRITE, and framework attestations declare `system_only: true`.
- Trace context is preserved.
- Public meta updates are not duplicated across workers.
- Side effects are idempotent; writable bindings include `write`, `identity_key`, and `idempotency_key`.
- Retry behavior does not create fake progress.
- Waits use indexed fields.
- Tests cover duplicate/retry/empty/delete cases.

## Contract Checklist

- Contract exists because multiple implementations or decoupling are real.
- Method names and schemas are stable.
- Bindings run under caller identity.
- Discovery is registry-driven.
- Errors are structured.
- Callers use service/contract layer instead of SQL.
- Tests prove the binding and missing/invalid paths.

## Frontend Checklist

This repository does not maintain a frontend checklist. Follow the
[Frontend And Web Components source-of-truth directive](07-frontend-and-web-components.md),
and verify the touched module against the current
official Wippy frontend compliance checklist.

## Integration Checklist

- Credentials live in private storage.
- OAuth protocol lives in OAuth/provider layer.
- Provider resource discovery is contract-based.
- Inbound transport is thin.
- Reply provider is separate from responder execution identity.
- Upload/content access uses contracts or signed tokens.
- Deletion removes provider data and component state.

## Publishing Checklist

- `wippy lint` or module lint passes where available.
- The module Makefile's `verify` and PostgreSQL test targets pass (page 13).
- App boots on a clean DB if migrations changed.
- Stored-shape changes include forward-only, idempotent, resumable migrations
  tested with data from the previous published version on both engines.
- Hub Update all and restart updates existing installations without separate
  data-conversion steps. Published callers and stored references retain compatibility.
- No runtime logs or generated assets are committed unintentionally
  (`static/` regeneration is deliberate; see page 12).
- `git diff --check` is clean.
- `wippy.yaml` has no pinned release version; the Hub publisher chooses it (page 15).
- README/docs link to the new extension point.
