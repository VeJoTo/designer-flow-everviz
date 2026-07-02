# Custom Colour-Picker Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the browser-native `<input type="color">` across the minimap, preset, and base-map editors with a shared, branded HSV colour-picker popover that auto-enhances every `.color-input`.

**Architecture:** One self-contained `assets/js/color-picker.js` (HSV maths + a single shared popover + an auto-enhancer) plus `assets/css/color-picker.css`. The enhancer skins over the existing `.color-input` markup — it hides the native input, turns the swatch into a button that opens the popover, and writes the chosen hex back through the same `input`/`change` events consumers already bind. No consumer JS changes except one `enhanceAll()` call in the minimap editor (which builds inputs at runtime).

**Tech Stack:** Static prototype — HTML, CSS (per-page files under `assets/css/`), vanilla JS (IIFE on `window`). No build step, no test runner: **verification is in the browser served over HTTP.**

**Spec:** `docs/superpowers/specs/2026-07-02-color-picker-component-design.md`

---

## Verification conventions (read once)

No unit-test runner. Verify in the browser over HTTP:

```bash
cd ~/Documents/designer-flow-everviz
python3 -m http.server 8777   # leave running
```

**⚠️ Hard cache:** Chrome caches `.js`/`.html` for the whole session. After editing, either hard-reload (⌘⇧R) or verify in a **fresh isolated browser context** — a plain re-navigate runs stale JS. Never verify over `file://`.

Branch: `feat/color-picker` (already created, stacked on `feat/minimap-editor-redesign`). Commit after every task. `node --check <file>` is a fast parse gate for JS steps.

---

## File structure

**Create:**
- `assets/js/color-picker.js` — HSV maths, the shared popover, the auto-enhancer (`window.ColorPicker`).
- `assets/css/color-picker.css` — popover + enhanced-swatch styles.

**Modify (includes only, + one JS line):**
- `pages/minimap-editor.html`, `pages/preset-editor.html`, `pages/base-map-editor.html` — add the two `<link>`/`<script>` includes.
- `assets/js/minimap-editor.js` — call `window.ColorPicker.enhanceAll()` after the settings pane renders.

---

## Task 1: Colour maths (pure helpers)

**Files:**
- Create: `assets/js/color-picker.js`

- [ ] **Step 1: Create the file with the maths helpers and an IIFE shell**

Create `assets/js/color-picker.js`:

```js
// Shared custom colour picker. Exposed as window.ColorPicker.
// Skins over existing .color-input markup: hides the native <input type=color>,
// opens a branded HSV popover, and writes hex back through the same input/change
// events consumers already bind.
(function (global) {
  "use strict";

  // ---- Colour maths (all pure) ----
  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }
  function normHex(input) {
    if (typeof input !== "string") return null;
    let s = input.trim().replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
    return "#" + s.toLowerCase();
  }
  function hexToRgb(hex) {
    const h = normHex(hex) || "#000000";
    return {
      r: parseInt(h.slice(1, 3), 16),
      g: parseInt(h.slice(3, 5), 16),
      b: parseInt(h.slice(5, 7), 16),
    };
  }
  function rgbToHex(r, g, b) {
    const to2 = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
    return "#" + to2(r) + to2(g) + to2(b);
  }
  // h in [0,360), s/v in [0,1]
  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    const s = max === 0 ? 0 : d / max;
    return { h, s, v: max };
  }
  function hsvToRgb(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
  }
  function hexToHsv(hex) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHsv(r, g, b);
  }
  function hsvToHex(h, s, v) {
    const { r, g, b } = hsvToRgb(h, s, v);
    return rgbToHex(r, g, b);
  }

  // Expose maths now; the enhancer + popover are added in later tasks.
  global.ColorPicker = {
    _math: { clamp, normHex, hexToRgb, rgbToHex, rgbToHsv, hsvToRgb, hexToHsv, hsvToHex },
  };
})(typeof window !== "undefined" ? window : this);
```

- [ ] **Step 2: Verify the maths in Node (round-trip)**

