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

// ../../mnt/attach/outputs/quartz/obsidian-plugin/mr-skala/src/main.ts
var MrSkalaPlugin = class extends import_obsidian.Plugin {
  async onload() {
    this.registerMarkdownCodeBlockProcessor("skala", (source, el2) => {
      const scale = parseScale(source);
      if (!scale) {
        el2.createEl("pre", { text: "Nieprawid\u0142owa skala: brak pyta\u0144 (linie zaczynaj\u0105ce si\u0119 od \u201E- \u201D)." });
        return;
      }
      el2.appendChild(build(scale));
    });
  }
};
