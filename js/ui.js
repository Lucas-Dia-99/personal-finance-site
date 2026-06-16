// Tiny DOM builder + reusable UI components. No framework.

// el("div.card#id", { onClick }, ...children)
export function el(spec, props = {}, ...children) {
  let tag = "div", id = null;
  const classes = [];
  spec.replace(/([.#]?[^.#]+)/g, (m) => {
    if (m[0] === ".") classes.push(m.slice(1));
    else if (m[0] === "#") id = m.slice(1);
    else tag = m;
  });
  const node = document.createElement(tag);
  if (id) node.id = id;
  if (classes.length) node.className = classes.join(" ");
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") node.className += " " + v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in node && k !== "list" && k !== "type") node[k] = v;
    else node.setAttribute(k, v);
  }
  appendAll(node, children);
  return node;
}

function appendAll(node, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

// Like el's child handling but for an existing parent: appends nodes/strings
// and skips null/false/undefined so `cond && node` patterns are safe.
export function mount(parent, ...children) {
  appendAll(parent, children);
  return parent;
}

export function pageHead(title, subtitle) {
  return el("header.page-head", {}, el("h1", {}, title), subtitle && el("p", {}, subtitle));
}

export function card(...children) {
  return el("section.card", {}, ...children);
}

export function stat(label, value, { sub, tone } = {}) {
  return el("div.stat", {},
    el("span.label", {}, label),
    el("span.value" + (tone ? "." + tone : ""), {}, value),
    sub != null && (sub instanceof Node ? sub : el("span.sub", {}, sub)),
  );
}

// Labeled field wrapping any input node.
export function field(label, input, hint) {
  return el("label.field", {},
    el("span", {}, label),
    input,
    hint && el("span.hint", {}, hint),
  );
}

// Number input with optional $ prefix or % suffix. Calls onInput(number).
export function moneyInput(value, onInput, { suffix, min = 0, step = "any", placeholder } = {}) {
  const input = el("input", {
    type: "number", value: value ?? "", min, step,
    placeholder: placeholder || "",
    onInput: (e) => onInput(e.target.value === "" ? 0 : parseFloat(e.target.value)),
  });
  if (suffix) {
    return el("div.input-prefix.input-suffix", {}, input, el("span", {}, suffix));
  }
  return el("div.input-prefix", {}, el("span", {}, "$"), input);
}

export function numInput(value, onInput, opts = {}) {
  return moneyInput(value, onInput, { suffix: opts.suffix ?? " ", ...opts });
}

export function select(value, options, onChange) {
  return el("select", { onChange: (e) => onChange(e.target.value) },
    ...options.map(([val, label]) =>
      el("option", { value: val, selected: String(val) === String(value) }, label)),
  );
}

export function textInput(value, onInput, placeholder = "") {
  return el("input", {
    type: "text", value: value ?? "", placeholder,
    onInput: (e) => onInput(e.target.value),
  });
}

export function dateInput(value, onInput) {
  return el("input", { type: "date", value: value ?? "", onInput: (e) => onInput(e.target.value) });
}

export function button(label, onClick, kind = "") {
  return el("button.btn" + (kind ? ".btn-" + kind : ""), { type: "button", onClick }, label);
}

export function progressBar(fraction, good = false) {
  const pctW = Math.max(0, Math.min(1, fraction)) * 100;
  return el("div.progress" + (good ? ".good" : ""), {},
    el("span", { style: `width:${pctW}%` }));
}

export function empty(icon, text) {
  return el("div.empty", {}, el("div.big", {}, icon), el("div", {}, text));
}

export function deleteBtn(onClick) {
  return el("button.del-btn", { type: "button", title: "Remove", onClick }, "✕");
}