Run:
```bash
cd ~/Documents/designer-flow-everviz
node -e '
global.window = global;
require("./assets/js/color-picker.js");
const M = window.ColorPicker._math;
const cases = ["#eb3a24", "#28277e", "#ffffff", "#000000", "#00ff00"];
let ok = true;
for (const hex of cases) {
  const hsv = M.hexToHsv(hex);
  const back = M.hsvToHex(hsv.h, hsv.s, hsv.v);
  if (back !== hex) { ok = false; console.log("MISMATCH", hex, "->", back); }
}
console.log("normHex bad:", M.normHex("nope"), "good:", M.normHex("EB3A24"));
console.log(ok ? "ROUNDTRIP_OK" : "ROUNDTRIP_FAIL");
'
```
Expected: `normHex bad: null good: #eb3a24` and `ROUNDTRIP_OK`.

- [ ] **Step 3: Commit**

```bash
git add assets/js/color-picker.js
git commit -m "feat(color-picker): HSV colour maths helpers"
```

---

## Task 2: Popover + swatch stylesheet

**Files:**
- Create: `assets/css/color-picker.css`

- [ ] **Step 1: Create the stylesheet**

Create `assets/css/color-picker.css`:

```css
/* Custom colour picker: enhanced swatch + shared popover. */

/* The enhanced swatch becomes a button; hide the native input it wraps. */
.color-input__swatch[data-cp-ready] { cursor: pointer; }
.color-input__swatch[data-cp-ready] input[type="color"] { display: none; }

/* Popover shell (appended to <body>, positioned via fixed inline coords). */
.cp-pop {
  position: fixed;
  z-index: 1000;
  width: 200px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 15px 6px rgba(0, 0, 0, 0.06);
  padding: 16px;
  box-sizing: border-box;
  font-family: var(--font-sans, "Gordita", system-ui, sans-serif);
}
.cp-pop[hidden] { display: none; }

.cp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.cp-title { font-size: 14px; font-weight: 700; color: #172b4c; }
.cp-close { border: 0; background: none; cursor: pointer; padding: 2px; line-height: 0; color: #172b4c; }

/* Saturation/value square. Base hue set via --cp-hue-hex inline. */
.cp-sv {
  position: relative;
  width: 168px;
  height: 124px;
  border-radius: 4px;
  cursor: crosshair;
  background:
    linear-gradient(to top, #000, rgba(0, 0, 0, 0)),
    linear-gradient(to right, #fff, rgba(255, 255, 255, 0)),
    var(--cp-hue-hex, #ff0000);
  touch-action: none;
}
.cp-sv__handle,
.cp-hue__handle {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* Hue slider */
.cp-hue {
  position: relative;
  width: 168px;
  height: 10px;
  margin-top: 14px;
  border-radius: 15px;
  cursor: pointer;
  touch-action: none;
  background: linear-gradient(90deg,
    #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%,
    #0000ff 67%, #ff00ff 83%, #ff0000 100%);
}
.cp-hue__handle { top: 50%; }

/* Hex field */
.cp-hex-row { margin-top: 14px; }
.cp-hex {
  width: 100%;
  box-sizing: border-box;
  background: #f7f8f8;
  border: 0;
  border-radius: 4px;
  box-shadow: inset 0 2px 2px rgba(0, 0, 0, 0.12);
  padding: 5px 8px;
  font-size: 12px;
  font-weight: 500;
  color: #28277e;
  text-transform: uppercase;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
}
.cp-hex:focus { outline: 2px solid #6d5bd1; outline-offset: 1px; }
```

- [ ] **Step 2: Commit**

```bash
git add assets/css/color-picker.css
git commit -m "feat(color-picker): popover + enhanced-swatch styles"
```

---

## Task 3: Enhancer + write-back, wired into the three pages

**Files:**
- Modify: `assets/js/color-picker.js`
- Modify: `pages/minimap-editor.html`, `pages/preset-editor.html`, `pages/base-map-editor.html`
- Modify: `assets/js/minimap-editor.js`

