var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../../mnt/attach/outputs/quartz/obsidian-plugin/mr-skala/src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => MrSkalaPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// ../../mnt/attach/outputs/quartz/obsidian-plugin/mr-skala/src/skala-core.ts
var DEFAULT_NOTE = "Narz\u0119dzie ma charakter pomocniczy i nie zast\u0119puje oceny klinicznej ani decyzji lekarza.";
var COLORS = ["zielony", "zolty", "pomaranczowy", "czerwony"];
var uid = 0;
function splitPipes(s) {
  return s.split("|").map((x) => x.trim()).filter((x) => x.length > 0);
}
function parseScale(src) {
  const scale = {
    title: "",
    desc: "",
    note: DEFAULT_NOTE,
    source: "",
    questions: [],
    bands: [],
    diagnoses: []
  };
  let defaultOptions = ["Tak", "Nie"];
  let curDx = null;
  let curCrit = null;
  const ensureDx = () => {
    if (!curDx) {
      curDx = {
        name: scale.title || "Rozpoznanie",
        criteria: [],
        hintsTitle: "",
        hints: [],
        metText: "",
        unmetText: ""
      };
      scale.diagnoses.push(curDx);
    }
    return curDx;
  };
  for (const rawLine of src.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;
    let m;
    if (m = line.match(/^skala\s*:\s*(.+)$/i)) {
      scale.title = m[1].trim();
    } else if (m = line.match(/^opis\s*:\s*(.+)$/i)) {
      scale.desc = m[1].trim();
    } else if (m = line.match(/^uwaga\s*:\s*(.+)$/i)) {
      scale.note = m[1].trim();
    } else if (m = line.match(/^(?:zrodlo|źródło)\s*:\s*(.+)$/i)) {
      scale.source = m[1].trim();
    } else if (m = line.match(/^rozpoznanie\s*:\s*(.+)$/i)) {
      curDx = null;
      curCrit = null;
      ensureDx().name = m[1].trim();
    } else if (m = line.match(/^kryterium\s*:\s*(.+)$/i)) {
      const parts = m[1].split("|").map((x) => x.trim());
      const spec = parts.slice(1).join(" ");
      let min = null;
      const mm = spec.match(/(?:min\.?|≥|>=)\s*(\d+)/i);
      if (mm && !/wszystk/i.test(spec)) min = Number(mm[1]);
      curCrit = { label: parts[0], min, items: [] };
      ensureDx().criteria.push(curCrit);
    } else if (m = line.match(/^wskaz(?:o|ó)wki\s*:\s*(.+)$/i)) {
      ensureDx().hintsTitle = m[1].trim();
    } else if (m = line.match(/^wskaz(?:o|ó)wka\s*:\s*(.+)$/i)) {
      ensureDx().hints.push(m[1].trim());
    } else if (m = line.match(/^(?:spelnione|spełnione)\s*:\s*(.+)$/i)) {
      ensureDx().metText = m[1].trim();
    } else if (m = line.match(/^(?:niespelnione|niespełnione)\s*:\s*(.+)$/i)) {
      ensureDx().unmetText = m[1].trim();
    } else if (m = line.match(/^opcje\s*:\s*(.+)$/i)) {
      const opts = splitPipes(m[1]);
      if (opts.length >= 2) defaultOptions = opts;
    } else if (m = line.match(/^wynik\s+(\d+)\s*(?:-|–|—)\s*(\d+)\s*:\s*(.+)$/i)) {
      pushBand(scale, Number(m[1]), Number(m[2]), m[3]);
    } else if (m = line.match(/^wynik\s+(\d+)\s*\+\s*:\s*(.+)$/i)) {
      pushBand(scale, Number(m[1]), Infinity, m[2]);
    } else if (m = line.match(/^wynik\s+(\d+)\s*:\s*(.+)$/i)) {
      pushBand(scale, Number(m[1]), Number(m[1]), m[2]);
    } else if (curCrit && (m = line.match(/^[-*]\s+(.+)$/))) {
      curCrit.items.push(m[1].trim());
    } else if (m = line.match(/^[-*]\s+(.+)$/)) {
      let body = m[1];
      let points = null;
      const arrow = body.lastIndexOf("=>");
      if (arrow !== -1) {
        const parsed = splitPipes(body.slice(arrow + 2)).map(Number);
        if (parsed.length > 0 && parsed.every((n) => !Number.isNaN(n))) {
          points = parsed;
          body = body.slice(0, arrow).trim();
        }
      }
      let options = defaultOptions;
      const own = body.match(/^(.*)\[([^\]]+)\]\s*$/);
      if (own) {
        const parsedOpts = splitPipes(own[2]);
        if (parsedOpts.length >= 2) {
          options = parsedOpts;
          body = own[1].trim();
        }
      }
      const finalPoints = options.map((_, i) => points && points[i] !== void 0 ? points[i] : i);
      scale.questions.push({ text: body, options, points: finalPoints });
    }
  }
  scale.diagnoses = scale.diagnoses.filter((d) => d.criteria.some((c) => c.items.length > 0));
  if (scale.questions.length === 0 && scale.diagnoses.length === 0) return null;
  scale.bands.sort((a, b) => a.min - b.min);
  assignColors(scale.bands);
  return scale;
}
function pushBand(scale, min, max, rest) {
  const parts = rest.split("|").map((x) => x.trim());
  let color = "";
  if (parts.length >= 3 && COLORS.includes(parts[parts.length - 1].toLowerCase())) {
    color = parts.pop().toLowerCase();
  }
  scale.bands.push({ min, max, label: parts[0] ?? "", desc: parts.slice(1).join(" | "), color });
}
function assignColors(bands) {
  const n = bands.length;
  bands.forEach((b, i) => {
    if (b.color) return;
    const idx = n <= 1 ? 0 : Math.round(i * (COLORS.length - 1) / (n - 1));
    b.color = COLORS[idx];
  });
}
function appendRich(parent, text) {
  text.split(/(\*\*[^*]+\*\*)/g).forEach((chunk) => {
    if (!chunk) return;
    if (chunk.startsWith("**") && chunk.endsWith("**")) {
      const strong = document.createElement("strong");
      strong.textContent = chunk.slice(2, -2);
      parent.appendChild(strong);
    } else {
      parent.appendChild(document.createTextNode(chunk));
    }
  });
}
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== void 0) node.textContent = text;
  return node;
}
function maxScore(scale) {
  return scale.questions.reduce((sum, q) => sum + Math.max(...q.points), 0);
}
function printScale(root, title, blank) {
  const clone = root.cloneNode(true);
  const src = root.querySelectorAll("input[type=radio]");
  const dst = clone.querySelectorAll("input[type=radio]");
  dst.forEach((d, i) => {
    if (!blank && src[i]?.checked) d.setAttribute("checked", "");
    else d.removeAttribute("checked");
  });
  if (blank) clone.classList.add("mr-skala--blank");
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write("<!doctype html><html><head><meta charset='utf-8'></head><body></body></html>");
  doc.close();
  doc.title = title || "Skala";
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((n) => doc.head.appendChild(n.cloneNode(true)));
  doc.body.appendChild(clone);
  const cleanup = () => iframe.remove();
  win.addEventListener("afterprint", cleanup);
  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(cleanup, 6e4);
  }, 500);
}
function buildScoring(scale) {
  const id = `mr-skala-${++uid}`;
  const root = el("div", "mr-skala");
  const answers = scale.questions.map(() => null);
  const max = maxScore(scale);
  if (scale.title) root.appendChild(el("h3", "mr-skala-title", scale.title));
  if (scale.desc) root.appendChild(el("p", "mr-skala-desc", scale.desc));
  const meta = el("div", "mr-skala-print-meta");
  meta.appendChild(el("span", void 0, "Pacjent: ______________________________"));
  meta.appendChild(el("span", void 0, "Data: ______________"));
  root.appendChild(meta);
  const progress = el("div", "mr-skala-progress");
  const bar = el("div", "mr-skala-progress-bar");
  progress.appendChild(bar);
  root.appendChild(progress);
  const form = el("div", "mr-skala-questions");
  const result = el("div", "mr-skala-result");
  result.setAttribute("role", "status");
  result.setAttribute("aria-live", "polite");
  result.hidden = true;
  const status = el("p", "mr-skala-status");
  function update() {
    const done = answers.filter((a) => a !== null).length;
    const total = answers.length;
    bar.style.width = `${done / total * 100}%`;
    if (done < total) {
      status.textContent = `Odpowiedziano na ${done} z ${total} pyta\u0144`;
      result.hidden = true;
      return;
    }
    status.textContent = `Odpowiedziano na wszystkie pytania (${total})`;
    const score = answers.reduce((s, a) => s + (a ?? 0), 0);
    const band = scale.bands.find((b) => score >= b.min && score <= b.max);
    result.replaceChildren();
    result.hidden = false;
    result.dataset.color = band?.color ?? "zolty";
    result.appendChild(el("div", "mr-skala-score", `Wynik: ${score} / ${max} pkt`));
    if (band) {
      const label = el("div", "mr-skala-band");
      appendRich(label, band.label);
      result.appendChild(label);
      if (band.desc) {
        const d = el("p", "mr-skala-band-desc");
        appendRich(d, band.desc);
        result.appendChild(d);
      }
    } else if (scale.bands.length > 0) {
      result.appendChild(el("p", "mr-skala-band-desc", "Brak zdefiniowanej interpretacji dla tego wyniku."));
    }
    const reset = el("button", "mr-skala-reset", "Wyczy\u015B\u0107 odpowiedzi");
    reset.type = "button";
    reset.addEventListener("click", () => {
      answers.fill(null);
      form.querySelectorAll("input[type=radio]").forEach((r) => r.checked = false);
      update();
      root.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    result.appendChild(reset);
  }
  scale.questions.forEach((q, qi) => {
    const fs = el("fieldset", "mr-skala-q");
    const legend = el("legend", "mr-skala-q-text");
    legend.appendChild(el("span", "mr-skala-q-num", `${qi + 1}.`));
    appendRich(legend, ` ${q.text}`);
    fs.appendChild(legend);
    const opts = el("div", "mr-skala-options");
    q.options.forEach((label, oi) => {
      const wrap = el("label", "mr-skala-option");
      const input = el("input");
      input.type = "radio";
      input.name = `${id}-q${qi}`;
      input.value = String(oi);
      input.addEventListener("change", () => {
        answers[qi] = q.points[oi];
        update();
      });
      wrap.appendChild(input);
      wrap.appendChild(el("span", "mr-skala-option-label", label));
      opts.appendChild(wrap);
    });
    fs.appendChild(opts);
    form.appendChild(fs);
  });
  root.appendChild(form);
  root.appendChild(status);
  root.appendChild(result);
  const actions = el("div", "mr-skala-actions");
  const printBtn = el("button", "mr-skala-action", "Drukuj");
  printBtn.type = "button";
  printBtn.addEventListener("click", () => printScale(root, scale.title, false));
  const blankBtn = el("button", "mr-skala-action", "Drukuj pust\u0105 ankiet\u0119");
  blankBtn.type = "button";
  blankBtn.addEventListener("click", () => printScale(root, scale.title, true));
  actions.appendChild(printBtn);
  actions.appendChild(blankBtn);
  root.appendChild(actions);
  const foot = el("p", "mr-skala-note");
  foot.textContent = scale.note + (scale.source ? ` \u0179r\xF3d\u0142o: ${scale.source}.` : "");
  root.appendChild(foot);
  update();
  return root;
}
function build(scale) {
  return scale.diagnoses.length > 0 ? buildCriteria(scale) : buildScoring(scale);
}
function buildCriteria(scale) {
  const id = `mr-skala-${++uid}`;
  const root = el("div", "mr-skala mr-skala--criteria");
  if (scale.title) root.appendChild(el("h3", "mr-skala-title", scale.title));
  if (scale.desc) root.appendChild(el("p", "mr-skala-desc", scale.desc));
  const meta = el("div", "mr-skala-print-meta");
  meta.appendChild(el("span", void 0, "Pacjent: ______________________________"));
  meta.appendChild(el("span", void 0, "Data: ______________"));
  root.appendChild(meta);
  const progress = el("div", "mr-skala-progress");
  const bar = el("div", "mr-skala-progress-bar");
  progress.appendChild(bar);
  root.appendChild(progress);
  const answers = scale.diagnoses.map(
    (d) => d.criteria.map((c) => c.items.map(() => null))
  );
  const critStatusEls = [];
  const dxResultEls = [];
  const status = el("p", "mr-skala-status");
  const body = el("div", "mr-skala-dxs");
  scale.diagnoses.forEach((dx, di) => {
    const section = el("section", "mr-skala-dx");
    section.appendChild(el("h4", "mr-skala-dx-title", dx.name));
    critStatusEls[di] = [];
    dx.criteria.forEach((crit, ci) => {
      const box = el("div", "mr-skala-crit");
      const head = el("div", "mr-skala-crit-head");
      head.appendChild(el("span", "mr-skala-crit-title", crit.label));
      const n = crit.items.length;
      if (crit.min !== null) {
        head.appendChild(el("span", "mr-skala-crit-req", `wymagane: \u2265${crit.min} z ${n}`));
      } else if (n > 1) {
        head.appendChild(el("span", "mr-skala-crit-req", "wymagane: wszystkie"));
      }
      const st = el("span", "mr-skala-crit-status");
      head.appendChild(st);
      critStatusEls[di][ci] = st;
      box.appendChild(head);
      crit.items.forEach((text, ii) => {
        const fs = el("fieldset", "mr-skala-q mr-skala-q--item");
        const legend = el("legend", "mr-skala-q-text");
        appendRich(legend, text);
        fs.appendChild(legend);
        const opts = el("div", "mr-skala-options");
        ["Tak", "Nie"].forEach((label, oi) => {
          const wrap = el("label", "mr-skala-option");
          const input = el("input");
          input.type = "radio";
          input.name = `${id}-d${di}-c${ci}-i${ii}`;
          input.value = String(oi);
          input.addEventListener("change", () => {
            answers[di][ci][ii] = oi === 0;
            update();
          });
          wrap.appendChild(input);
          wrap.appendChild(el("span", "mr-skala-option-label", label));
          opts.appendChild(wrap);
        });
        fs.appendChild(opts);
        box.appendChild(fs);
      });
      section.appendChild(box);
    });
    const res = el("div", "mr-skala-dx-result");
    res.setAttribute("role", "status");
    res.setAttribute("aria-live", "polite");
    dxResultEls[di] = res;
    section.appendChild(res);
    if (dx.hints.length > 0) {
      const hints = el("div", "mr-skala-hints");
      if (dx.hintsTitle) hints.appendChild(el("div", "mr-skala-hints-title", dx.hintsTitle));
      const ul = el("ul", "mr-skala-hints-list");
      dx.hints.forEach((h) => {
        const li = el("li");
        appendRich(li, h);
        ul.appendChild(li);
      });
      hints.appendChild(ul);
      section.appendChild(hints);
    }
    body.appendChild(section);
  });
  function critState(crit, a) {
    const yes = a.filter((x) => x === true).length;
    const unknown = a.filter((x) => x === null).length;
    const need = crit.min ?? crit.items.length;
    if (yes >= need) return { state: "met", yes };
    if (yes + unknown < need) return { state: "unmet", yes };
    return { state: "pending", yes };
  }
  function update() {
    let done = 0;
    let total = 0;
    answers.forEach((dxA) => dxA.forEach((cA) => cA.forEach((x) => (total++, x !== null && done++))));
    bar.style.width = `${total ? done / total * 100 : 0}%`;
    status.textContent = `Odpowiedziano na ${done} z ${total} pyta\u0144`;
    scale.diagnoses.forEach((dx, di) => {
      let metCount = 0;
      let anyUnmet = false;
      dx.criteria.forEach((crit, ci) => {
        const { state, yes } = critState(crit, answers[di][ci]);
        const n = crit.items.length;
        const stEl = critStatusEls[di][ci];
        stEl.dataset.state = state;
        const label = state === "met" ? "\u2714 spe\u0142nione" : state === "unmet" ? "\u2718 niespe\u0142nione" : "\u2026 w trakcie";
        stEl.textContent = `${label} (Tak: ${yes}/${n})`;
        if (state === "met") metCount++;
        if (state === "unmet") anyUnmet = true;
      });
      const res = dxResultEls[di];
      res.replaceChildren();
      let dState = "pending";
      if (anyUnmet) dState = "unmet";
      else if (metCount === dx.criteria.length) dState = "met";
      res.dataset.state = dState;
      let text;
      if (dState === "met") {
        text = dx.metText || `Spe\u0142nione kryteria rozpoznania: ${dx.name}.`;
      } else if (dState === "unmet") {
        text = dx.unmetText || `Kryteria rozpoznania \u201E${dx.name}\u201D nie s\u0105 spe\u0142nione.`;
      } else {
        text = `${dx.name}: spe\u0142nione kryteria ${metCount} z ${dx.criteria.length} (ocena w toku).`;
      }
      res.appendChild(el("div", "mr-skala-dx-verdict", text));
    });
  }
  root.appendChild(body);
  root.appendChild(status);
  const actions = el("div", "mr-skala-actions");
  const resetBtn = el("button", "mr-skala-action", "Wyczy\u015B\u0107 odpowiedzi");
  resetBtn.type = "button";
  resetBtn.addEventListener("click", () => {
    answers.forEach((dxA) => dxA.forEach((cA) => cA.fill(null)));
    body.querySelectorAll("input[type=radio]").forEach((r) => r.checked = false);
    update();
  });
  const printBtn = el("button", "mr-skala-action", "Drukuj");
  printBtn.type = "button";
  printBtn.addEventListener("click", () => printScale(root, scale.title, false));
  const blankBtn = el("button", "mr-skala-action", "Drukuj pust\u0105 ankiet\u0119");
  blankBtn.type = "button";
  blankBtn.addEventListener("click", () => printScale(root, scale.title, true));
  actions.appendChild(resetBtn);
  actions.appendChild(printBtn);
  actions.appendChild(blankBtn);
  root.appendChild(actions);
  const foot = el("p", "mr-skala-note");
  foot.textContent = scale.note + (scale.source ? ` \u0179r\xF3d\u0142o: ${scale.source}.` : "");
  root.appendChild(foot);
  update();
  return root;
}

// ../../mnt/attach/outputs/quartz/obsidian-plugin/mr-skala/src/sekcje.ts
var MIN_HEADINGS = 2;
var SIZER = ".markdown-preview-view .markdown-preview-sizer";
var SKIP_CONTAINER = ".markdown-embed, .hover-popover, .popover, .canvas-node";
var INDICATOR = ".heading-collapse-indicator";
var states = /* @__PURE__ */ new WeakMap();
function stateOf(s) {
  let st = states.get(s);
  if (!st) {
    st = { mode: "collapse", handled: /* @__PURE__ */ new Set() };
    states.set(s, st);
  }
  return st;
}
function indicators(sizer) {
  return Array.from(sizer.querySelectorAll(INDICATOR));
}
function isCollapsed(ind) {
  return ind.classList.contains("is-collapsed") || !!ind.parentElement?.classList.contains("is-collapsed");
}
function keyOf(ind) {
  const h = ind.closest("[data-heading]");
  const text = (h && h.getAttribute("data-heading") || ind.parentElement?.textContent || "").trim();
  const tag = ind.closest("h1,h2,h3,h4,h5,h6")?.tagName || "";
  return `${tag}:${text}`;
}
function applyDefault(sizer) {
  const st = stateOf(sizer);
  const inds = indicators(sizer);
  if (st.mode === "collapse") {
    for (const ind of inds) {
      const k = keyOf(ind);
      if (st.handled.has(k)) continue;
      st.handled.add(k);
      if (!isCollapsed(ind)) ind.click();
    }
  }
  ensureBar(sizer, inds.length);
}
function ensureBar(sizer, count) {
  const existing = sizer.querySelector(".mr-sec-bar");
  if (count < MIN_HEADINGS) {
    existing?.remove();
    return;
  }
  if (existing) return;
  const bar = document.createElement("div");
  bar.className = "mr-sec-bar";
  const mk = (label, open) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mr-sec-bar-btn";
    b.textContent = label;
    b.addEventListener("click", () => {
      const st = stateOf(sizer);
      st.mode = open ? "open" : "collapse";
      st.handled.clear();
      for (const ind of indicators(sizer)) {
        st.handled.add(keyOf(ind));
        if (isCollapsed(ind) === open) ind.click();
      }
    });
    return b;
  };
  bar.appendChild(mk("Rozwi\u0144 wszystko", true));
  bar.appendChild(mk("Zwi\u0144 wszystko", false));
  const header = sizer.querySelector(":scope > .mod-header");
  if (header) header.appendChild(bar);
  else sizer.insertBefore(bar, sizer.querySelector(":scope > div:not(.markdown-preview-pusher)"));
}
function removeAll(sizer) {
  sizer.querySelectorAll(".mr-sec-bar").forEach((b) => b.remove());
  states.delete(sizer);
}
function startSections(plugin, isEnabled) {
  const app = plugin.app;
  let scheduled = false;
  const enableNativeFolding = () => {
    try {
      if (app.vault?.getConfig?.("foldHeading") !== true) {
        app.vault?.setConfig?.("foldHeading", true);
        app.workspace?.getLeavesOfType?.("markdown")?.forEach((l) => {
          l.view?.previewMode?.rerender?.(true);
        });
      }
    } catch (e) {
      console.error("mr-skala: nie uda\u0142o si\u0119 w\u0142\u0105czy\u0107 zwijania nag\u0142\xF3wk\xF3w", e);
    }
  };
  const run = () => {
    scheduled = false;
    try {
      if (!isEnabled()) return;
      document.querySelectorAll(SIZER).forEach((s) => {
        if (s.closest(SKIP_CONTAINER)) return;
        applyDefault(s);
      });
    } catch (e) {
      console.error("mr-skala: zwijanie nag\u0142\xF3wk\xF3w", e);
    }
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(run);
  };
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      const t = m.target;
      if (t.closest && t.closest(".mr-sec-bar")) continue;
      schedule();
      return;
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
  plugin.register(() => obs.disconnect());
  plugin.registerEvent(plugin.app.workspace.on("layout-change", schedule));
  plugin.registerEvent(plugin.app.workspace.on("active-leaf-change", schedule));
  if (isEnabled()) enableNativeFolding();
  schedule();
  return {
    refresh: () => {
      if (isEnabled()) {
        enableNativeFolding();
        schedule();
      } else {
        document.querySelectorAll(SIZER).forEach((s) => removeAll(s));
      }
    }
  };
}

// ../../mnt/attach/outputs/quartz/obsidian-plugin/mr-skala/src/lek-core.ts
var LINK_HOMES = {
  zamienniki: "https://zamienniki.pharmindex.pl/",
  refundacja: "https://bartoszmowi.pl/drugs",
  laktacja: "https://www.e-lactancia.org/",
  chpl: "https://rejestry.ezdrowie.gov.pl/rpl/search/public"
};
var LINK_LABELS = {
  zamienniki: "Zamienniki",
  refundacja: "Refundacja",
  laktacja: "e-lactancia",
  chpl: "ChPL"
};
var LINK_AUTO = {
  zamienniki: {
    template: "https://indeks.mp.pl/leki/subst.html?phrase={q}",
    from: "name",
    plus: true
  },
  refundacja: {
    template: "https://www.google.com/search?q=site%3Abartoszmowi.pl+{q}&udm=14&hl=pl",
    from: "name",
    plus: true
  },
  laktacja: {
    template: "https://www.google.com/search?q=e-lactancia+{q}&udm=14&hl=pl",
    from: "substance",
    plus: true
  },
  chpl: {
    template: "https://www.google.com/search?q=ChPL+{q}&udm=14&hl=pl",
    from: "substance",
    plus: true
  }
};
function searchName(name) {
  return name.replace(/\s+\d.*$/, "").trim() || name.trim();
}
function autoLink(k, name, substance) {
  const a = LINK_AUTO[k];
  const raw = a.from === "name" ? searchName(name) : substance.trim();
  if (!raw) return LINK_HOMES[k];
  let q = encodeURIComponent(raw);
  if (a.plus) q = q.replace(/%20/g, "+");
  return a.template.replace("{q}", q);
}
var LINK_KEYS = ["zamienniki", "refundacja", "laktacja", "chpl"];
var uid2 = 0;
function normKey(k) {
  return k.trim().toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\s-]+/g, "_");
}
function parseNum(s) {
  if (s === null || s === void 0) return null;
  const t = String(s).trim();
  if (t === "") return null;
  if (!/^\d+([.,]\d+)?$/.test(t)) return NaN;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}
