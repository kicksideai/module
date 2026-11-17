import { ref as f, createApp as A, inject as S, onMounted as I, onUnmounted as O, watch as L } from "vue";
import { addCollection as T } from "@iconify/vue";
import { config as g, addIcons as H, on as N, applyThemeMode as b, host as U, hostCss as $, loadCss as x } from "@wippy-fe/proxy";
import { getActivePinia as D, createPinia as j, setActivePinia as W } from "pinia";
var y = "data-wippy-visible";
function C(t) {
  const e = t.getAttribute(y);
  return e === "true" ? !0 : e === "false" ? !1 : null;
}
var B = Object.defineProperty, z = (t, e, s) => e in t ? B(t, e, { enumerable: !0, configurable: !0, writable: !0, value: s }) : t[e] = s, h = (t, e, s) => z(t, typeof e != "symbol" ? e + "" : e, s), F = [
  "themeConfigUrl",
  "primeVueCssUrl",
  "markdownCssUrl",
  "iframeCssUrl"
], K = [
  ":where([data-wippy-theme-root]).w-theme-light",
  ":where([data-wippy-theme-root]).w-theme-dark"
].join(`,
`);
function E(t) {
  const e = t.startsWith("--") ? t : `--${t}`;
  return /^--[-\w\u0080-\uFFFF]+$/.test(e) ? e : null;
}
function M(...t) {
  const e = /* @__PURE__ */ new Set();
  for (const s of t)
    if (s)
      for (const [i, r] of Object.entries(s)) {
        if ((i === "@light" || i === "@dark") && r && typeof r == "object") {
          for (const [o, a] of Object.entries(r)) {
            const c = typeof a == "string" ? E(o) : null;
            c && e.add(c);
          }
          continue;
        }
        const n = typeof r == "string" ? E(i) : null;
        n && e.add(n);
      }
  return [...e].sort();
}
function Y(t) {
  if (t.length === 0)
    return "";
  const e = t.map((s) => `  ${s}: inherit;`).join(`
`);
  return `${K} {
${e}
}`;
}
function J(t, e) {
  const s = Y(e);
  s && V(t, s, "@wippy-fe/css-variables-bridge");
}
function k(t, e) {
  const i = (e ?? F).map(async (r) => {
    const n = $[r];
    if (!n)
      return console.warn(`[wippy-fe/webcomponent-core] hostCss key "${r}" is undefined — skipping. Remove it from hostCssKeys if the CSS was removed.`), null;
    try {
      return await x(n);
    } catch (o) {
      return console.warn(`[wippy-fe/webcomponent-core] Failed to load hostCss "${r}" (${n}):`, o), null;
    }
  });
  return Promise.all(i).then((r) => {
    for (const n of r) {
      if (!n)
        continue;
      const o = document.createElement("style");
      o.textContent = n, o.setAttribute("role", "@wippy-fe/host-css"), t.appendChild(o);
    }
  });
}
function q(t, e) {
  const s = document.createElement("style");
  s.textContent = e, t.appendChild(s);
}
function V(t, e, s) {
  if (typeof CSSStyleSheet < "u" && "replaceSync" in CSSStyleSheet.prototype) {
    const r = new CSSStyleSheet();
    r.replaceSync(e), t.adoptedStyleSheets = [...t.adoptedStyleSheets, r];
    return;
  }
  const i = document.createElement("style");
  i.setAttribute("role", s), i.textContent = e, t.appendChild(i);
}
function G(t, e) {
  V(t, e, "@wippy-fe/custom-css");
}
function w(t) {
  return t.__wippyHost ?? null;
}
function Q(t) {
  return t.replace(/-([a-z])/g, (e, s) => s.toUpperCase());
}
function X(t, e, s) {
  switch (s.type) {
    case "string":
      return { value: e };
    case "number": {
      const i = Number.parseFloat(e);
      return Number.isNaN(i) ? { value: void 0, error: `Invalid ${t}: expected a number` } : { value: i };
    }
    case "integer": {
      const i = Number.parseInt(e, 10);
      return Number.isNaN(i) ? { value: void 0, error: `Invalid ${t}: expected an integer` } : { value: i };
    }
    case "boolean":
      return { value: e !== "false" };
    case "array":
    case "object":
      try {
        const i = JSON.parse(e);
        return s.type === "array" && !Array.isArray(i) ? { value: void 0, error: `Invalid ${t}: expected a JSON array` } : { value: i };
      } catch {
        return { value: void 0, error: `Invalid ${t}: must be valid JSON` };
      }
    default:
      return { value: e };
  }
}
function v(t, e) {
  const s = {}, i = [];
  for (const [r, n] of Object.entries(e.properties)) {
    const o = t.getAttribute(r), a = Q(r);
    if (o === null) {
      n.default !== void 0 && (s[a] = n.default);
      continue;
    }
    const c = X(r, o, n);
    c.error ? i.push(c.error) : s[a] = c.value;
  }
  return { props: s, errors: i };
}
var Z = class {
  constructor(t, e) {
    h(this, "_props"), h(this, "_errors"), h(this, "_content"), h(this, "_hostVisibility"), h(this, "_propsListeners", /* @__PURE__ */ new Set()), h(this, "_contentListeners", /* @__PURE__ */ new Set()), h(this, "_hostVisibilityListeners", /* @__PURE__ */ new Set()), h(this, "_disposed", !1), h(this, "_emitToDom"), h(this, "props"), h(this, "events"), h(this, "content"), h(this, "hostVisibility"), this._props = t.props, this._errors = t.errors, this._content = t.content, this._hostVisibility = t.hostVisibility, this._emitToDom = e;
    const s = this;
    this.props = {
      get value() {
        return s._props;
      },
      get errors() {
        return s._errors;
      },
      subscribe(i, r) {
        return s._subscribeProps(i, r);
      }
    }, this.events = {
      emit(i, r) {
        s._disposed || s._emitToDom(i, r);
      }
    }, this.content = t.hasContent ? {
      get value() {
        return s._content;
      },
      subscribe(i, r) {
        return s._subscribeContent(i, r);
      }
    } : null, this.hostVisibility = {
      get value() {
        return s._hostVisibility;
      },
      subscribe(i, r) {
        return s._subscribeHostVisibility(i, r);
      }
    };
  }
  /** @internal */
  notifyProps(t, e) {
    if (!this._disposed) {
      this._props = t, this._errors = e;
      for (const s of this._propsListeners)
        s(t, e);
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
      for (const s of this._hostVisibilityListeners)
        s(t, e);
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
    const s = () => {
      this._propsListeners.delete(t), e?.signal?.removeEventListener("abort", s);
    };
    return e?.signal?.addEventListener("abort", s, { once: !0 }), s;
  }
  _subscribeContent(t, e) {
    if (this._disposed || e?.signal?.aborted)
      return () => {
      };
    this._contentListeners.add(t), e?.immediate && t(this._content);
    const s = () => {
      this._contentListeners.delete(t), e?.signal?.removeEventListener("abort", s);
    };
    return e?.signal?.addEventListener("abort", s, { once: !0 }), s;
  }
  _subscribeHostVisibility(t, e) {
    if (this._disposed || e?.signal?.aborted)
      return () => {
      };
    this._hostVisibilityListeners.add(t), e?.immediate && t(this._hostVisibility, this._hostVisibility);
    const s = () => {
      this._hostVisibilityListeners.delete(t), e?.signal?.removeEventListener("abort", s);
    };
    return e?.signal?.addEventListener("abort", s, { once: !0 }), s;
  }
}, tt = class extends HTMLElement {
  constructor() {
    super(), h(this, "_internals"), h(this, "_contentObserver", null), h(this, "_initialized", !1), h(this, "_container", null), h(this, "_reactive", null), h(this, "_lastProps", null), h(this, "_lastErrors", []), h(this, "_lastContent", null), h(this, "_themeUnsub", null), h(this, "_hostVisible", null), this._internals = this.attachInternals(), this._hostVisible = C(this);
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
    const t = this.wippyConfig, e = Object.keys(t.propsSchema.properties), s = t.extraObservedAttributes ?? [];
    return [.../* @__PURE__ */ new Set([...e, ...s, y])];
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
    return w(this);
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
      let s, i;
      if (this._lastProps !== null)
        s = this._lastProps, i = this._lastErrors;
      else {
        const n = v(this, t.propsSchema);
        t.validateProps && n.errors.push(...t.validateProps(n.props)), s = n.props, i = n.errors, this._lastProps = s, this._lastErrors = i;
      }
      const r = e ? this._lastContent ?? this._extractContent(t.contentTemplate) : null;
      e && this._lastContent === null && (this._lastContent = r), this._reactive = new Z(
        { props: s, errors: i, content: r, hasContent: e, hostVisibility: this._hostVisible },
        this.emitEvent.bind(this)
      );
    }
    return this._reactive;
  }
  // ── Lifecycle ──────────────────────────────────────────────
  connectedCallback() {
    this._internals.states.add("loading");
    try {
      const t = this.constructor.wippyConfig, e = this._initialized, s = this.shadowRoot ?? this.attachShadow({ mode: t.shadowMode ?? "open" });
      let i;
      if (e)
        i = this._container;
      else {
        this.onInit(s), t.inlineCss && q(s, t.inlineCss);
        try {
          const l = g?.theming, p = M(
            l?.global?.cssVariables,
            l?.children?.cssVariables
          );
          J(s, p);
        } catch {
        }
        if (t.customCss !== !1)
          try {
            const l = g?.theming, p = [l?.global?.customCSS, l?.children?.customCSS].filter(Boolean).join(`
`);
            p && G(s, p);
          } catch {
          }
        (t.hostCssKeys === void 0 || t.hostCssKeys.length > 0) && k(s, t.hostCssKeys), i = document.createElement("div"), i.setAttribute("data-wippy-theme-root", "");
        const c = t.containerClasses ?? [];
        c.length > 0 && i.classList.add(...c), s.appendChild(i), this._container = i, H(T);
      }
      this._applyTheme(), this._themeUnsub || (this._themeUnsub = N("@theme", (c) => this._applyTheme(c)));
      const { props: r, errors: n } = v(this, t.propsSchema);
      t.validateProps && n.push(...t.validateProps(r));
      const o = r;
      this._lastProps = o, this._lastErrors = n;
      let a = null;
      t.contentTemplate && (a = this._extractContent(t.contentTemplate), this._lastContent = a, this._contentObserver = new MutationObserver(() => {
        const c = this._extractContent(t.contentTemplate);
        this._lastContent = c, this._reactive?.notifyContent(c), this.onContentChanged(c);
      }), this._contentObserver.observe(this, {
        childList: !0,
        characterData: !0,
        subtree: !0
      })), this.onMount(s, i, o, n, a, e), this._internals.states.delete("loading"), this._internals.states.add("ready"), e || (this._initialized = !0), this.onReady(), this.emitEvent("load");
    } catch (t) {
      this.onError(t), this._internals.states.delete("loading"), this._internals.states.add("error"), this.emitEvent("error", {
        message: t instanceof Error ? t.message : String(t),
        error: t
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
  _applyTheme(t = U.getThemeMode?.()) {
    b(t, this), this._container && b(t, this._container);
  }
  disconnectedCallback() {
    this._themeUnsub && (this._themeUnsub(), this._themeUnsub = null), b("auto", this), this._container && b("auto", this._container), this._contentObserver && (this._contentObserver.disconnect(), this._contentObserver = null), this.onUnmount(), this.emitEvent("unload"), this._internals.states.clear(), this._reactive?.dispose(), this._reactive = null, this._lastProps = null, this._lastErrors = [], this._lastContent = null, delete this.__wippyHost, delete this.__wippyHostBus;
  }
  attributeChangedCallback(t, e, s) {
    if (e === s)
      return;
    if (t === y) {
      const a = this._hostVisible, c = C(this);
      if (c === a)
        return;
      this._hostVisible = c, this.isConnected && this._initialized && (this._reactive?.notifyHostVisibility(c, a), this.onHostVisibilityChanged(c, a));
      return;
    }
    const i = this.constructor.wippyConfig, { props: r, errors: n } = v(this, i.propsSchema);
    i.validateProps && n.push(...i.validateProps(r));
    const o = r;
    this._lastProps = o, this._lastErrors = n, this._reactive?.notifyProps(o, n), this.onPropsChanged(o, n);
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
   * Uses `.content.textContent` since `<template>` stores content in a DocumentFragment.
   */
  _extractContent(t) {
    return this.querySelector(`template[data-type="${t}"]`)?.content.textContent?.trim() ?? null;
  }
  /** Called when child `<template>` content changes. Override to update framework state. */
  onContentChanged(t) {
  }
};
function et(t) {
  return t.__wippyHostBus ?? null;
}
function st(t) {
  return t.dataset.wippyPanelId ?? null;
}
var it = Object.defineProperty, rt = (t, e, s) => e in t ? it(t, e, { enumerable: !0, configurable: !0, writable: !0, value: s }) : t[e] = s, _ = (t, e, s) => rt(t, typeof e != "symbol" ? e + "" : e, s), P = /* @__PURE__ */ Symbol("wippy:emit"), nt = /* @__PURE__ */ Symbol("wippy:props"), ot = /* @__PURE__ */ Symbol("wippy:props_error"), at = /* @__PURE__ */ Symbol("wippy:content"), lt = /* @__PURE__ */ Symbol("wippy:panel-id"), ct = /* @__PURE__ */ Symbol("wippy:layout-bus"), ht = /* @__PURE__ */ Symbol("wippy:host"), R = /* @__PURE__ */ Symbol("wippy:host-visibility");
function bt() {
  const t = S(P);
  if (!t)
    throw new Error("useEvents() must be called inside a WippyVueElement");
  return t;
}
function ut() {
  const t = S(R);
  if (!t)
    throw new Error("useHostVisibility() must be called inside a WippyVueElement");
  return t;
}
function mt(t) {
  const e = ut();
  let s = !1, i = null, r = !1;
  function n() {
    if (i)
      return r = !0, i;
    let o;
    try {
      o = Promise.resolve(t());
    } catch (c) {
      o = Promise.reject(c);
    }
    const a = o.finally(() => {
      if (i === a && (i = null, s && r))
        return r = !1, n();
    });
    return i = a, a;
  }
  return I(() => (s = !0, n())), O(() => {
    s = !1, r = !1;
  }), L(e, (o, a) => {
    if (s && a === !1 && o === !0)
      return n();
  }), e;
}
var vt = class extends tt {
  constructor() {
    super(...arguments), _(this, "_vueApp", null), _(this, "_propsRef", f({})), _(this, "_errorsRef", f([])), _(this, "_contentRef", f(null)), _(this, "_hostVisibilityRef", f(null)), _(this, "_bridgeAbort", null);
  }
  /**
   * Override to provide Vue-specific configuration.
   */
  static get vueConfig() {
    throw new Error("WippyVueElement subclass must override static get vueConfig()");
  }
  onMount(t, e, s, i, r, n) {
    const o = this.constructor.vueConfig;
    this._propsRef.value = s, this._errorsRef.value = i, this._contentRef.value = r ?? null, this._hostVisibilityRef.value = this.hostVisible;
    for (const l of i)
      this.emitEvent("invalid", { message: l });
    const a = new AbortController();
    this._bridgeAbort = a, this.reactive.props.subscribe((l, p) => {
      this._propsRef.value = l, this._errorsRef.value = [...p];
      for (const u of p)
        this.emitEvent("invalid", { message: u });
    }, { signal: a.signal }), this.reactive.content && this.reactive.content.subscribe((l) => {
      this._contentRef.value = l;
    }, { signal: a.signal }), this.reactive.hostVisibility.subscribe((l) => {
      this._hostVisibilityRef.value = l;
    }, { signal: a.signal });
    const c = (l) => {
      if (a.signal.aborted)
        return;
      const p = D(), u = A(l.rootComponent);
      this._vueApp = u;
      const d = j();
      if (l.piniaPlugins)
        for (const m of l.piniaPlugins)
          d.use(m);
      if (u.use(d), l.plugins)
        for (const m of l.plugins)
          u.use(m);
      u.provide(nt, this._propsRef), u.provide(ot, this._errorsRef), u.provide(P, this.emitEvent.bind(this)), u.provide(at, this._contentRef), u.provide(R, this._hostVisibilityRef), u.provide(lt, st(this)), u.provide(ct, et(this)), u.provide(ht, w(this)), l.providers && l.providers(u, this), u.mount(e), p && W(p);
    };
    if (o.rootComponent)
      c(o);
    else if (o.lazyConfig) {
      const l = document.createElement("wippy-loading");
      l.setAttribute("no-bg", ""), e.appendChild(l), o.lazyConfig().then((p) => {
        a.signal.aborted || (l.remove(), c(p));
      }).catch((p) => {
        if (a.signal.aborted)
          return;
        const u = p instanceof Error ? p.message : String(p), d = document.createElement("wippy-error");
        d.setAttribute("title", "Failed to load"), d.setAttribute("message", u), l.replaceWith(d), this.emitEvent("error", { message: u });
      });
    } else
      throw new Error("WippyVueElement vueConfig must provide rootComponent or lazyConfig");
  }
  onUnmount() {
    this._bridgeAbort?.abort(), this._bridgeAbort = null, this._vueApp && (this._vueApp.unmount(), this._vueApp = null);
  }
};
export {
  vt as W,
  mt as a,
  bt as u
};
//# sourceMappingURL=wc-runtime-BMe_f3Uc.js.map
