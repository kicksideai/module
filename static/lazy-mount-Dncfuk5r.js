import { defineComponent as _, ref as u, onUnmounted as v, openBlock as a, createElementBlock as l, createElementVNode as s, createVNode as f, unref as p, toDisplayString as d, createTextVNode as h } from "vue";
import { on as y, api as g } from "@wippy-fe/proxy";
import { a as b } from "./wc-runtime-BMe_f3Uc.js";
import { Icon as k } from "@iconify/vue";
const C = { class: "st" }, w = { class: "st-head" }, E = { class: "st-head-icon" }, N = { class: "st-title" }, V = {
  key: 0,
  class: "st-state"
}, x = {
  key: 1,
  class: "st-state st-error"
}, B = {
  key: 2,
  class: "st-body"
}, I = { class: "st-card" }, L = { class: "st-count" }, R = /* @__PURE__ */ _({
  __name: "starter",
  setup(S) {
    const o = u(null), i = u(!0), r = u("");
    let e = 0;
    async function c() {
      const n = ++e;
      i.value = !0, r.value = "";
      try {
        const { data: t } = await g.get("/api/v1/starter/status");
        if (n !== e) return;
        if (!t?.success) throw new Error(t?.error || "Could not load starter status.");
        o.value = { module: String(t.module), count: Number(t.count) || 0 };
      } catch (t) {
        if (n !== e) return;
        o.value = null, r.value = t instanceof Error ? t.message : "Could not load starter status.";
      } finally {
        n === e && (i.value = !1);
      }
    }
    const m = y("acme.starter.changed", () => {
      c();
    });
    return b(c), v(() => {
      ++e, m();
    }), (n, t) => (a(), l("div", C, [
      s("div", w, [
        s("div", E, [
          f(p(k), { icon: "tabler:terminal-2" })
        ]),
        s("div", null, [
          s("h1", N, d(o.value?.module ?? "acme/starter"), 1),
          t[0] || (t[0] = s("p", { class: "st-sub" }, "Log entries written through the starter sink.", -1))
        ])
      ]),
      i.value ? (a(), l("div", V, "Loading…")) : r.value ? (a(), l("div", x, [
        h(d(r.value) + " ", 1),
        s("button", {
          class: "st-retry",
          type: "button",
          onClick: c
        }, "Retry")
      ])) : (a(), l("div", B, [
        s("div", I, [
          s("span", L, d(o.value?.count ?? 0), 1),
          t[1] || (t[1] = s("span", { class: "st-count-label" }, "log entries", -1))
        ])
      ]))
    ]));
  }
}), U = {
  rootComponent: R
};
export {
  U as mountConfig
};
//# sourceMappingURL=lazy-mount-Dncfuk5r.js.map