- [ ] **Step 1: Add the enhancer + shared state to `color-picker.js`**

In `assets/js/color-picker.js`, replace the final `global.ColorPicker = { _math: {...} };` block with the following (keeps `_math`, adds resolve/enhance/setValue + a shared `state`; the popover open/close is a stub filled in Task 4):

```js
  // ---- Enhancer ----
  const M = { clamp, normHex, hexToRgb, rgbToHex, rgbToHsv, hsvToRgb, hexToHsv, hsvToHex };

  // Resolve the parts of a .color-input defensively (markup differs per site).
  function resolveParts(root) {
    const swatch = root.querySelector(".color-input__swatch");
    if (!swatch) return null;
    const hex =
      root.querySelector(".color-input__hex") ||
      root.querySelector('input[type="text"]');
    const native = swatch.querySelector('input[type="color"]'); // may be null
    return { root, swatch, hex, native };
  }

  function currentHex(parts) {
    if (parts.native && M.normHex(parts.native.value)) return M.normHex(parts.native.value);
    if (parts.hex && M.normHex(parts.hex.value)) return M.normHex(parts.hex.value);
    // fall back to the swatch's inline background if it's a hex
    const bg = parts.swatch.style.background || "";
    const m = bg.match(/#([0-9a-fA-F]{6})/);
    return m ? "#" + m[1].toLowerCase() : "#000000";
  }

  // Single write path. Updates swatch + hex + native, fires input/change on both
  // so any consumer binding is hit. `applying` guards against the hex-change loop.
  let applying = false;
  function setValue(parts, hexRaw) {
    const hex = M.normHex(hexRaw);
    if (!hex) return;
    applying = true;
    parts.swatch.style.background = hex;
    if (parts.hex) parts.hex.value = hex.toUpperCase();
    if (parts.native) parts.native.value = hex;
    const fire = (el) => {
      if (!el) return;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    fire(parts.native);
    fire(parts.hex);
    applying = false;
  }

  // Title text = the nearest label in the row; fallback "Colour".
  function labelFor(root) {
    const row = root.closest(".mm-field, .prop-row, .wiz-row") || root.parentElement;
    const lab = row && row.querySelector(".mm-field__label, .prop-label, .wiz-row__label, label");
    const t = lab && lab.textContent.trim();
    return t || "Colour";
  }

  function enhance(root) {
    if (root.dataset.cpReady) return;
    const parts = resolveParts(root);
    if (!parts) return;
    root.dataset.cpReady = "1";
    parts.swatch.dataset.cpReady = "1";
    // Make the swatch a button.
    parts.swatch.setAttribute("role", "button");
    parts.swatch.setAttribute("tabindex", "0");
    parts.swatch.setAttribute("aria-haspopup", "dialog");
    parts.swatch.setAttribute("aria-expanded", "false");
    parts.swatch.style.background = currentHex(parts);
    const open = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      openPopover(parts);
    };
    parts.swatch.addEventListener("click", open);
    parts.swatch.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") open(e);
    });
    // Keep hex typing working + sync popover if open (ignore our own writes).
    if (parts.hex) {
      parts.hex.addEventListener("change", () => {
        if (applying) return;
        const hex = M.normHex(parts.hex.value);
        if (hex) { setValue(parts, hex); syncPopover(parts, hex); }
      });
    }
  }

  function enhanceAll(root) {
    (root || document).querySelectorAll(".color-input").forEach(enhance);
  }

  // Popover hooks — real implementations land in Task 4/5/6. Stubs for now so
  // Task 3 is verifiable (swatch shows colour, native hidden) without a popover.
  function openPopover(parts) { /* Task 4 */ }
  function syncPopover(parts, hex) { /* Task 5 */ }

  global.ColorPicker = { _math: M, enhance, enhanceAll, _setValue: setValue, _currentHex: currentHex, _resolveParts: resolveParts, _labelFor: labelFor };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => enhanceAll());
  } else {
    enhanceAll();
  }
})(typeof window !== "undefined" ? window : this);
```