function fmt(n, maxDecimals = 2) {
  const d = Math.abs(n) > 0 && Math.abs(n) < 0.1 ? Math.max(maxDecimals, 3) : maxDecimals;
  const s = Number(n.toFixed(d)).toString();
  return s.replace(".", ",");
}
function safeUrl(raw) {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.toString();
  } catch {
    return null;
  }
}
function truthy(v) {
  return /^(true|tak|yes|1|prawda)$/i.test(v.trim());
}
function el2(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== void 0) e.textContent = text;
  return e;
}
function appendRich2(parent, text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  for (const p of parts) {
    if (!p) continue;
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) {
      parent.appendChild(el2("strong", void 0, p.slice(2, -2)));
    } else {
      parent.appendChild(document.createTextNode(p));
    }
  }
}
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
function icon(kind) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "1em");
  svg.setAttribute("height", "1em");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("class", "mr-ico");
  const add = (tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    svg.appendChild(e);
  };
  if (kind === "copy") {
    add("rect", { x: "9", y: "9", width: "11", height: "11", rx: "2.5" });
    add("path", { d: "M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" });
  } else if (kind === "external") {
    add("path", { d: "M14 4h6v6" });
    add("path", { d: "M20 4l-9 9" });
    add("path", { d: "M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" });
  } else if (kind === "chevron-down") {
    add("path", { d: "M6 9l6 6 6-6" });
  } else {
    add("path", { d: "M6 15l6-6 6 6" });
  }
  return svg;
}
function setLabel(b, label, ico, iconFirst = false) {
  b.textContent = "";
  const span = el2("span", "mr-btn-label", label);
  if (ico && iconFirst) b.appendChild(icon(ico));
  b.appendChild(span);
  if (ico && !iconFirst) b.appendChild(icon(ico));
}
function makeCopyButton(label, getText, className = "mr-drug-btn", ico, iconFirst = false) {
  const b = el2("button", className);
  b.type = "button";
  setLabel(b, label, ico, iconFirst);
  let timer;
  b.addEventListener("click", async () => {
    const text = getText();
    if (text === null) return;
    const ok = await copyText(text);
    b.dataset.state = ok ? "copied" : "failed";
    setLabel(b, ok ? "Skopiowano" : "Nie uda\u0142o si\u0119", ico, iconFirst);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      setLabel(b, label, ico, iconFirst);
      delete b.dataset.state;
    }, 1600);
  });
  return b;
}
function parseDrug(src) {
  const f = {};
  const infoLines = [];
  let cur = "";
  for (const raw of src.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;
    if (cur === "informacje" && (/^[-*•]\s+/.test(line) || /^\s/.test(raw))) {
      infoLines.push(line);
      continue;
    }
    const m = line.match(/^([^:]+?)\s*:\s*(.*)$/);
    if (!m) continue;
    const k = normKey(m[1]);
    const key = k === "info" ? "informacje" : k;
    cur = key;
    if (key === "informacje") {
      if (m[2].trim()) infoLines.unshift(m[2].trim());
      continue;
    }
    if (!(key in f)) f[key] = m[2].trim();
  }
  if (!f.nazwa) return null;
  const isRx = !!f.typ && /^rp/i.test(f.typ);
  const links = {};
  for (const k of LINK_KEYS) {
    const custom = f[k] ? safeUrl(f[k]) : null;
    const subst = k === "laktacja" && f.substancja_en ? f.substancja_en : f.substancja || "";
    links[k] = custom || autoLink(k, f.nazwa, subst);
  }
  let calc = null;
  if (f.kalkulator && truthy(f.kalkulator)) {
    const errors = [];
    const num = (key, label, positive = true) => {
      const v = parseNum(f[key]);
      if (v === null) return null;
      if (Number.isNaN(v) || positive && v <= 0) {
        errors.push(`Nieprawid\u0142owa warto\u015B\u0107 pola \u201E${label}\u201D.`);
        return null;
      }
      return v;
    };
    let mode = null;
    if (f.tryb) {
      const t = normKey(f.tryb);
      if (/dob/.test(t)) mode = "day";
      else if (/dawk/.test(t)) mode = "dose";
    }
    if (!mode) {
      errors.push(
        "Nie okre\u015Blono trybu dawkowania. Ustaw \u201Etryb: mg/kg/dawke\u201D albo \u201Etryb: mg/kg/dobe\u201D."
      );
    }
    const concMg = num("stezenie_mg", "stezenie_mg");
    const concMl = num("stezenie_ml", "stezenie_ml");
    if (concMg === null !== (concMl === null)) {
      errors.push("St\u0119\u017Cenie wymaga obu p\xF3l: stezenie_mg i stezenie_ml.");
    }
    calc = {
      mode,
      defaultDose: num("dawka_domyslna", "dawka_domyslna"),
      defaultFreq: num("podania_na_dobe", "podania_na_dobe"),
      concMg,
      concMl,
      maxSingleMg: num("maks_dawka_jednorazowa_mg", "maks_dawka_jednorazowa_mg"),
      maxDailyMg: num("maks_dawka_dobowa_mg", "maks_dawka_dobowa_mg"),
      weightMin: num("masa_min_kg", "masa_min_kg"),
      weightMax: num("masa_max_kg", "masa_max_kg"),
      ageMin: num("wiek_min_mies", "wiek_min_mies", false),
      ageMax: num("wiek_max_mies", "wiek_max_mies", false),
      roundMl: num("zaokraglenie_ml", "zaokraglenie_ml"),
      route: f.droga || "",
      errors
    };
  }
  return {
    name: f.nazwa,
    substance: f.substancja || "",
    dosing: f.dawkowanie || "",
    route: f.droga || "",
    isRx,
    rpPrefix: f.rp || "Rp.",
    dsPrefix: f.ds || "D.S.",
    rxDosing: f.dawkowanie_recepty || f.dawkowanie || "",
    info: infoLines,
    links,
    calc
  };
}
function prescriptionText(d) {
  if (d.isRx) {
    const lines = [`${d.rpPrefix} ${d.name}`];
    if (d.rxDosing) lines.push(`${d.dsPrefix} ${d.rxDosing}`);
    return lines.join("\n");
  }
  return d.dosing ? `${d.name}
${d.dosing}` : d.name;
}
function timesText(n) {
  return n === 1 ? "raz dziennie" : `${fmt(n)} razy dziennie`;
}
function calculate(def, inp, drug) {
  const r = {
    errors: [],
    blocks: [],
    infos: [],
    singleMg: null,
    dailyMg: null,
    singleMl: null,
    exactMl: null,
    rounded: false,
    readyText: null,
    rxText: null,
    formula: "",
    blocked: false
  };
  const ok = (v) => v !== null && Number.isFinite(v) && v > 0;
  if (!ok(inp.weight)) r.errors.push("Podaj mas\u0119 cia\u0142a wi\u0119ksz\u0105 od 0 kg.");
  if (!ok(inp.dose)) r.errors.push("Podaj dawk\u0119 wi\u0119ksz\u0105 od 0 mg/kg.");
  if (!ok(inp.freq) || !Number.isInteger(inp.freq) || inp.freq > 24) {
    r.errors.push("Liczba poda\u0144 na dob\u0119 musi by\u0107 liczb\u0105 ca\u0142kowit\u0105 od 1 do 24.");
  }
  const hasConc = inp.concMg !== null || inp.concMl !== null;
  if (hasConc && !(ok(inp.concMg) && ok(inp.concMl))) {
    r.errors.push("St\u0119\u017Cenie: podaj obie warto\u015Bci wi\u0119ksze od 0 (mg i ml) albo wyczy\u015B\u0107 oba pola.");
  }
  if (r.errors.length) {
    r.blocked = true;
    return r;
  }
  const weight = inp.weight;
  const dose = inp.dose;
  const freq = inp.freq;
  let singleMg;
  let dailyMg;
  if (inp.mode === "dose") {
    singleMg = weight * dose;
    dailyMg = singleMg * freq;
  } else {
    dailyMg = weight * dose;
    singleMg = dailyMg / freq;
  }
  let singleMl = null;
  if (hasConc) {
    const mg = inp.concMg;
    const ml = inp.concMl;
    const exact = singleMg * ml / mg;
    r.exactMl = exact;
    singleMl = exact;
    if (def.roundMl && def.roundMl > 0) {
      const step = def.roundMl;
      const rounded = Math.round(exact / step) * step;
      if (rounded > 0 && Math.abs(rounded - exact) > 1e-9) {
        singleMl = Number(rounded.toFixed(6));
        r.rounded = true;
        singleMg = singleMl * mg / ml;
        dailyMg = singleMg * freq;
        r.infos.push(
          `Obj\u0119to\u015B\u0107 zaokr\u0105glono do kroku ${fmt(step)} ml (dok\u0142adnie ${fmt(exact)} ml). Faktyczna dawka: ${fmt(singleMg)} mg (${fmt(singleMg / weight)} mg/kg).`
        );
      }
    }
  }
  r.singleMg = singleMg;
  r.dailyMg = dailyMg;
  r.singleMl = singleMl;
  r.formula = inp.mode === "dose" ? `${fmt(weight)} kg \xD7 ${fmt(dose)} mg/kg/dawk\u0119 = ${fmt(singleMg)} mg na dawk\u0119; \xD7 ${fmt(freq)} = ${fmt(dailyMg)} mg na dob\u0119` : `${fmt(weight)} kg \xD7 ${fmt(dose)} mg/kg/dob\u0119 = ${fmt(dailyMg)} mg na dob\u0119; \xF7 ${fmt(freq)} = ${fmt(singleMg)} mg na dawk\u0119`;
  const EPS = 1e-9;
  const hasAnyLimit = def.maxSingleMg !== null || def.maxDailyMg !== null;
  if (!hasAnyLimit) {
    r.infos.push(
      "Nie zdefiniowano maksymalnych dawek dla tego leku \u2013 nie mo\u017Cna zweryfikowa\u0107 bezpiecze\u0144stwa dawkowania."
    );
  } else {
    if (def.maxSingleMg === null) {
      r.infos.push("Brak zdefiniowanej maksymalnej dawki jednorazowej \u2013 nie sprawdzono.");
    } else if (singleMg > def.maxSingleMg + EPS) {
      r.blocks.push(
        `Przekroczono maksymaln\u0105 dawk\u0119 jednorazow\u0105: ${fmt(singleMg)} mg > ${fmt(def.maxSingleMg)} mg.`
      );
    }
    if (def.maxDailyMg === null) {
      r.infos.push("Brak zdefiniowanej maksymalnej dawki dobowej \u2013 nie sprawdzono.");
    } else if (dailyMg > def.maxDailyMg + EPS) {
      r.blocks.push(
        `Przekroczono maksymaln\u0105 dawk\u0119 dobow\u0105: ${fmt(dailyMg)} mg > ${fmt(def.maxDailyMg)} mg.`
      );
    }
  }
  if (def.weightMin !== null && weight < def.weightMin - EPS) {
    r.blocks.push(`Masa cia\u0142a poni\u017Cej zdefiniowanego minimum (${fmt(def.weightMin)} kg).`);
  }
  if (def.weightMax !== null && weight > def.weightMax + EPS) {
    r.blocks.push(`Masa cia\u0142a powy\u017Cej zdefiniowanego maksimum (${fmt(def.weightMax)} kg).`);
  }
  if (def.ageMin !== null || def.ageMax !== null) {
    if (inp.age === null || !Number.isFinite(inp.age)) {
      r.blocks.push("Dla tego leku zdefiniowano ograniczenia wieku \u2013 podaj wiek, aby je zweryfikowa\u0107.");
    } else {
      if (def.ageMin !== null && inp.age < def.ageMin - EPS) {
        r.blocks.push(`Wiek poni\u017Cej zdefiniowanego minimum (${fmt(def.ageMin)} mies.).`);
      }
      if (def.ageMax !== null && inp.age > def.ageMax + EPS) {
        r.blocks.push(`Wiek powy\u017Cej zdefiniowanego maksimum (${fmt(def.ageMax)} mies.).`);
      }
    }
  }
  r.blocked = r.blocks.length > 0;
  const volPart = singleMl !== null ? ` (${fmt(singleMl)} ml)` : "";
  r.readyText = `${fmt(singleMg)} mg${volPart} \xD7 ${timesText(freq)}`;
  const route = def.route ? `${def.route}, ` : "";
  r.rxText = drug.isRx ? `${drug.rpPrefix} ${drug.name}
${drug.dsPrefix} ${route}${r.readyText}` : `${drug.name}
${route}${r.readyText}`;
  return r;
}
function appendInfoRich(parent, text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g);
  for (const p of parts) {
    if (!p) continue;
    const link = p.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const url = safeUrl(link[2]);
      if (url) {
        const a = el2("a", "mr-drug-info-link", link[1]);
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.setAttribute("data-router-ignore", "");
        parent.appendChild(a);
        continue;
      }
    }
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) {
      parent.appendChild(el2("strong", void 0, p.slice(2, -2)));
    } else {
      parent.appendChild(document.createTextNode(p));
    }
  }
}
function appendInfo(parent, lines) {
  let ul = null;
  for (const l of lines) {
    const b = l.match(/^[-*•]\s+(.*)$/);
    if (b) {
      if (!ul) {
        ul = el2("ul", "mr-drug-info-list");
        parent.appendChild(ul);
      }
      const li = el2("li");
      appendInfoRich(li, b[1]);
      ul.appendChild(li);
    } else {
      ul = null;
      const p = el2("p", "mr-drug-info-text");
      appendInfoRich(p, l);
      parent.appendChild(p);
    }
  }
}
function buildDrug(d) {
  const id = `mr-drug-${++uid2}`;
  const root = el2("article", "mr-drug");
  const head = el2("div", "mr-drug-head");
  const titleBox = el2("div", "mr-drug-title");
  if (d.isRx) titleBox.appendChild(el2("span", "mr-drug-badge", d.rpPrefix));
  const titles = el2("div", "mr-drug-titles");
  const nameRow = el2("div", "mr-drug-namerow");
  nameRow.appendChild(el2("h4", "mr-drug-name", d.name));
  nameRow.appendChild(
    makeCopyButton("Kopiuj", () => prescriptionText(d), "mr-drug-copy-main", "copy", true)
  );
  titles.appendChild(nameRow);
  if (d.substance) titles.appendChild(el2("p", "mr-drug-substance", d.substance));
  titleBox.appendChild(titles);
  head.appendChild(titleBox);
  root.appendChild(head);
  const row = el2("div", "mr-drug-dosing-row");
  const dosing = el2("p", "mr-drug-dosing");
  appendRich2(dosing, d.dosing || "\u2014");
  if (d.route) {
    const rt = el2("span", "mr-drug-route");
    rt.appendChild(el2("strong", void 0, "Droga: "));
    rt.appendChild(document.createTextNode(d.route));
    dosing.appendChild(rt);
  }
  row.appendChild(dosing);
  const toggles = el2("div", "mr-drug-toggles");
  let calcBtn = null;
  let calcPanel = null;
  if (d.calc) {
    calcBtn = el2("button", "mr-drug-btn mr-drug-btn--toggle");
    calcBtn.type = "button";
    setLabel(calcBtn, "Kalkulator", "chevron-down");
    calcBtn.setAttribute("aria-expanded", "false");
    calcBtn.setAttribute("aria-controls", `${id}-calc`);
    toggles.appendChild(calcBtn);
  }
  row.appendChild(toggles);
  root.appendChild(row);
  if (d.calc && calcBtn) {
    calcPanel = buildCalculator(d, d.calc, id);
    calcPanel.id = `${id}-calc`;
    calcPanel.hidden = true;
    root.appendChild(calcPanel);
    calcBtn.addEventListener("click", () => {
      const open = calcPanel.hidden === true;
      calcPanel.hidden = !open;
      calcBtn.setAttribute("aria-expanded", String(open));
      calcBtn.classList.toggle("is-open", open);
      setLabel(calcBtn, "Kalkulator", open ? "chevron-up" : "chevron-down");
    });
  }
  const more = el2("div", "mr-drug-more");
  more.id = `${id}-more`;
  const pills = el2("div", "mr-drug-actions");
  pills.appendChild(makeCopyButton("Nazwa", () => d.name, "mr-drug-btn mr-drug-pill", "copy"));
  pills.appendChild(
    makeCopyButton("Dawkowanie", () => d.dosing, "mr-drug-btn mr-drug-pill", "copy")
  );
  for (const k of LINK_KEYS) {
    if (k === "chpl") continue;
    pills.appendChild(makeLink(LINK_LABELS[k], d.links[k]));
  }
  more.appendChild(pills);
  const infoId = `${id}-info`;
  const infoToggle = el2("button", "mr-drug-info-toggle");
  infoToggle.type = "button";
  infoToggle.setAttribute("aria-expanded", "false");
  infoToggle.setAttribute("aria-controls", infoId);
  setInfoLabel(infoToggle, false);
  more.appendChild(infoToggle);
  const infoBody = el2("div", "mr-drug-info");
  infoBody.id = infoId;
  infoBody.hidden = true;
  appendInfo(infoBody, d.info);
  infoBody.appendChild(makeLink("Otw\xF3rz ChPL w rejestrze", d.links.chpl));
  more.appendChild(infoBody);
  infoToggle.addEventListener("click", () => {
    const open = infoBody.hidden === true;
    infoBody.hidden = !open;
    infoToggle.setAttribute("aria-expanded", String(open));
    setInfoLabel(infoToggle, open);
  });
  root.appendChild(more);
  return root;
}
function setInfoLabel(b, open) {
  b.textContent = "";
  b.appendChild(el2("span", "mr-btn-label", "Informacje o leku / ChPL"));
  b.appendChild(el2("span", "mr-drug-info-hint", open ? "Zwi\u0144" : "Przeczytaj wi\u0119cej"));
  b.appendChild(icon(open ? "chevron-up" : "chevron-down"));
}
function makeLink(label, href) {
  const a = el2("a", "mr-drug-btn mr-drug-pill mr-drug-link");
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.setAttribute("data-router-ignore", "");
  a.appendChild(el2("span", "mr-btn-label", label));
  a.appendChild(icon("external"));
  return a;
}
function buildCalculator(d, def, id) {
  const panel = el2("div", "mr-calc");
  if (def.errors.length || !def.mode) {
    const err = el2("p", "mr-calc-fatal");
    err.setAttribute("role", "alert");
    err.textContent = "Kalkulator wy\u0142\u0105czony: " + def.errors.join(" ");
    panel.appendChild(err);
    return panel;
  }
  const defaults = {
    mode: def.mode,
    weight: "",
    dose: def.defaultDose !== null ? fmt(def.defaultDose, 4) : "",
    freq: def.defaultFreq !== null ? fmt(def.defaultFreq, 4) : "",
    concMg: def.concMg !== null ? fmt(def.concMg, 4) : "",
    concMl: def.concMl !== null ? fmt(def.concMl, 4) : "",
    age: ""
  };
  const state = { ...defaults };
  const hasConcDef = def.concMg !== null && def.concMl !== null;
  const needsAge = def.ageMin !== null || def.ageMax !== null;
  const mkField = (key, label, unit, cls = "") => {
    const wrap = el2("label", `mr-calc-field ${cls}`.trim());
    const input = el2("input", "mr-calc-input");
    input.type = "text";
    input.inputMode = "decimal";
    input.autocomplete = "off";
    input.value = state[key];
    input.id = `${id}-${key}`;
    const sr = el2("span", "mr-calc-sr", label);
    const u = el2("span", "mr-calc-unit", unit);
    wrap.appendChild(sr);
    wrap.appendChild(input);
    wrap.appendChild(u);
    input.addEventListener("input", () => {
      state[key] = input.value;
      update();
    });
    return { wrap, input, unit: u, sr };
  };
  const modeBox = el2("fieldset", "mr-calc-mode");
  modeBox.appendChild(el2("legend", "mr-calc-legend", "Tryb dawkowania"));
  const modeInputs = [];
  const modes = [
    { v: "dose", label: "mg/kg mc./dawk\u0119" },
    { v: "day", label: "mg/kg mc./dob\u0119" }
  ];
  for (const m of modes) {
    const lab = el2("label", "mr-calc-mode-opt");
    const r = el2("input");
    r.type = "radio";
    r.name = `${id}-mode`;
    r.value = m.v;
    r.checked = m.v === state.mode;
    r.addEventListener("change", () => {
      if (r.checked) {
        state.mode = m.v;
        modeChanged = m.v !== defaults.mode;
        update();
      }
    });
    modeInputs.push(r);
    lab.appendChild(r);
    lab.appendChild(el2("span", void 0, m.label));
    modeBox.appendChild(lab);
  }
  let modeChanged = false;
  panel.appendChild(modeBox);
  const modeWarn = el2("p", "mr-calc-warn");
  modeWarn.setAttribute("role", "status");
  panel.appendChild(modeWarn);
  const row1 = el2("div", "mr-calc-row");
  const fWeight = mkField("weight", "Masa cia\u0142a (kg)", "kg");
  const fDose = mkField("dose", "Dawka", "mg/kg/dawk\u0119");
  const fFreq = mkField("freq", "Liczba poda\u0144 na dob\u0119", "/dob\u0119");
  row1.appendChild(fWeight.wrap);
  row1.appendChild(el2("span", "mr-calc-op", "\xD7"));
  row1.appendChild(fDose.wrap);
  row1.appendChild(el2("span", "mr-calc-op", "\xD7"));
  row1.appendChild(fFreq.wrap);
  panel.appendChild(row1);
  let fAge = null;
  if (needsAge) {
    const rowAge = el2("div", "mr-calc-row");
    fAge = mkField("age", "Wiek dziecka (miesi\u0105ce)", "mies.");
    rowAge.appendChild(fAge.wrap);
    panel.appendChild(rowAge);
  }
  const row2 = el2("div", "mr-calc-row mr-calc-row--conc");
  row2.appendChild(el2("span", "mr-calc-rowlabel", "St\u0119\u017Cenie preparatu:"));
  const fMg = mkField("concMg", "Ilo\u015B\u0107 substancji (mg)", "mg");
  const fMl = mkField("concMl", "Obj\u0119to\u015B\u0107 referencyjna (ml)", "ml");
  row2.appendChild(fMg.wrap);
  row2.appendChild(el2("span", "mr-calc-op", "w"));
  row2.appendChild(fMl.wrap);
  panel.appendChild(row2);
  const concHint = el2("p", "mr-calc-hint", "Np. \u201E100 mg w 5 ml\u201D \u2013 ilo\u015B\u0107 substancji zawarta w podanej obj\u0119to\u015Bci. Puste = tylko mg.");
  panel.appendChild(concHint);
  const results = el2("table", "mr-calc-results");
  const thead = el2("thead");
  const hr = el2("tr");
  for (const h of ["Na dawk\u0119", "Obj\u0119to\u015B\u0107 na dawk\u0119", "Na dob\u0119"]) hr.appendChild(el2("th", void 0, h));
  thead.appendChild(hr);
  const tbody = el2("tbody");
  const vr = el2("tr");
  const cSingle = el2("td");
  const cVol = el2("td");
  const cDaily = el2("td");
  vr.appendChild(cSingle);
  vr.appendChild(cVol);
  vr.appendChild(cDaily);
  tbody.appendChild(vr);
  results.appendChild(thead);
  results.appendChild(tbody);
  panel.appendChild(results);
  const scheme = el2("p", "mr-calc-scheme");
  panel.appendChild(scheme);
  const formula = el2("p", "mr-calc-formula");
  panel.appendChild(formula);
  const msgs = el2("div", "mr-calc-msgs");
  msgs.setAttribute("role", "alert");
  msgs.setAttribute("aria-live", "polite");
  panel.appendChild(msgs);
  const ready = el2("div", "mr-calc-ready");
  const readyText = el2("p", "mr-calc-ready-text");
  ready.appendChild(readyText);
  const readyActions = el2("div", "mr-drug-actions");
  let current = null;
  const copyReady = makeCopyButton(
    "Kopiuj",
    () => current && !current.blocked && current.readyText ? current.readyText : null
  );
  const copyRx = makeCopyButton(
    "Kopiuj recept\u0119 z przeliczon\u0105 dawk\u0105",
    () => current && !current.blocked && current.rxText ? current.rxText : null
  );
  readyActions.appendChild(copyReady);
  readyActions.appendChild(copyRx);
  ready.appendChild(readyActions);
  panel.appendChild(ready);
  const foot = el2("div", "mr-calc-foot");
  const modBadge = el2("span", "mr-calc-badge", "Zmodyfikowano");
  modBadge.hidden = true;
  const resetBtn = el2("button", "mr-drug-btn", "Przywr\xF3\u0107 domy\u015Blne");
  resetBtn.type = "button";
  foot.appendChild(modBadge);
  foot.appendChild(resetBtn);
  panel.appendChild(foot);
  panel.appendChild(
    el2(
      "p",
      "mr-calc-disclaimer",
      "Narz\u0119dzie pomocnicze dla os\xF3b wykonuj\u0105cych zaw\xF3d medyczny. Nie weryfikuje klinicznej poprawno\u015Bci dawki \u2013 sprawd\u017A dawkowanie w ChPL. Dane nie s\u0105 zapisywane."
    )
  );
  const inputs = {
    weight: fWeight.input,
    dose: fDose.input,
    freq: fFreq.input,
    concMg: fMg.input,
    concMl: fMl.input
  };
  if (fAge) inputs.age = fAge.input;
  resetBtn.addEventListener("click", () => {
    const keep = { weight: state.weight, age: state.age };
    Object.assign(state, defaults, keep);
    modeChanged = false;
    for (const [k, inp] of Object.entries(inputs)) inp.value = state[k];
    modeInputs.forEach((r) => r.checked = r.value === state.mode);
    update();
  });
  function setInvalid(input, bad) {
    input.setAttribute("aria-invalid", bad ? "true" : "false");
    input.classList.toggle("is-invalid", bad);
  }
  function update() {
    const w = parseNum(state.weight);
    const dz = parseNum(state.dose);
    const fr = parseNum(state.freq);
    const cmg = parseNum(state.concMg);
    const cml = parseNum(state.concMl);
    const ag = needsAge ? parseNum(state.age) : null;
    const isBad = (v) => v !== null && Number.isNaN(v);
    setInvalid(fWeight.input, w === null || isBad(w) || w <= 0);
    setInvalid(fDose.input, dz === null || isBad(dz) || dz <= 0);
    setInvalid(fFreq.input, fr === null || isBad(fr));
    setInvalid(fMg.input, isBad(cmg));
    setInvalid(fMl.input, isBad(cml));
    if (fAge) setInvalid(fAge.input, isBad(ag));
    const unit = state.mode === "dose" ? "mg/kg/dawk\u0119" : "mg/kg/dob\u0119";
    fDose.unit.textContent = unit;
    fDose.sr.textContent = `Dawka (${unit})`;
    fDose.input.setAttribute("aria-label", `Dawka ${unit}`);
    modeWarn.textContent = modeChanged ? `Zmieniono tryb dawkowania: warto\u015B\u0107 \u201E${state.dose || "\u2014"}\u201D jest teraz interpretowana jako ${unit}. Sprawd\u017A dawk\u0119.` : "";
    modeWarn.hidden = !modeChanged;
    const hasNaN = [w, dz, fr, cmg, cml, ag].some((v) => v !== null && Number.isNaN(v));
    const modified = modeChanged || Object.keys(defaults).some(
      (k) => k !== "mode" && k !== "weight" && k !== "age" && state[k].trim() !== defaults[k].trim()
    );
    modBadge.hidden = !modified;
    const res = hasNaN ? null : calculate(
      def,
      {
        weight: w,
        dose: dz,
        freq: fr,
        mode: state.mode,
        concMg: cmg,
        concMl: cml,
        age: ag
      },
      d
    );
    current = res;
    msgs.replaceChildren();
    const showEmpty = () => {
      cSingle.textContent = "\u2014";
      cVol.textContent = "\u2014";
      cDaily.textContent = "\u2014";
      scheme.textContent = "";
      formula.textContent = "";
      readyText.textContent = "\u2014";
    };
    if (!res || res.errors.length) {
      showEmpty();
      const list = res ? res.errors : ["Wpisz poprawne liczby (np. 12,5). Znak dziesi\u0119tny: przecinek lub kropka."];
      for (const e of list) msgs.appendChild(el2("p", "mr-calc-msg mr-calc-msg--error", e));
      copyReady.disabled = true;
      copyRx.disabled = true;
      return;
    }
    cSingle.textContent = `${fmt(res.singleMg)} mg`;
    cVol.textContent = res.singleMl !== null ? `${fmt(res.singleMl)} ml` : "\u2014";
    cDaily.textContent = `${fmt(res.dailyMg)} mg`;
    scheme.textContent = `Schemat: ${fmt(dz)} ${unit} \xD7 ${fmt(fr)} ${fr === 1 ? "podanie" : "poda\u0144"}/dob\u0119, masa ${fmt(w)} kg.`;
    formula.textContent = `Wz\xF3r: ${res.formula}`;
    readyText.textContent = res.readyText || "\u2014";
    for (const b of res.blocks) msgs.appendChild(el2("p", "mr-calc-msg mr-calc-msg--block", b));
    if (res.blocked) {
      msgs.appendChild(
        el2("p", "mr-calc-msg mr-calc-msg--block", "Kopiowanie przeliczonej dawki zablokowane. Dawka nie zosta\u0142a zmieniona ani obci\u0119ta.")
      );
    }
    for (const i of res.infos) msgs.appendChild(el2("p", "mr-calc-msg mr-calc-msg--info", i));
    copyReady.disabled = res.blocked;
    copyRx.disabled = res.blocked;
    readyText.classList.toggle("is-blocked", res.blocked);
  }
  void hasConcDef;
  update();
  return panel;
}
function parseRecommendations(src) {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  let title = "";
  const body = [];
  let started = false;
  for (const line of lines) {
    if (!started) {
      const m = line.match(/^\s*tytu[lł]\s*:\s*(.*)$/i);
      if (m) {
        title = m[1].trim();
        continue;
      }
      if (line.trim() === "") continue;
      started = true;
    }
    body.push(line.replace(/\s+$/, ""));
  }
  while (body.length && body[body.length - 1] === "") body.pop();
  if (body.length === 0) return null;
  return { title: title || "Zalecenia", body: body.join("\n") };
}
var LONG_LINES = 8;
var LONG_CHARS = 600;
function buildRecommendations(r) {
  const id = `mr-rec-${++uid2}`;
  const root = el2("article", "mr-rec");
  const head = el2("div", "mr-rec-head");
  head.appendChild(el2("h4", "mr-rec-title", r.title));
  const actions = el2("div", "mr-rec-actions");
  actions.appendChild(makeCopyButton("Kopiuj", () => r.body.replace(/\*\*([^*]+)\*\*/g, "$1")));
  const lines = r.body.split("\n");
  const isLong = lines.filter((l) => l.trim()).length > LONG_LINES || r.body.length > LONG_CHARS;
  const body = el2("div", "mr-rec-body");
  body.id = `${id}-body`;
  for (const line of lines) {
    if (line.trim() === "") {
      body.appendChild(el2("div", "mr-rec-gap"));
      continue;
    }
    const p = el2("p", "mr-rec-line");
    const m = line.match(/^(\s*)(\d+[.)])\s+(.*)$/);
    if (m) {
      p.classList.add("mr-rec-line--num");
      p.appendChild(el2("span", "mr-rec-num", m[2]));
      const t = el2("span", "mr-rec-text");
      appendRich2(t, m[3]);
      p.appendChild(t);
    } else {
      appendRich2(p, line.trim());
    }
    body.appendChild(p);
  }
  if (isLong) {
    body.classList.add("is-collapsed");
    const tgl = el2("button", "mr-drug-btn mr-drug-btn--toggle", "Rozwi\u0144 \u02C5");
    tgl.type = "button";
    tgl.setAttribute("aria-expanded", "false");
    tgl.setAttribute("aria-controls", body.id);
    tgl.addEventListener("click", () => {
      const collapsed = body.classList.toggle("is-collapsed");
      tgl.setAttribute("aria-expanded", String(!collapsed));
      tgl.textContent = collapsed ? "Rozwi\u0144 \u02C5" : "Zwi\u0144 \u02C4";
    });
    actions.appendChild(tgl);
  }
  head.appendChild(actions);
  root.appendChild(head);
  root.appendChild(body);
  return root;
}

