# Frontend And Web Components

KickSide frontend pages are source-of-truth directives, not local copies of
Wippy implementation guidance. Before frontend work, read the current official
guidance for the surface being changed:

- [Wippy documentation index](https://wippy.ai/llms.txt)
- [Frontend compliance checklist](https://wippy.ai/llm/path/en/frontend/micro-frontends/compliance-checklist)
- [Theming](https://wippy.ai/llm/path/en/frontend/micro-frontends/theming)
- [Web-component theming](https://wippy.ai/llm/path/en/frontend/micro-frontends/web-component-theming)
- [Web-component implementation](https://wippy.ai/llm/path/en/frontend/micro-frontends/web-component)
- [Proxy API](https://wippy.ai/llm/path/en/frontend/micro-frontends/proxy-api)

Inspect the touched module's registry entry, package manifest, source,
Makefile, served static mount, and emitted bundle. The module owns its UI
source and `static/` artifact. The Makefile owns commands for setup, typecheck,
build, and verification; do not invoke package-manager or Vite build commands
directly. Build the relevant package into its served `static/` directory and
confirm the declared `entry_point` file exists before browser verification.

## Register a module page

The module template supplies a working page. It declares one
`fs.directory` pointing at `./static`, one `http.static` whose `meta.server`
is injected through `ns.requirement`, and a `registry.entry` with
`meta.type: view.component`, `announced: true`, `auto_register: true`,
`tag_name`, `base_path`, and `entry_point`. A `ui.nav_item` with
`render: component` and `component_tag` mounts it in the shell. The module's
UI package keeps `specification: wippy-component-1.0` and uses
`define(import.meta.url, ElementClass)`. The source and static entry both
belong to this module; inspect their exact IDs before rebuilding.

The shell gives a page a definite-height surface. For a full page, `:host`
needs `display: block; height: 100%; min-height: 0;`; the page root needs
`height: 100%; overflow-y: auto;` so content scrolls inside that surface.
Use semantic `--p-*` tokens and PrimeVue components where available. The
facade owns the `--p-focus-ring-*` values and `--p-focus-ring-shadow`; a
component chooses which of its elements receives `:focus-visible` and uses
those values. Read `app/facade-src/README.md` “Focus canon” before editing
focus CSS. The module must not hardcode focus colors or lengths.

## Read and refresh state

Use named exports from `@wippy-fe/proxy` for authenticated HTTP and host
events. Read committed state from a module endpoint. Notifications wake the
page to refetch that endpoint or invalidate its query cache; render the
returned state rather than treating a notification payload as the database.

For component-owned state, subscribe to `component.<id>` and track the
selected component ID so a board does not apply another workspace's events.
The component service publishes canonical notifications such as
`component.meta.changed` when its public metadata changes.

A module page without a component instance uses a module-owned topic, such
as `acme.starter.changed`. After committing a write, publish through
`kickside.contract:realtime`: open the contract and call
`broadcast({ topic = "acme.starter.changed", data = {} })` for shared state,
or `notify({ user_id = owner_id, topic = topic, data = {} })` for one owner's
state. Choose the audience from stored ownership, keep stored content out of
wakeup payloads, and return contract or delivery errors. The writer declares
only the authority its audience requires: a shared-topic broadcast uses a
function security policy with action `realtime.broadcast` and resource
`kickside.realtime:acme.starter.changed`. Do not call the relay directly.
Every write entry point uses the same persistence and notification path.

The shell can retain a page's custom element while navigating away and back.
`onMounted` alone therefore does not refresh a page on later visits. Inside a
`WippyVueElement`, use `useHostVisibilityRefresh` from
`@wippy-fe/webcomponent-vue` for the initial load and each host-owned
`false -> true` visibility transition:

```ts
import { onUnmounted } from 'vue'
import { api, on } from '@wippy-fe/proxy'
import { useHostVisibilityRefresh } from '@wippy-fe/webcomponent-vue'

async function load() {
  const { data } = await api.get('/api/v1/starter/status')
  // Validate and render the endpoint response.
}

const unsubscribe = on('acme.starter.changed', () => { void load() })
useHostVisibilityRefresh(load)
onUnmounted(unsubscribe)
```

Subscribe before the initial read so a write during loading cannot fall
between reading and subscribing. `on(topic, handler)` returns a disposer;
call it on unmount. Keep subscriptions outside the visibility callback so
return visits do not duplicate them. The helper serializes its own loads;
the page also cancels or ignores obsolete responses from overlapping
notification loads and responses arriving after unmount.

Direct web components receive logical visibility through
`useHostVisibility()` (`Ref<boolean | null>`); `null` means unmanaged. The
initial value is not a reveal transition. Iframe pages use the proxy's
`on('@visibility', handler)` event. Use these host APIs rather than polling,
DOM visibility guesses, or browser reloads. The current proxy and
web-component subscription and visibility contracts remain authoritative.

A navigation action inside a shadow root emits `navigate` with a route path;
`bubbles: true` and `composed: true` let the shell receive it:

```ts
root.dispatchEvent(new CustomEvent('navigate', {
  detail: { path: '/deals/' + dealId },
  bubbles: true,
  composed: true,
}))
```

Keep API calls, navigation, and state changes inside the host proxy and
registered routes. Do not construct raw postMessage protocols or deployment
paths. Inspect the top document, iframe documents, and recursively nested
shadow roots when verifying overlays such as Dialog and Drawer.

A surface can request Back within a subsection by emitting
`{ path: 'base-id', back: { within: 'base-id' } }`. Both paths resolve under
the surface base. The shell uses its existing router to go Back only when
the current and previous entries are within that subsection. A direct link
or a previous entry outside the subsection opens `path` instead. Components
must not inspect the parent window's history: the shell owns routing and
may run in an iframe on another origin.

## Verify in the running app

Keep the configured backend port listening. For a 5xx, inspect backend logs
first to distinguish a stopped service, a route error, and a missing asset.
A 404 on the page's own `index.js` means its registry entry, filesystem
mount, build owner, and emitted file need inspection. Navigate to the app
shell first and route through the SPA. Use visible Playwright and inspect
browser console errors after navigation and each material interaction.