- [ ] **Step 2: Add the includes to the three pages**

In each of `pages/minimap-editor.html`, `pages/preset-editor.html`, `pages/base-map-editor.html`:
- Add to `<head>`, after the last existing `<link rel="stylesheet" …>`:
  ```html
  <link rel="stylesheet" href="assets/css/color-picker.css" />
  ```
- Add to the bottom script list, **after** `saved-maps.js` and before `chrome.js`:
  ```html
  <script src="assets/js/color-picker.js" defer></script>
  ```

- [ ] **Step 3: Call `enhanceAll()` after the minimap renders its settings**

In `assets/js/minimap-editor.js`, find `renderSettings()`. At the very end of that function (after `renderCustomState(lvl);`), add:

```js
    if (window.ColorPicker) window.ColorPicker.enhanceAll(fieldsEl);
```
This upgrades the colour inputs the minimap builds at runtime each time a level is selected (idempotent via the `cpReady` guard).

- [ ] **Step 4: Verify parse + native hidden + swatch coloured (no popover yet)**

```bash
cd ~/Documents/designer-flow-everviz && node --check assets/js/color-picker.js && echo PARSE_OK
```
Then serve and open **in a fresh isolated context / hard reload**:
- `http://localhost:8777/pages/minimap-editor.html` — the Water/Land/Background swatches show their colour; the native colour chrome no longer appears; clicking a swatch does nothing yet (popover is a stub). No console errors.
- `http://localhost:8777/pages/preset-editor.html` — select a marker/region preset with colour fields; swatches enhanced, native hidden.
- `http://localhost:8777/pages/base-map-editor.html` — the colour row swatch is present (it had no native input; enhancer still marks it a button).

Quick scripted check (run in DevTools console or via evaluate):
```js
[...document.querySelectorAll('.color-input')].map(ci => ({
  ready: ci.dataset.cpReady, nativeHidden: (ci.querySelector('input[type=color]')||{}).offsetParent === null
}))
```
Expected: every `.color-input` has `ready:"1"`.

- [ ] **Step 5: Commit**

```bash
git add assets/js/color-picker.js assets/js/minimap-editor.js pages/minimap-editor.html pages/preset-editor.html pages/base-map-editor.html
git commit -m "feat(color-picker): auto-enhance .color-input + write-back; wire pages"
```

---

## Task 4: The popover — build, open, position, close

**Files:**
- Modify: `assets/js/color-picker.js`

- [ ] **Step 1: Replace the `openPopover` stub with a real popover + lifecycle**

In `assets/js/color-picker.js`, replace `function openPopover(parts) { /* Task 4 */ }` with the popover element builder, open/position/close, and an `activeParts` reference. (The SV/hue/hex internals are filled in Task 5; this task renders the shell and wires close.)