// ../../mnt/attach/outputs/quartz/obsidian-plugin/mr-skala/src/main.ts
var MrSkalaPlugin = class extends import_obsidian.Plugin {
  settings = { ramki: true };
  refreshSections = () => {
  };
  async onload() {
    this.settings = Object.assign({ ramki: true }, await this.loadData());
    const sec = startSections(this, () => this.settings.ramki);
    this.refreshSections = sec.refresh;
    this.addSettingTab(new MrSkalaSettingTab(this));
    this.registerMarkdownCodeBlockProcessor("skala", (source, el3) => {
      const scale = parseScale(source);
      if (!scale) {
        el3.createEl("pre", { text: "Nieprawid\u0142owa skala: brak pyta\u0144 (linie zaczynaj\u0105ce si\u0119 od \u201E- \u201D)." });
        return;
      }
      el3.appendChild(build(scale));
    });
    this.registerMarkdownCodeBlockProcessor("lek", (source, el3) => {
      const drug = parseDrug(source);
      if (!drug) {
        el3.createEl("pre", { text: "Nieprawid\u0142owa karta leku: brak linii \u201Enazwa: ...\u201D." });
        return;
      }
      el3.appendChild(buildDrug(drug));
    });
    this.registerMarkdownCodeBlockProcessor("zalecenia", (source, el3) => {
      const rec = parseRecommendations(source);
      if (!rec) {
        el3.createEl("pre", { text: "Puste zalecenia: dodaj tre\u015B\u0107 pod lini\u0105 \u201Etytul: ...\u201D." });
        return;
      }
      el3.appendChild(buildRecommendations(rec));
    });
  }
};
var MrSkalaSettingTab = class extends import_obsidian.PluginSettingTab {
  plugin;
  constructor(plugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("Ramki sekcji w trybie czytania").setDesc(
      "Nag\u0142\xF3wki zwini\u0119te domy\u015Blnie (natywne zwijanie Obsidiana) + przyciski Rozwi\u0144/Zwi\u0144 wszystko. W\u0142\u0105cza te\u017C opcj\u0119 Obsidiana \u201EZwijaj nag\u0142\xF3wki\u201D."
    ).addToggle(
      (t) => t.setValue(this.plugin.settings.ramki).onChange(async (v) => {
        this.plugin.settings.ramki = v;
        await this.plugin.saveData(this.plugin.settings);
        this.plugin.refreshSections();
      })
    );
  }
};
