import { ref as E, createApp as B, onMounted as M, onUnmounted as F, watch as j, inject as K } from "vue";
import { addCollection as Y } from "@iconify/vue";
import { config as O, addIcons as q, on as J, applyThemeMode as V, host as G, hostCss as Q, loadCss as X } from "@wippy-fe/proxy";
import { getActivePinia as Z, createPinia as tt, setActivePinia as et } from "pinia";
var T = "data-wippy-visible";
function z(t) {
  const e = t.getAttribute(T);
  return e === "true" ? !0 : e === "false" ? !1 : null;
}
var it = Object.defineProperty, N = (t) => {
  throw TypeError(t);
}, st = (t, e, i) => e in t ? it(t, e, { enumerable: !0, configurable: !0, writable: !0, value: i }) : t[e] = i, u = (t, e, i) => st(t, typeof e != "symbol" ? e + "" : e, i), U = (t, e, i) => e.has(t) || N("Cannot " + i), nt = (t, e, i) => (U(t, e, "read from private field"), i ? i.call(t) : e.get(t)), rt = (t, e, i) => e.has(t) ? N("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, i), ot = (t, e, i, s) => (U(t, e, "write to private field"), e.set(t, i), i), at = [
  "themeConfigUrl",
  "primeVueCssUrl",
  "markdownCssUrl",
  "iframeCssUrl"
], lt = [
  ":where([data-wippy-theme-root]).w-theme-light",
  ":where([data-wippy-theme-root]).w-theme-dark"
].join(`,
`);
function x(t) {
  const e = t.startsWith("--") ? t : `--${t}`;
  return /^--[-\w\u0080-\uFFFF]+$/.test(e) ? e : null;
}
function ct(...t) {
  const e = /* @__PURE__ */ new Set();
  for (const i of t)
    if (i)
      for (const [s, n] of Object.entries(i)) {
        if ((s === "@light" || s === "@dark") && n && typeof n == "object") {
          for (const [a, o] of Object.entries(n)) {
            const c = typeof o == "string" ? x(a) : null;
            c && e.add(c);
          }
          continue;
        }
        const r = typeof n == "string" ? x(s) : null;
        r && e.add(r);
      }
  return [...e].sort();
}
function ht(t) {
  if (t.length === 0)
    return "";
  const e = t.map((i) => `  ${i}: inherit;`).join(`
`);
  return `${lt} {
${e}
}`;
}
function ut(t, e) {
  const i = ht(e);
  i && $(t, i, "@wippy-fe/css-variables-bridge");
}
function pt(t, e) {
  const s = (e ?? at).map(async (n) => {
    const r = Q[n];
    if (!r)
      return console.warn(`[wippy-fe/webcomponent-core] hostCss key "${n}" is undefined — skipping. Remove it from hostCssKeys if the CSS was removed.`), null;
    try {
      return await X(r);
    } catch (a) {
      return console.warn(`[wippy-fe/webcomponent-core] Failed to load hostCss "${n}" (${r}):`, a), null;
    }
  });
  return Promise.all(s).then((n) => {
    for (const r of n) {
      if (!r)
        continue;
      const a = document.createElement("style");
      a.textContent = r, a.setAttribute("role", "@wippy-fe/host-css"), t.appendChild(a);
    }
  });
}
function dt(t, e) {
  const i = document.createElement("style");
  i.textContent = e, t.appendChild(i);
}
function $(t, e, i) {
  if (typeof CSSStyleSheet < "u" && "replaceSync" in CSSStyleSheet.prototype) {
    const n = new CSSStyleSheet();
    n.replaceSync(e), t.adoptedStyleSheets = [...t.adoptedStyleSheets, n];
    return;
  }
  const s = document.createElement("style");
  s.setAttribute("role", i), s.textContent = e, t.appendChild(s);
}
function ft(t, e) {
  $(t, e, "@wippy-fe/custom-css");
}
function D(t) {
  return t.__wippyHost ?? null;
}
function _t(t) {
  return t.replace(/-([a-z])/g, (e, i) => i.toUpperCase());
}
function mt(t, e, i) {
  switch (i.type) {
    case "string":
      return { value: e };
    case "number": {
      const s = Number.parseFloat(e);
      return Number.isNaN(s) ? { value: void 0, error: `Invalid ${t}: expected a number` } : { value: s };
    }
    case "integer": {
      const s = Number.parseInt(e, 10);
      return Number.isNaN(s) ? { value: void 0, error: `Invalid ${t}: expected an integer` } : { value: s };
    }
    case "boolean":
      return { value: e !== "false" };
    case "array":
    case "object":
      try {
        const s = JSON.parse(e);
        return i.type === "array" && !Array.isArray(s) ? { value: void 0, error: `Invalid ${t}: expected a JSON array` } : { value: s };
      } catch {
        return { value: void 0, error: `Invalid ${t}: must be valid JSON` };
      }
    default:
      return { value: e };
  }
}
function L(t, e) {
  const i = {}, s = [];
  for (const [n, r] of Object.entries(e.properties)) {
    const a = t.getAttribute(n), o = _t(n);
    if (a === null) {
      r.default !== void 0 && (i[o] = r.default);
      continue;
    }
    const c = mt(n, a, r);
    c.error ? s.push(c.error) : i[o] = c.value;
  }
  return { props: i, errors: s };
}
var bt = class {
  constructor(t, e) {
    u(this, "_props"), u(this, "_errors"), u(this, "_content"), u(this, "_hostVisibility"), u(this, "_propsListeners", /* @__PURE__ */ new Set()), u(this, "_contentListeners", /* @__PURE__ */ new Set()), u(this, "_hostVisibilityListeners", /* @__PURE__ */ new Set()), u(this, "_disposed", !1), u(this, "_emitToDom"), u(this, "props"), u(this, "events"), u(this, "content"), u(this, "hostVisibility"), this._props = t.props, this._errors = t.errors, this._content = t.content, this._hostVisibility = t.hostVisibility, this._emitToDom = e;
    const i = this;
    this.props = {
      get value() {
        return i._props;
      },
      get errors() {
        return i._errors;
      },
      subscribe(s, n) {
        return i._subscribeProps(s, n);
      }
    }, this.events = {
      emit(s, n) {
        i._disposed || i._emitToDom(s, n);
      }
    }, this.content = t.hasContent ? {
      get value() {
        return i._content;
      },
      subscribe(s, n) {
        return i._subscribeContent(s, n);
      }
    } : null, this.hostVisibility = {
      get value() {
        return i._hostVisibility;
      },
      subscribe(s, n) {
        return i._subscribeHostVisibility(s, n);
      }
    };
  }
  /** @internal */
  notifyProps(t, e) {
    if (!this._disposed) {
      this._props = t, this._errors = e;
      for (const i of this._propsListeners)
        i(t, e);
    }
  }
  /** @internal */
  notifyContent(t) {
    if (!this._disposed) {
      this._content = t;
      for (const e of this._contentListeners)
        e(t);
    }
  }
  /** @internal */
  notifyHostVisibility(t, e) {
    if (!(this._disposed || t === e)) {
      this._hostVisibility = t;
      for (const i of this._hostVisibilityListeners)
        i(t, e);
    }
  }
  /** @internal */
  dispose() {
    this._disposed || (this._disposed = !0, this._propsListeners.clear(), this._contentListeners.clear(), this._hostVisibilityListeners.clear());
  }
  _subscribeProps(t, e) {
    if (this._disposed || e?.signal?.aborted)
      return () => {
      };
    this._propsListeners.add(t), e?.immediate && t(this._props, this._errors);
    const i = () => {
      this._propsListeners.delete(t), e?.signal?.removeEventListener("abort", i);
    };
    return e?.signal?.addEventListener("abort", i, { once: !0 }), i;
  }
  _subscribeContent(t, e) {
    if (this._disposed || e?.signal?.aborted)
      return () => {
      };
    this._contentListeners.add(t), e?.immediate && t(this._content);
    const i = () => {
      this._contentListeners.delete(t), e?.signal?.removeEventListener("abort", i);
    };
    return e?.signal?.addEventListener("abort", i, { once: !0 }), i;
  }
  _subscribeHostVisibility(t, e) {
    if (this._disposed || e?.signal?.aborted)
      return () => {
      };
    this._hostVisibilityListeners.add(t), e?.immediate && t(this._hostVisibility, this._hostVisibility);
    const i = () => {
      this._hostVisibilityListeners.delete(t), e?.signal?.removeEventListener("abort", i);
    };
    return e?.signal?.addEventListener("abort", i, { once: !0 }), i;
  }
}, R, yt = class extends HTMLElement {
  constructor() {
    super(), u(this, "_internals"), u(this, "_contentObserver", null), u(this, "_initialized", !1), u(this, "_container", null), rt(this, R, null), u(this, "_attachment", 0), u(this, "_reactive", null), u(this, "_lastProps", null), u(this, "_lastErrors", []), u(this, "_lastContent", null), u(this, "_themeUnsub", null), u(this, "_hostVisible", null), this._internals = this.attachInternals(), this._hostVisible = z(this);
  }
  /**
   * Override to provide the component's configuration.
   * Must be static because `observedAttributes` reads it before construction.
   *
   * Specify the generic to get typed `validateProps`:
   * ```ts
   * static get wippyConfig(): WippyElementConfig<MyProps> { ... }
   * ```
   */
  static get wippyConfig() {
    return { propsSchema: { properties: {} } };
  }
  /**
   * Derived from the props schema + any `extraObservedAttributes`.
   */
  static get observedAttributes() {
    const t = this.wippyConfig, e = Object.keys(t.propsSchema.properties), i = t.extraObservedAttributes ?? [];
    return [.../* @__PURE__ */ new Set([...e, ...i, T])];
  }
  /**
   * Host-owned logical activity. `null` means no host manages this element.
   * It is not CSS visibility or viewport intersection.
   */
  get hostVisible() {
    return this._hostVisible;
  }
  /**
   * Panel-scoped `host` wrapper attached by the managed-layout shell's
   * content resolvers (`ComponentResolver` / `WebComponentPackageLoader`).
   *
   * Inside a managed-layout panel, this is a wrapper around the universal
   * `host` API where context-aware calls (`layout.broadcast / send / on`)
   * are routed through the panel-bound bus — so `sourcePanelId` is
   * attributed correctly without postMessage indirection. Layout
   * mutations and other host methods pass through unchanged.
   *
   * `null` outside a managed-layout context (compat shell, chat sidebar,
   * standalone playground). Subclass code that needs a host in those
   * cases can fall back to `import { host } from '@wippy-fe/proxy'`.
   */
  get host() {
    return D(this);
  }
  /**
   * Emit a CustomEvent that bubbles and crosses shadow DOM boundaries.
   */
  emitEvent(t, e) {
    this.dispatchEvent(new CustomEvent(t, {
      bubbles: !0,
      composed: !0,
      detail: e
    }));
  }
  /**
   * Opt-in reactive adapter — framework-agnostic. Subscribe to prop
   * changes, content changes, or emit typed events from a non-Vue
   * consumer without re-rolling reactivity.
   *
   * ```ts
   * class MyEl extends WippyElement<{ count: number }, { tick: { n: number } }> {
   *   protected onMount() {
   *     const ctrl = new AbortController()
   *     this.reactive.props.subscribe(({ count }) => {
   *       this.shadowRoot!.querySelector('.n')!.textContent = String(count)
   *     }, { signal: ctrl.signal, immediate: true })
   *   }
   *   tick(n: number) { this.reactive.events.emit('tick', { n }) }
   * }
   * ```
   *
   * Allocation cost is zero unless this getter is touched. Disposed on
   * `disconnectedCallback`; a fresh adapter is allocated on the next
   * access after reconnect.
   */
  get reactive() {
    if (!this._reactive) {
      const t = this.constructor.wippyConfig, e = !!t.contentTemplate;
      let i, s;
      if (this._lastProps !== null)
        i = this._lastProps, s = this._lastErrors;
      else {
        const r = L(this, t.propsSchema);
        t.validateProps && r.errors.push(...t.validateProps(r.props)), i = r.props, s = r.errors, this._lastProps = i, this._lastErrors = s;
      }
      const n = e ? this._lastContent ?? this._extractContent(t.contentTemplate) : null;
      e && this._lastContent === null && (this._lastContent = n), this._reactive = new bt(
        { props: i, errors: s, content: n, hasContent: e, hostVisibility: this._hostVisible },
        this.emitEvent.bind(this)
      );
    }
    return this._reactive;
  }
  // ── Lifecycle ──────────────────────────────────────────────
  connectedCallback() {
    const t = ++this._attachment;
    this._internals.states.add("loading");
    try {
      const e = this.constructor.wippyConfig, i = this._initialized, s = nt(this, R) ?? ot(this, R, this.shadowRoot ?? this.attachShadow({ mode: e.shadowMode ?? "open" }));
      let n;
      if (this._container)
        n = this._container;
      else {
        if (this.onInit(s), t !== this._attachment)
          return;
        e.inlineCss && dt(s, e.inlineCss);
        try {
          const _ = O?.theming, l = ct(
            _?.global?.cssVariables,
            _?.children?.cssVariables
          );
          ut(s, l);
        } catch {
        }
        if (e.customCss !== !1)
          try {
            const _ = O?.theming, l = [_?.global?.customCSS, _?.children?.customCSS].filter(Boolean).join(`
`);
            l && ft(s, l);
          } catch {
          }
        (e.hostCssKeys === void 0 || e.hostCssKeys.length > 0) && pt(s, e.hostCssKeys), n = document.createElement("div"), n.setAttribute("data-wippy-theme-root", "");
        const p = e.containerClasses ?? [];
        p.length > 0 && n.classList.add(...p), s.appendChild(n), this._container = n, q(Y);
      }
      this._applyTheme(), this._themeUnsub || (this._themeUnsub = J("@theme", (p) => this._applyTheme(p)));
      const { props: r, errors: a } = L(this, e.propsSchema);
      e.validateProps && a.push(...e.validateProps(r));
      const o = r;
      this._lastProps = o, this._lastErrors = a;
      let c = null;
      if (e.contentTemplate && (c = this._extractContent(e.contentTemplate), this._lastContent = c, this._contentObserver = new MutationObserver(() => {
        const p = this._extractContent(e.contentTemplate);
        this._lastContent = p, this._reactive?.notifyContent(p), this.onContentChanged(p);
      }), this._contentObserver.observe(this, {
        childList: !0,
        characterData: !0,
        subtree: !0
      })), this.onMount(s, n, o, a, c, i), t !== this._attachment)
        return;
      this._internals.states.delete("loading"), this._internals.states.add("ready"), i || (this._initialized = !0), this.onReady(), t === this._attachment && this.emitEvent("load");
    } catch (e) {
      if (t !== this._attachment || (this.onError(e), t !== this._attachment))
        return;
      this._internals.states.delete("loading"), this._internals.states.add("error"), this.emitEvent("error", {
        message: e instanceof Error ? e.message : String(e),
        error: e
      });
    }
  }
  /**
   * Applies a forced theme mode to this host element AND the shadow container.
   * The container class drives in-shadow selectors (Tailwind `dark:` utilities,
   * `.w-theme-dark &`); the host-element class drives `:host(.w-theme-*)`
   * selectors. On `@theme` broadcasts the resolved `mode` is passed in directly
   * (don't re-read `getThemeMode()` — the proxy's config-vs-emit order isn't a
   * contract); on the initial connect it defaults to the host's current mode.
   * No-op for an older proxy without `getThemeMode` — `applyThemeMode` clamps
   * `undefined` to 'auto'.
   */
  _applyTheme(t = G.getThemeMode?.()) {
    V(t, this), this._container && V(t, this._container);
  }
  disconnectedCallback() {
    const t = ++this._attachment;
    this._themeUnsub && (this._themeUnsub(), this._themeUnsub = null), V("auto", this), this._container && V("auto", this._container), this._contentObserver && (this._contentObserver.disconnect(), this._contentObserver = null), this.onUnmount(), t === this._attachment && (this.emitEvent("unload"), t === this._attachment && (this._internals.states.clear(), this._reactive?.dispose(), this._reactive = null, this._lastProps = null, this._lastErrors = [], this._lastContent = null, delete this.__wippyHost, delete this.__wippyHostBus));
  }
  attributeChangedCallback(t, e, i) {
    if (e === i)
      return;
    if (t === T) {
      const o = this._hostVisible, c = z(this);
      if (c === o)
        return;
      this._hostVisible = c, this.isConnected && this._initialized && (this._reactive?.notifyHostVisibility(c, o), this.onHostVisibilityChanged(c, o));
      return;
    }
    const s = this.constructor.wippyConfig, { props: n, errors: r } = L(this, s.propsSchema);
    s.validateProps && r.push(...s.validateProps(n));
    const a = n;
    this._lastProps = a, this._lastErrors = r, this._reactive?.notifyProps(a, r), this.onPropsChanged(a, r);
  }
  // ── Hooks ──────────────────────────────────────────────────
  /** Called right after shadow DOM is attached, before CSS or container. */
  onInit(t) {
  }
  /** Called after internals state is set to ready, before the `load` event. */
  onReady() {
  }
  /** Called when connectedCallback throws. Default logs to console. */
  onError(t) {
    console.error(`${this.constructor.name} initialization failed:`, t);
  }
  /** Called when observed attributes change. Override to update framework state. */
  onPropsChanged(t, e) {
  }
  /**
   * Called when the host changes logical activity. `null` means unmanaged.
   * This does not imply a DOM remount or a CSS/viewport visibility change.
   */
  onHostVisibilityChanged(t, e) {
  }
  /**
   * Extract text from a child `<template data-type="...">` element.
   *
   * A template keeps its children in one of two places. Parsed HTML (page
   * markup, `innerHTML`) puts them in `template.content`, a DocumentFragment.
   * DOM APIs add them as the template element's own child nodes and leave
   * `template.content` empty: that is how a Vue SFC sets
   * `<template data-type="...">{{ text }}</template>`. The content fragment is
   * read first, then the element's own children. Only text is returned, never
   * markup, in both cases.
   */
  _extractContent(t) {
    const e = this.querySelector(`template[data-type="${t}"]`);
    return e ? e.content.textContent?.trim() || e.textContent?.trim() || "" : null;
  }
  /** Called when child `<template>` content changes. Override to update framework state. */
  onContentChanged(t) {
  }
};
R = /* @__PURE__ */ new WeakMap();
function vt(t) {
  return t.__wippyHostBus ?? null;
}
function gt(t) {
  return t.dataset.wippyPanelId ?? null;
}
var Ct = Object.defineProperty, St = (t, e, i) => e in t ? Ct(t, e, { enumerable: !0, configurable: !0, writable: !0, value: i }) : t[e] = i, b = (t, e, i) => St(t, typeof e != "symbol" ? e + "" : e, i);
function Ht(t, e) {
  return { lazyConfig: t, mountLifecycle: !0, lazyUi: e };
}
function H(t, e, i) {
  const s = t.createElement("div"), n = i ? e.failed : e.loading;
  s.dataset.lazyState = i ? "failed" : "loading", s.setAttribute("role", i ? "alert" : "status"), s.setAttribute("aria-label", n), s.style.cssText = "display:grid;place-items:center;text-align:center;";
  const r = e.surface === "page";
  if (s.style.cssText += r ? "block-size:100%;min-block-size:0;" : "min-block-size:2rem;font-size:.875rem;", i)
    s.style.color = "var(--p-danger-500, currentColor)", s.textContent = !r && e.iconOnly ? "⚠" : n, !r && e.iconOnly && (s.title = n);
  else {
    const a = t.createElement("style");
    a.textContent = '@media (prefers-reduced-motion: no-preference) { [data-lazy-state="loading"] > [data-wippy-spinner] { animation: wippy-lazy-spin 1s linear infinite; } } @keyframes wippy-lazy-spin { to { transform: rotate(1turn); } }';
    const o = t.createElement("span");
    o.dataset.wippySpinner = "", o.setAttribute("aria-hidden", "true"), o.style.cssText = "display:block;box-sizing:border-box;inline-size:1em;block-size:1em;border:2px solid var(--p-surface-300, currentColor);border-top-color:var(--p-primary-color, currentColor);border-radius:50%;", o.style.fontSize = r ? "2rem" : "1em", s.append(a, o);
  }
  return s;
}
var wt = /* @__PURE__ */ Symbol("wippy:emit"), Et = /* @__PURE__ */ Symbol("wippy:props"), Vt = /* @__PURE__ */ Symbol("wippy:props_error"), Pt = /* @__PURE__ */ Symbol("wippy:content"), Rt = /* @__PURE__ */ Symbol("wippy:panel-id"), At = /* @__PURE__ */ Symbol("wippy:layout-bus"), Lt = /* @__PURE__ */ Symbol("wippy:host"), W = /* @__PURE__ */ Symbol("wippy:host-visibility");
function Tt() {
  const t = K(W);
  if (!t)
    throw new Error("useHostVisibility() must be called inside a WippyVueElement");
  return t;
}
function kt(t) {
  const e = Tt();
  let i = !1, s = null, n = !1;
  function r() {
    if (s)
      return n = !0, s;
    let a;
    try {
      a = Promise.resolve(t());
    } catch (c) {
      a = Promise.reject(c);
    }
    const o = a.finally(() => {
      if (s === o && (s = null, i && n))
        return n = !1, r();
    });
    return s = o, o;
  }
  return M(() => (i = !0, r())), F(() => {
    i = !1, n = !1;
  }), j(e, (a, o) => {
    if (i && o === !1 && a === !0)
      return r();
  }), e;
}
var P = /* @__PURE__ */ new WeakMap();
function k(t, e) {
  const i = P.get(t);
  if (i)
    return i;
  const s = Promise.resolve().then(e);
  return P.set(t, s), s.catch(() => {
    P.get(t) === s && P.delete(t);
  }), s;
}
var Nt = class extends yt {
  constructor() {
    super(...arguments), b(this, "_vueApp", null), b(this, "_mountingApp", !1), b(this, "_mountState", "idle"), b(this, "_feedback", null), b(this, "_propsRef", E({})), b(this, "_errorsRef", E([])), b(this, "_contentRef", E(null)), b(this, "_hostVisibilityRef", E(null)), b(this, "_bridgeAbort", null);
  }
  /**
   * Override to provide Vue-specific configuration.
   */
  static get vueConfig() {
    throw new Error("WippyVueElement subclass must override static get vueConfig()");
  }
  /** Prepare the implementation without creating a Vue or Pinia instance. */
  static async preloadImplementation() {
    const t = this.vueConfig;
    t.mountLifecycle && !t.rootComponent && t.lazyConfig && await k(this, t.lazyConfig);
  }
  /** Undefined on configurations that use only the legacy load event. */
  get wippyMountState() {
    return this.constructor.vueConfig.mountLifecycle ? this._mountState : void 0;
  }
  onMount(t, e, i, s, n, r) {
    const a = this.constructor, o = a.vueConfig, c = new AbortController();
    this._bridgeAbort = c;
    const p = () => !c.signal.aborted && this._bridgeAbort === c;
    this._mountState = "mounting", this._propsRef.value = i, this._errorsRef.value = s, this._contentRef.value = n ?? null, this._hostVisibilityRef.value = this.hostVisible;
    for (const l of s)
      if (this.emitEvent("invalid", { message: l }), !p())
        return;
    this.reactive.props.subscribe((l, d) => {
      this._propsRef.value = l, this._errorsRef.value = [...d];
      for (const h of d)
        this.emitEvent("invalid", { message: h });
    }, { signal: c.signal }), this.reactive.content && this.reactive.content.subscribe((l) => {
      this._contentRef.value = l;
    }, { signal: c.signal }), this.reactive.hostVisibility.subscribe((l) => {
      this._hostVisibilityRef.value = l;
    }, { signal: c.signal });
    const _ = (l) => {
      if (!p())
        return;
      const d = Z(), h = B(l.rootComponent);
      let v = !1, y = !1, g, C;
      this._mountingApp = !0;
      try {
        const S = tt();
        if (l.piniaPlugins)
          for (const m of l.piniaPlugins)
            S.use(m);
        h.use(S);
        for (const m of l.plugins ?? [])
          h.use(m);
        if (h.provide(Et, this._propsRef), h.provide(Vt, this._errorsRef), h.provide(wt, this.emitEvent.bind(this)), h.provide(Pt, this._contentRef), h.provide(W, this._hostVisibilityRef), h.provide(Rt, gt(this)), h.provide(At, vt(this)), h.provide(Lt, D(this)), l.providers?.(h, this), !p())
          return;
        if (C = h.config.errorHandler, o.mountLifecycle && (h.config.errorHandler = (m, I, f) => {
          y || (g = m), y = !0, C?.(m, I, f);
        }), h.mount(e), v = !0, y)
          throw g;
        p() && (this._vueApp = h);
      } finally {
        o.mountLifecycle && v && (h.config.errorHandler = C);
        try {
          v && (y || !p()) && h.unmount();
        } finally {
          et(d), this._mountingApp = !1;
        }
      }
      o.mountLifecycle && queueMicrotask(() => {
        p() && this.isConnected && (this._mountState = "mounted", this.dispatchEvent(new Event("wippy-mounted")));
      });
    };
    if (o.rootComponent) {
      if (this._mountingApp && o.mountLifecycle) {
        queueMicrotask(() => {
          try {
            _(o);
          } catch (l) {
            p() && (this._mountState = "failed", this.emitEvent("error", { message: l instanceof Error ? l.message : String(l), error: l }));
          }
        });
        return;
      }
      try {
        _(o);
      } catch (l) {
        if (p())
          throw this._mountState = "failed", l;
      }
    } else if (o.lazyConfig) {
      const l = e.ownerDocument, d = o.lazyUi;
      d?.surface === "page" && (e.style.blockSize = "100%", e.style.minBlockSize = "0");
      let h = !1, v, y;
      const g = () => {
        clearTimeout(v), clearTimeout(y), this._feedback?.remove(), this._feedback = null;
      };
      c.signal.addEventListener("abort", g, { once: !0 });
      const C = () => {
        if (!p() || h)
          return;
        const f = d ? H(l, d, !1) : l.createElement("wippy-loading");
        f.setAttribute("no-bg", ""), this._feedback = f, e.appendChild(f);
      }, S = (f) => {
        if (!p())
          return;
        h = !0, g(), this._mountState = "failed";
        const A = d?.failed ?? (f instanceof Error ? f.message : String(f)), w = d ? H(l, d, !0) : l.createElement("wippy-error");
        d || (w.setAttribute("title", "Failed to load"), w.setAttribute("message", A)), this._feedback = w, e.appendChild(w), this.emitEvent("error", d ? { message: A, error: f } : { message: A });
      }, m = d?.delay ?? (d?.surface === "compact" ? 200 : 0);
      m > 0 ? v = setTimeout(C, m) : C(), d && (y = setTimeout(() => S(new Error("The component did not load in time.")), d.timeout ?? 3e4)), (o.mountLifecycle ? k(a, o.lazyConfig) : o.lazyConfig()).then((f) => {
        !p() || h || (h = !0, g(), _(f));
      }, (f) => {
        h || S(f);
      }).catch(S);
    } else
      throw this._mountState = "failed", new Error("WippyVueElement vueConfig must provide rootComponent or lazyConfig");
  }
  onUnmount() {
    this._bridgeAbort?.abort(), this._bridgeAbort = null, this._mountState = "idle", this._feedback?.remove(), this._feedback = null;
    const t = this._vueApp;
    this._vueApp = null, t?.unmount();
  }
};
export {
  Nt as W,
  Ht as l,
  kt as u
};
//# sourceMappingURL=wc-runtime-Dusx9e03.js.map