```js
  // ---- Shared popover ----
  let popEl = null;
  let activeParts = null;
  let activeHsv = { h: 0, s: 0, v: 0 };

  function ensurePop() {
    if (popEl) return popEl;
    popEl = document.createElement("div");
    popEl.className = "cp-pop";
    popEl.setAttribute("role", "dialog");
    popEl.hidden = true;
    popEl.innerHTML =
      '<div class="cp-head">' +
        '<span class="cp-title" data-cp-title>Colour</span>' +
        '<button type="button" class="cp-close" aria-label="Close">✕</button>' +
      "</div>" +
      '<div class="cp-sv" data-cp-sv><span class="cp-sv__handle" data-cp-sv-handle></span></div>' +
      '<div class="cp-hue" data-cp-hue><span class="cp-hue__handle" data-cp-hue-handle></span></div>' +
      '<div class="cp-hex-row"><input type="text" class="cp-hex" data-cp-hex maxlength="7" spellcheck="false" /></div>';
    document.body.appendChild(popEl);
    popEl.querySelector(".cp-close").addEventListener("click", closePopover);
    // Outside-click + Esc close.
    document.addEventListener("click", (e) => {
      if (popEl.hidden) return;
      if (popEl.contains(e.target)) return;
      if (activeParts && activeParts.swatch.contains(e.target)) return;
      closePopover();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !popEl.hidden) closePopover();
    });
    wirePopInputs(); // Task 5
    return popEl;
  }

  function positionPop(swatch) {
    const r = swatch.getBoundingClientRect();
    ensurePop();
    popEl.hidden = false; // must be visible to measure
    const pw = popEl.offsetWidth, ph = popEl.offsetHeight;
    let top = r.bottom + 6;
    if (top + ph > window.innerHeight - 8 && r.top - ph - 6 > 8) top = r.top - ph - 6;
    let left = r.left;
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
    popEl.style.top = Math.round(Math.max(8, top)) + "px";
    popEl.style.left = Math.round(Math.max(8, left)) + "px";
  }

  function openPopover(parts) {
    activeParts = parts;
    ensurePop();
    popEl.querySelector("[data-cp-title]").textContent = labelFor(parts.root);
    const hex = currentHex(parts);
    activeHsv = M.hexToHsv(hex);
    positionPop(parts.swatch);
    renderPop(hex); // Task 5
    parts.swatch.setAttribute("aria-expanded", "true");
  }

  function closePopover() {
    if (!popEl || popEl.hidden) return;
    popEl.hidden = true;
    if (activeParts) activeParts.swatch.setAttribute("aria-expanded", "false");
    activeParts = null;
  }
```

- [ ] **Step 2: Add temporary no-op render/wire so the file parses (replaced in Task 5)**

Still in `color-picker.js`, add these two stubs just above `global.ColorPicker = …` (Task 5 replaces them):

```js
  function renderPop(hex) { const el = popEl.querySelector("[data-cp-hex]"); if (el) el.value = hex.toUpperCase(); }
  function wirePopInputs() { /* Task 5 */ }
  function syncPopoverReal(parts, hex) { if (activeParts === parts && !popEl.hidden) { activeHsv = M.hexToHsv(hex); renderPop(hex); } }
```

Also replace the earlier `function syncPopover(parts, hex) { /* Task 5 */ }` stub body with a call to the real one:
```js
  function syncPopover(parts, hex) { syncPopoverReal(parts, hex); }
```

- [ ] **Step 3: Verify open/close/position**

```bash
cd ~/Documents/designer-flow-everviz && node --check assets/js/color-picker.js && echo PARSE_OK
```
Serve + fresh context: on `minimap-editor.html`, click the Water swatch → a white popover appears next to it with a "Water" title, an (unstyled-behaviour) square + hue bar + a hex field showing `#CFE8F5`. ✕ / outside-click / Esc close it. No console errors.

- [ ] **Step 4: Commit**

```bash
git add assets/js/color-picker.js
git commit -m "feat(color-picker): shared popover shell — open, position, close"
```

---

## Task 5: Render SV square + hue + hex from the active colour

**Files:**
- Modify: `assets/js/color-picker.js`

- [ ] **Step 1: Replace the Task-4 render/wire stubs with real rendering**

In `assets/js/color-picker.js`, replace the three stub lines from Task 4 Step 2 (`renderPop`, `wirePopInputs`, `syncPopoverReal`) with:

```js
  // Paint the popover from activeHsv. `hex` is the current resolved colour.
  function renderPop(hex) {
    const sv = popEl.querySelector("[data-cp-sv]");
    const svH = popEl.querySelector("[data-cp-sv-handle]");
    const hueH = popEl.querySelector("[data-cp-hue-handle]");
    const hexEl = popEl.querySelector("[data-cp-hex]");
    // SV square base colour = full-sat/value at the current hue.
    sv.style.setProperty("--cp-hue-hex", M.hsvToHex(activeHsv.h, 1, 1));
    const svRect = { w: sv.clientWidth, h: sv.clientHeight };
    svH.style.left = activeHsv.s * svRect.w + "px";
    svH.style.top = (1 - activeHsv.v) * svRect.h + "px";
    const hue = popEl.querySelector("[data-cp-hue]");
    hueH.style.left = (activeHsv.h / 360) * hue.clientWidth + "px";
    if (hexEl && document.activeElement !== hexEl) hexEl.value = (M.normHex(hex) || "#000000").toUpperCase();
  }

  function syncPopoverReal(parts, hex) {
    if (activeParts === parts && popEl && !popEl.hidden) {
      activeHsv = M.hexToHsv(hex);
      renderPop(hex);
    }
  }

  // Commit the current activeHsv to the enhanced input + repaint.
  function commitHsv() {
    const hex = M.hsvToHex(activeHsv.h, activeHsv.s, activeHsv.v);
    if (activeParts) setValue(activeParts, hex);
    renderPop(hex);
  }

  function wirePopInputs() {
    // Hex field inside the popover.
    const hexEl = popEl.querySelector("[data-cp-hex]");
    hexEl.addEventListener("change", () => {
      const hex = M.normHex(hexEl.value);
      if (!hex) { hexEl.value = M.hsvToHex(activeHsv.h, activeHsv.s, activeHsv.v).toUpperCase(); return; }
      activeHsv = M.hexToHsv(hex);
      commitHsv();
    });
    // Drag handlers are added in Task 6.
    wirePopDrag(); // Task 6
  }
```

- [ ] **Step 2: Add a Task-6 drag stub so the file parses**

Add just above `global.ColorPicker = …`:
```js
  function wirePopDrag() { /* Task 6 */ }
```

- [ ] **Step 3: Verify the popover reflects the colour**

Parse: `node --check assets/js/color-picker.js` → PARSE_OK.
Serve + fresh context: open the Water swatch popover — the SV square shows a blue-ish base hue, both handles sit at positions matching `#CFE8F5` (handle near top for high value, low saturation), and the hex reads `#CFE8F5`. Typing `#EB3A24` into the popover hex field + Enter turns the square red, moves the handles, updates the swatch, and updates the live preview (globe water). No console errors.

- [ ] **Step 4: Commit**

```bash
git add assets/js/color-picker.js
git commit -m "feat(color-picker): render SV square + hue + hex from active colour"
```

---

## Task 6: Drag interactions on the SV square and hue slider

**Files:**
- Modify: `assets/js/color-picker.js`

- [ ] **Step 1: Replace the `wirePopDrag` stub with pointer drag**

In `assets/js/color-picker.js`, replace `function wirePopDrag() { /* Task 6 */ }` with:

```js
  function wirePopDrag() {
    const sv = popEl.querySelector("[data-cp-sv]");
    const hue = popEl.querySelector("[data-cp-hue]");

    function dragOn(el, onMove) {
      el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const move = (ev) => onMove(ev, rect);
        move(e);
        const up = () => {
          document.removeEventListener("pointermove", move);
          document.removeEventListener("pointerup", up);
        };
        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", up);
      });
    }

    dragOn(sv, (ev, rect) => {
      const x = clamp(ev.clientX - rect.left, 0, rect.width);
      const y = clamp(ev.clientY - rect.top, 0, rect.height);
      activeHsv.s = rect.width ? x / rect.width : 0;
      activeHsv.v = rect.height ? 1 - y / rect.height : 0;
      commitHsv();
    });

    dragOn(hue, (ev, rect) => {
      const x = clamp(ev.clientX - rect.left, 0, rect.width);
      activeHsv.h = rect.width ? (x / rect.width) * 360 : 0;
      if (activeHsv.h >= 360) activeHsv.h = 359.999;
      commitHsv();
    });
  }
```

- [ ] **Step 2: Verify drag updates colour + live preview**

Parse: `node --check assets/js/color-picker.js` → PARSE_OK.
Serve + fresh context, `minimap-editor.html`:
- Open the Water swatch. Drag inside the SV square → the swatch, the hex field, and the **globe water in the preview** all update live as you drag.
- Drag the hue bar → the square's base hue changes and the colour follows.
- Scripted assertion (evaluate in the page):
  ```js
  () => {
    const sw = document.querySelector('.color-input__swatch');
    sw.click();
    const sv = document.querySelector('[data-cp-sv]');
    const r = sv.getBoundingClientRect();
    sv.dispatchEvent(new PointerEvent('pointerdown', {clientX: r.left+5, clientY: r.top+5, bubbles:true}));
    document.dispatchEvent(new PointerEvent('pointerup', {bubbles:true}));
    return document.querySelector('[data-cp-hex]').value; // near-white (high V, low S corner)
  }
  ```
  Expected: a hex near `#F...` (top-left of the square = high value, low saturation).

- [ ] **Step 3: Commit**

```bash
git add assets/js/color-picker.js
git commit -m "feat(color-picker): drag the SV square + hue slider"
```

---

## Task 7: Cross-editor verification + open PR

**Files:** none (verification + PR)

- [ ] **Step 1: Verify all three editors over HTTP (fresh context / hard reload)**

- `minimap-editor.html` — every colour field (Globe water/land/bg; select the Region level for land/stroke/bg) opens the branded popover; drag + hex both drive the preview; native chrome never shows.
- `preset-editor.html` — pick a marker/region preset; its colour fields (fill/line/connector) open the popover and update the swatch + preview.
- `base-map-editor.html` — the colour row swatch opens the popover; choosing a colour updates the swatch + the hex text field (this editor has no native input — confirm no error and the text field updates).

- [ ] **Step 2: Confirm no native pickers remain and no console errors**

In each page (DevTools console), run:
```js
[...document.querySelectorAll('.color-input__swatch input[type=color]')].every(i => getComputedStyle(i).display === 'none')
```
Expected: `true` on minimap + preset (base-map has none). Check the console shows no errors on any page.

- [ ] **Step 3: Push and open the PR**

```bash
cd ~/Documents/designer-flow-everviz
git push -u origin feat/color-picker
gh pr create --base feat/minimap-editor-redesign --head feat/color-picker \
  --title "Custom branded colour picker (replaces native input)" \
  --body "Implements docs/superpowers/specs/2026-07-02-color-picker-component-design.md. Shared, auto-enhancing HSV colour picker that skins over every .color-input (minimap, preset, base-map editors), hiding the native picker and writing hex back through the same input/change events. Hex-only (no opacity). Stacked on feat/minimap-editor-redesign.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
(Base is `feat/minimap-editor-redesign` because this branch is stacked on it. Retarget to `main` after #150 merges.)

---

## Self-review (author check against the spec)

- **Spec coverage:** Approach/skin → Task 3. Component & enhanceAll → Task 3. Popover shell → Task 4. SV/hue/hex render → Task 5. Drag → Task 6. HSV maths → Task 1. CSS/tokens → Task 2. Heterogeneous markup (base-map has no native input) → `resolveParts`/`currentHex`/`setValue` in Task 3. Write-back events on both inputs → Task 3 `setValue`. Feedback guard (`applying`) → Task 3. Title = label → Task 3 `labelFor`. Includes on 3 pages + `enhanceAll()` in minimap → Task 3. Verification across sites → Task 7. Deferred: opacity, hover hex-chip, arrow-key nudging (spec-agreed).
- **Placeholder scan:** No TBD/TODO in shipped code. Task 3–5 intentionally land stubs that are *replaced in the very next task* (openPopover, renderPop, wirePopInputs, wirePopDrag) and each stub keeps the file parseable + the current task verifiable — this is staged construction, not an unfilled placeholder.
- **Type consistency:** `parts = {root, swatch, hex, native}` shape is identical across `resolveParts`/`currentHex`/`setValue`/`enhance`/`openPopover`. `activeHsv = {h,s,v}` consistent across render/commit/drag. Maths names (`hexToHsv`, `hsvToHex`, `normHex`, `clamp`) defined in Task 1 and used unchanged. `data-cp-*` hooks (`data-cp-sv`, `-sv-handle`, `-hue`, `-hue-handle`, `-hex`, `-title`) match between the Task-4 innerHTML and the Task-5/6 selectors.
