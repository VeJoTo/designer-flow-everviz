# Minimap Editor Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Maputnik-style layer editor at `pages/minimap-editor.html` with a curated preset editor sectioned by zoom level (Globe → Country → Region), and update the template panel + library card to match.

**Architecture:** A pure data module (`minimap-model.js`) defines two field schemas (Physical / Political) and a default 3-level preset. A DOM controller (`minimap-editor.js`) renders a 3-pane editor — level rail, per-level settings, live SVG preview — and persists presets to the `SavedMaps` `minimap` bucket using the snapshot `serialize()`/`hydrate()` pattern the preset editor already uses. The template's Customize → Minimap panel sheds inline border styling and instead picks a preset + level. The library card shows the default level + a level-count badge.

**Tech Stack:** Static hi-fi prototype — HTML, CSS (per-page files under `assets/css/pages/`), vanilla JS (IIFE modules on `window`), `localStorage` via `assets/js/saved-maps.js`. No build step, no test runner: **verification is done in the browser served over HTTP.**

---

## Verification conventions (read once)

There is no unit-test runner. Every task's verification runs the prototype over HTTP and checks behavior in the browser:

```bash
cd ~/Documents/designer-flow-everviz
python3 -m http.server 8777   # leave running in a separate shell
```

Then open the relevant page at `http://localhost:8777/...` and **hard-reload (⌘⇧R)** after each edit (the browser caches HTML/JS hard). Never verify over `file://` — some assets won't render.

Work on branch `feat/minimap-editor-redesign` (already created). Commit after every task.

---

## File structure

**Create:**
- `assets/js/minimap-model.js` — schemas, default preset factory, (de)serialize helpers. Pure, no DOM.
- `assets/js/minimap-editor.js` — editor DOM controller.
- `assets/css/pages/minimap-editor.css` — 3-pane editor + preview styles.

**Modify:**
- `pages/minimap-editor.html` — replace layer-editor body with the 3-pane shell; swap CSS/JS includes.
- `pages/template-creator.html` — Minimap panel: preset picker + level + allow-zoom + placement.
- `assets/js/template-wizard.js` — wire the new Minimap panel controls.
- `pages/mini-map-library.html` — card markup gains a level-count badge slot.
- `assets/js/library-saved.js` — populate default-level thumb + level count from SavedMaps.

**Confirm-before-use (do not modify):**
- `assets/js/saved-maps.js` — provides `SavedMaps.list/save/replaceAll/has/id`. Task 1 verifies `id()` exists.
- `assets/js/picker-modal.js` — `window.pickerModal({title, items})` → resolves `{name}`.
- `assets/js/confirm-dialog.js` — used for the Remove-level confirm.

---

## Task 1: Verify SavedMaps API surface

**Files:**
- Inspect: `assets/js/saved-maps.js`

- [ ] **Step 1: Confirm the methods the plan depends on exist**

Run:
```bash
cd ~/Documents/designer-flow-everviz
grep -nE '\b(list|save|replaceAll|has|id)\b' assets/js/saved-maps.js
```
Expected: matches for `list(kind)`, `save(...)`, `replaceAll(kind, list)`, `has(kind)`, and `id()`. The `minimap` key already exists in `KEYS`.

- [ ] **Step 2: If `id()` is missing, add it**

Only if Step 1 shows no `id()` method. Inside the `global.SavedMaps = { ... }` object in `assets/js/saved-maps.js`, add:

```js
    /** Generate a fresh unique id (exposed for callers that build entries). */
    id() {
      return newId();
    },
```

- [ ] **Step 3: Commit (only if changed)**

```bash
git add assets/js/saved-maps.js
git commit -m "chore: expose SavedMaps.id() for minimap presets"
```
If nothing changed, skip the commit.

---

## Task 2: Create the minimap data model module

**Files:**
- Create: `assets/js/minimap-model.js`

- [ ] **Step 1: Write the module**

Create `assets/js/minimap-model.js` with the complete contents:

```js
// Pure data model for minimap presets. No DOM. Exposed as window.MinimapModel.
// A preset = { id, name, created, thumb, defaultLevelId, levels: [Level] }.
// A Level = { id, type, name, schema, settings, customStyle }.
(function (global) {
  // Two field schemas. "physical" = globe (water/land/bg);
  // "political" = country/continent/region/city (land/stroke/opacity/bg).
  const SCHEMAS = {
    physical: {
      fields: [
        { key: "water", label: "Water", kind: "color", default: "#cfe8f5" },
        { key: "land", label: "Land", kind: "color", default: "#e9e6df" },
        { key: "background", label: "Background", kind: "color", default: "#ffffff" },
      ],
    },
    political: {
      fields: [
        { key: "land", label: "Land", kind: "color", default: "#e9e6df" },
        { key: "strokeColor", label: "Stroke", kind: "color", default: "#8a8a8a" },
        { key: "strokeWidth", label: "Stroke width", kind: "number", default: 1, min: 0, max: 8 },
        { key: "opacity", label: "Opacity", kind: "number", default: 100, min: 0, max: 100 },
        { key: "background", label: "Background", kind: "color", default: "#ffffff" },
      ],
    },
  };

  // Which schema a level type renders with.
  const TYPE_SCHEMA = {
    globe: "physical",
    continent: "political",
    country: "political",
    region: "political",
    city: "political",
  };

  // Order used to slot a newly-added level into the ladder (far -> near).
  const TYPE_ORDER = ["globe", "continent", "country", "region", "city"];

  const TYPE_LABEL = {
    globe: "Globe",
    continent: "Continent",
    country: "Country",
    region: "Region",
    city: "City",
  };

  function uid() {
    return global.SavedMaps
      ? SavedMaps.id()
      : `l_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  // Build default settings for a schema from its field defaults.
  function defaultSettings(schema) {
    const out = {};
    SCHEMAS[schema].fields.forEach((f) => (out[f.key] = f.default));
    return out;
  }

  function makeLevel(type) {
    const schema = TYPE_SCHEMA[type] || "political";
    return {
      id: uid(),
      type,
      name: TYPE_LABEL[type] || "Level",
      schema,
      settings: defaultSettings(schema),
      customStyle: null, // or { filename }
    };
  }

  // A brand-new preset: Globe + Country + Region, default = Globe.
  function makeDefaultPreset() {
    const levels = ["globe", "country", "region"].map(makeLevel);
    return {
      id: uid(),
      name: "Untitled",
      created: null, // stamped by SavedMaps on save
      thumb: "",
      defaultLevelId: levels[0].id,
      levels,
    };
  }

  // Sort levels far -> near by TYPE_ORDER (stable for equal types).
  function sortLevels(levels) {
    return levels
      .map((lvl, i) => [lvl, i])
      .sort((a, b) => {
        const d = TYPE_ORDER.indexOf(a[0].type) - TYPE_ORDER.indexOf(b[0].type);
        return d !== 0 ? d : a[1] - b[1];
      })
      .map((pair) => pair[0]);
  }

  global.MinimapModel = {
    SCHEMAS,
    TYPE_SCHEMA,
    TYPE_ORDER,
    TYPE_LABEL,
    makeLevel,
    makeDefaultPreset,
    defaultSettings,
    sortLevels,
    uid,
  };
})(typeof window !== "undefined" ? window : this);
```

- [ ] **Step 2: Sanity-check it parses (no syntax errors)**

Run:
```bash
node --check assets/js/minimap-model.js
```
Expected: no output (exit 0). If `node` is unavailable, open any page that will include it later and confirm no console SyntaxError.

- [ ] **Step 3: Commit**

```bash
git add assets/js/minimap-model.js
git commit -m "feat(minimap): add pure data model (schemas + default preset)"
```

---

## Task 3: Add the editor stylesheet

**Files:**
- Create: `assets/css/pages/minimap-editor.css`

- [ ] **Step 1: Write the stylesheet**

Create `assets/css/pages/minimap-editor.css` with the complete contents. Class names use the repo's BEM-ish convention and read tokens from `tokens.css`:

```css
/* Minimap editor: 3-pane shell (level rail | settings | preview). */
.mm-editor {
  display: grid;
  grid-template-columns: 240px minmax(320px, 1fr) minmax(320px, 520px);
  gap: 1px;
  background: var(--color-border, #e3e3ea);
  height: 100%;
  min-height: 0;
}
.mm-pane {
  background: #fff;
  min-height: 0;
  overflow: auto;
  padding: 20px;
}

/* --- Level rail (zoom ladder) --- */
.mm-rail__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.mm-rail__title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted, #6a6a75);
}
.mm-level-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.mm-level {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--color-border, #e3e3ea);
  border-radius: 10px;
  cursor: pointer;
  background: #fff;
}
.mm-level.is-selected {
  border-color: var(--color-primary, #4b4ae0);
  box-shadow: 0 0 0 1px var(--color-primary, #4b4ae0) inset;
}
.mm-level__thumb {
  width: 34px; height: 34px; border-radius: 6px; flex: none;
  border: 1px solid var(--color-border, #e3e3ea);
  background-size: cover; background-position: center;
}
.mm-level__body { flex: 1; min-width: 0; }
.mm-level__name { font-size: 14px; font-weight: 500; color: var(--color-text, #1c1c24); }
.mm-level__type { font-size: 12px; color: var(--color-text-muted, #6a6a75); }
.mm-level__default {
  font-size: 11px; font-weight: 600; color: var(--color-primary, #4b4ae0);
  background: color-mix(in srgb, var(--color-primary, #4b4ae0) 12%, #fff);
  border-radius: 999px; padding: 2px 8px; white-space: nowrap;
}
.mm-level__menu { flex: none; border: 0; background: none; cursor: pointer; padding: 4px; border-radius: 6px; }
.mm-level__menu:hover { background: var(--color-surface-2, #f2f2f6); }
.mm-add-level { margin-top: 12px; }

/* --- Settings pane --- */
.mm-settings__title { font-size: 16px; font-weight: 600; margin: 0 0 4px; }
.mm-settings__type { font-size: 13px; color: var(--color-text-muted, #6a6a75); margin: 0 0 16px; }
.mm-field { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--color-border, #e3e3ea); }
.mm-field__label { font-size: 14px; color: var(--color-text, #1c1c24); }
.mm-advanced { margin-top: 18px; }
.mm-advanced__note { font-size: 13px; color: var(--color-text-muted, #6a6a75); display: flex; align-items: center; gap: 10px; }

/* --- Preview pane --- */
.mm-preview__caption { font-size: 13px; color: var(--color-text-muted, #6a6a75); margin-bottom: 12px; }
.mm-preview__stage {
  display: grid; place-items: center;
  aspect-ratio: 1 / 1; width: 100%;
  border-radius: 12px;
  background: var(--mm-bg, #fff);
  border: 1px solid var(--color-border, #e3e3ea);
}
/* Globe: a water disc with an abstract land blob. */
.mm-preview__globe {
  width: 70%; aspect-ratio: 1; border-radius: 50%;
  background: var(--mm-water, #cfe8f5);
  display: grid; place-items: center; overflow: hidden;
}
/* Political: a region silhouette (inline SVG uses currentColor + stroke vars). */
.mm-preview__region { width: 70%; height: auto; color: var(--mm-land, #e9e6df); opacity: calc(var(--mm-opacity, 100) / 100); }
.mm-preview__region path { fill: currentColor; stroke: var(--mm-stroke, #8a8a8a); stroke-width: var(--mm-stroke-w, 1); }
.mm-preview__blob { width: 55%; color: var(--mm-land, #e9e6df); }
.mm-preview__blob path { fill: currentColor; }
```

- [ ] **Step 2: Swap the stylesheet link in the editor page**

In `pages/minimap-editor.html`, replace the editor CSS link. Change:
```html
  <link rel="stylesheet" href="assets/css/pages/editor.css" />
```
to:
```html
  <link rel="stylesheet" href="assets/css/pages/minimap-editor.css" />
```

- [ ] **Step 3: Commit**

```bash
git add assets/css/pages/minimap-editor.css pages/minimap-editor.html
git commit -m "feat(minimap): add 3-pane editor stylesheet"
```

---

## Task 4: Replace the editor body markup with the 3-pane shell

**Files:**
- Modify: `pages/minimap-editor.html` (the `<div class="editor-grid">…</div>` region, ~lines 48–250, and the inline `<script>` at ~273–591)

- [ ] **Step 1: Replace the editor grid markup**

In `pages/minimap-editor.html`, replace the entire `<div class="editor-grid"> … </div>` block (the layers pane + properties pane + map pane) with this shell. Keep the surrounding `editor-bar` header and the save modal untouched:

```html
      <div class="mm-editor" data-mm-editor>
        <!-- 1) Level rail -->
        <aside class="mm-pane mm-rail">
          <div class="mm-rail__head">
            <span class="mm-rail__title">Levels</span>
          </div>
          <ul class="mm-level-list" data-mm-levels></ul>
          <button type="button" class="btn btn--outline mm-add-level" data-mm-add-level aria-haspopup="menu">
            + Add level
          </button>
          <div class="filter-popover mm-add-menu" data-mm-add-menu hidden role="menu">
            <button type="button" class="sort-option" role="menuitem" data-add-type="globe">Globe</button>
            <button type="button" class="sort-option" role="menuitem" data-add-type="continent">Continent</button>
            <button type="button" class="sort-option" role="menuitem" data-add-type="country">Country</button>
            <button type="button" class="sort-option" role="menuitem" data-add-type="region">Region</button>
            <button type="button" class="sort-option" role="menuitem" data-add-type="city">City</button>
          </div>
        </aside>

        <!-- 2) Settings for the selected level -->
        <section class="mm-pane mm-settings">
          <h2 class="mm-settings__title" data-mm-level-name>Globe</h2>
          <p class="mm-settings__type" data-mm-level-type>Physical · water, land, background</p>
          <div data-mm-fields></div>
          <details class="mm-advanced">
            <summary>Advanced · Use custom style</summary>
            <div class="mm-advanced__body">
              <p class="mm-advanced__note" data-mm-custom-empty>
                Upload a Maputnik style (.json) to override this level's fields.
              </p>
              <p class="mm-advanced__note" data-mm-custom-set hidden>
                Custom style in use: <strong data-mm-custom-name></strong>
                <button type="button" class="btn btn--text" data-mm-custom-clear>Clear</button>
              </p>
              <label class="btn btn--outline">
                Choose file…
                <input type="file" accept="application/json,.json" data-mm-custom-file hidden />
              </label>
            </div>
          </details>
        </section>

        <!-- 3) Live preview of the selected level -->
        <aside class="mm-pane mm-preview">
          <p class="mm-preview__caption">Previewing: <span data-mm-preview-label>Globe</span></p>
          <div class="mm-preview__stage" data-mm-preview-stage></div>
        </aside>
      </div>
```

- [ ] **Step 2: Trim the inline editor script (preserve modal/title) and add includes**

The inline `<script>` at ~line 273 mixes **layer-editor code we are dropping** with **generic editor chrome we must keep**. Do NOT delete the whole block. Instead:

**Remove** these parts (they reference DOM that no longer exists):
- the `?name` → `MAP_LOOKUP` tile-swap block and its `.map-preview` writes;
- the layers list/search/select code (`idInput`, `layersList`, `layerFoot`, `layerSearch`, `updateLayerCount`, `filterLayers`, `selectLayer`, the `layersList` click listener);
- the layers-pane collapse toggle (`.editor-pane--layers` / `.editor-grid` / `[data-action="toggle-layers-pane"]`);
- the **`persistSave()` function and its `save-confirm` / `save-and-go` click handlers** — persistence moves entirely into `minimap-editor.js` (Task 7). Leaving the old `persistSave` in place would write a competing light `SavedMaps.save` entry into the same `minimap` bucket and clobber the controller's snapshot.

**Keep** these parts (still valid, still needed):
- the inline-editable **title** wiring (`[data-editor-title]` focus/keydown/blur + `[data-action="focus-title"]`);
- the **save modal** open/close (`openModal`/`closeModal`, `[data-action="open-save-modal"]`, `[data-save-modal-close]`, Escape-to-close);
- the **toast** helper (`showToast`) — Task 7 will call it on save;
- the **editor topbar overflow menu** wiring.

Expose the toast for the controller: after `showToast` is defined, add `window.__mmShowToast = showToast;`.

Then, in the bottom script includes, add the two new modules **before** `chrome.js`. The include list should read:

```html
  <script src="assets/js/saved-maps.js" defer></script>
  <script src="assets/js/minimap-model.js" defer></script>
  <script src="assets/js/tooltip.js" defer></script>
  <script src="assets/js/confirm-dialog.js" defer></script>
  <script src="assets/js/minimap-editor.js" defer></script>
  <script src="assets/js/chrome.js" defer></script>
  <script src="assets/js/prefetch.js" defer></script>
```

- [ ] **Step 3: Verify the shell renders (no controller yet)**

Serve over HTTP and open `http://localhost:8777/pages/minimap-editor.html`. Hard-reload.
Expected: three panes visible (empty level list, a settings pane with the Advanced disclosure, an empty preview stage). No console errors except possibly a benign one from the not-yet-written controller — the controller file is added in Task 5, so at this point `minimap-editor.js` 404s; that's expected until Task 5. Confirm layout/columns look right.

- [ ] **Step 4: Commit**

```bash
git add pages/minimap-editor.html
git commit -m "feat(minimap): replace layer editor with 3-pane shell markup"
```

---

## Task 5: Editor controller — render rail, select level, render settings, live preview

**Files:**
- Create: `assets/js/minimap-editor.js`

- [ ] **Step 1: Write the controller (render + selection + settings + preview)**

Create `assets/js/minimap-editor.js` with the complete contents:

```js
// Minimap editor controller. Renders a 3-pane editor from a preset in memory.
(function () {
  const M = window.MinimapModel;
  if (!M) return;

  // Representative SVG shapes for the preview (fills use currentColor / stroke vars).
  const REGION_SVG =
    '<svg class="mm-preview__region" viewBox="0 0 100 100" aria-hidden="true">' +
    '<path d="M18 30 L46 20 L74 28 L82 52 L64 78 L34 82 L14 60 Z"/></svg>';
  const BLOB_SVG =
    '<svg class="mm-preview__blob" viewBox="0 0 100 100" aria-hidden="true">' +
    '<path d="M20 40 Q35 18 55 30 Q80 24 78 50 Q84 74 58 74 Q30 82 22 60 Z"/></svg>';

  // --- State ---
  let preset = M.makeDefaultPreset();
  let selectedId = preset.levels[0].id;

  // --- DOM refs ---
  const $ = (sel) => document.querySelector(sel);
  const levelsEl = $("[data-mm-levels]");
  const nameEl = $("[data-mm-level-name]");
  const typeEl = $("[data-mm-level-type]");
  const fieldsEl = $("[data-mm-fields]");
  const previewLabelEl = $("[data-mm-preview-label]");
  const previewStageEl = $("[data-mm-preview-stage]");

  function selectedLevel() {
    return preset.levels.find((l) => l.id === selectedId) || preset.levels[0];
  }

  // --- Render: level rail ---
  function renderRail() {
    levelsEl.innerHTML = "";
    M.sortLevels(preset.levels).forEach((lvl) => {
      const li = document.createElement("li");
      li.className = "mm-level" + (lvl.id === selectedId ? " is-selected" : "");
      li.dataset.levelId = lvl.id;
      const isDefault = lvl.id === preset.defaultLevelId;
      li.innerHTML =
        '<span class="mm-level__thumb" style="' + thumbStyle(lvl) + '"></span>' +
        '<span class="mm-level__body">' +
        '<span class="mm-level__name"></span>' +
        '<span class="mm-level__type">' + (M.TYPE_LABEL[lvl.type] || "Level") + "</span>" +
        "</span>" +
        (isDefault ? '<span class="mm-level__default">Default</span>' : "") +
        '<button class="mm-level__menu" aria-label="More options" data-level-menu>' +
        '<img src="assets/icons/ellipsis-vertical.svg" alt="" width="18" height="18" /></button>';
      li.querySelector(".mm-level__name").textContent = lvl.name;
      levelsEl.appendChild(li);
    });
  }

  // A flat swatch for the rail thumbnail (land colour over background).
  function thumbStyle(lvl) {
    const s = lvl.settings;
    const bg = s.background || "#fff";
    const land = lvl.schema === "physical" ? s.water : s.land;
    return "background-color:" + bg + ";box-shadow:inset 0 0 0 8px " + (land || "#ddd") + ";";
  }

  // --- Render: settings pane for the selected level ---
  function renderSettings() {
    const lvl = selectedLevel();
    nameEl.textContent = lvl.name;
    const schemaLabel =
      lvl.schema === "physical" ? "Physical · water, land, background" : "Political · land, stroke, opacity, background";
    typeEl.textContent = schemaLabel;

    fieldsEl.innerHTML = "";
    const usingCustom = !!lvl.customStyle;
    M.SCHEMAS[lvl.schema].fields.forEach((f) => {
      const row = document.createElement("div");
      row.className = "mm-field";
      const label = document.createElement("span");
      label.className = "mm-field__label";
      label.textContent = f.label;
      row.appendChild(label);
      row.appendChild(buildControl(lvl, f, usingCustom));
      fieldsEl.appendChild(row);
    });
    renderCustomState(lvl);
  }

  function buildControl(lvl, f, disabled) {
    if (f.kind === "color") {
      const wrap = document.createElement("label");
      wrap.className = "color-input";
      const hex = document.createElement("input");
      hex.type = "text";
      hex.className = "color-input__hex";
      hex.maxLength = 7;
      hex.value = lvl.settings[f.key];
      hex.disabled = disabled;
      const swatch = document.createElement("span");
      swatch.className = "color-input__swatch";
      swatch.style.background = lvl.settings[f.key];
      const picker = document.createElement("input");
      picker.type = "color";
      picker.value = lvl.settings[f.key];
      picker.disabled = disabled;
      picker.setAttribute("aria-label", f.label);
      const apply = (v) => {
        if (!/^#[0-9a-fA-F]{6}$/.test(v)) return;
        lvl.settings[f.key] = v;
        hex.value = v;
        swatch.style.background = v;
        picker.value = v;
        renderPreview();
        renderRail();
      };
      picker.addEventListener("input", (e) => apply(e.target.value));
      hex.addEventListener("change", (e) => apply(e.target.value.trim()));
      swatch.appendChild(picker);
      wrap.appendChild(hex);
      wrap.appendChild(swatch);
      return wrap;
    }
    // number
    const input = document.createElement("input");
    input.type = "number";
    input.className = "prop-input prop-input--number";
    input.value = lvl.settings[f.key];
    if (f.min != null) input.min = f.min;
    if (f.max != null) input.max = f.max;
    input.disabled = disabled;
    input.addEventListener("change", () => {
      let v = Number(input.value);
      if (f.min != null) v = Math.max(f.min, v);
      if (f.max != null) v = Math.min(f.max, v);
      input.value = v;
      lvl.settings[f.key] = v;
      renderPreview();
    });
    return input;
  }

  // --- Render: preview ---
  function renderPreview() {
    const lvl = selectedLevel();
    previewLabelEl.textContent = lvl.name;
    const s = lvl.settings;
    const stage = previewStageEl;
    stage.style.setProperty("--mm-bg", s.background || "#fff");
    if (lvl.schema === "physical") {
      stage.style.setProperty("--mm-water", s.water || "#cfe8f5");
      stage.style.setProperty("--mm-land", s.land || "#e9e6df");
      stage.innerHTML = '<div class="mm-preview__globe">' + BLOB_SVG + "</div>";
    } else {
      stage.style.setProperty("--mm-land", s.land || "#e9e6df");
      stage.style.setProperty("--mm-stroke", s.strokeColor || "#8a8a8a");
      stage.style.setProperty("--mm-stroke-w", String(s.strokeWidth ?? 1));
      stage.style.setProperty("--mm-opacity", String(s.opacity ?? 100));
      stage.innerHTML = REGION_SVG;
    }
  }

  // --- Advanced / custom style state ---
  function renderCustomState(lvl) {
    const empty = $("[data-mm-custom-empty]");
    const set = $("[data-mm-custom-set]");
    const nameOut = $("[data-mm-custom-name]");
    if (lvl.customStyle) {
      empty.hidden = true;
      set.hidden = false;
      nameOut.textContent = lvl.customStyle.filename;
    } else {
      empty.hidden = false;
      set.hidden = true;
    }
  }

  function renderAll() {
    renderRail();
    renderSettings();
    renderPreview();
  }

  // --- Events: select a level (delegated on the rail) ---
  levelsEl.addEventListener("click", (e) => {
    if (e.target.closest("[data-level-menu]")) return; // handled in Task 6
    const row = e.target.closest(".mm-level");
    if (!row) return;
    selectedId = row.dataset.levelId;
    renderAll();
  });

  // Expose for later tasks (persistence, rail menu, add-level, custom file).
  window.__mmEditor = {
    getPreset: () => preset,
    setPreset: (p) => {
      preset = p;
      selectedId = (p.levels[0] || {}).id;
      renderAll();
    },
    getSelectedId: () => selectedId,
    setSelectedId: (id) => {
      selectedId = id;
    },
    renderAll,
    renderSettings,
    renderCustomState,
    selectedLevel,
  };

  renderAll();
})();
```

- [ ] **Step 2: Verify in browser**

Serve over HTTP, open `http://localhost:8777/pages/minimap-editor.html`, hard-reload.
Expected:
- Level rail shows **Globe / Country / Region**, Globe marked **Default** and selected.
- Clicking **Country** or **Region** swaps the settings pane to the Political fields (Land / Stroke / Stroke width / Opacity / Background) and the preview to the region silhouette.
- Editing a colour hex or picker updates the preview and the rail thumbnail live.
- No console errors.

- [ ] **Step 3: Commit**

```bash
git add assets/js/minimap-editor.js
git commit -m "feat(minimap): editor controller — rail, settings, live preview"
```

---

## Task 6: Level management — add, rename, duplicate, remove, set default, custom-style stub

**Files:**
- Modify: `assets/js/minimap-editor.js`

- [ ] **Step 1: Add the add-level menu wiring**

Append inside the IIFE in `assets/js/minimap-editor.js`, before the final `renderAll();` call:

```js
  // --- Add level ---
  const addBtn = document.querySelector("[data-mm-add-level]");
  const addMenu = document.querySelector("[data-mm-add-menu]");
  addBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    addMenu.hidden = !addMenu.hidden;
  });
  document.addEventListener("click", (e) => {
    if (addMenu.hidden) return;
    if (addBtn.contains(e.target) || addMenu.contains(e.target)) return;
    addMenu.hidden = true;
  });
  addMenu.addEventListener("click", (e) => {
    const opt = e.target.closest("[data-add-type]");
    if (!opt) return;
    const lvl = M.makeLevel(opt.dataset.addType);
    preset.levels.push(lvl);
    selectedId = lvl.id;
    addMenu.hidden = true;
    renderAll();
  });
```

- [ ] **Step 2: Add the per-level overflow menu (rename / duplicate / remove / set default)**

Append inside the IIFE, after the add-level wiring:

```js
  // --- Per-level overflow menu ---
  // Simple prompt-based rename keeps the prototype lean; duplicate/remove/default
  // mutate state and re-render. Remove is guarded by the shared confirm dialog.
  levelsEl.addEventListener("click", async (e) => {
    const menuBtn = e.target.closest("[data-level-menu]");
    if (!menuBtn) return;
    e.stopPropagation();
    const row = menuBtn.closest(".mm-level");
    const id = row.dataset.levelId;
    const lvl = preset.levels.find((l) => l.id === id);
    const action = await levelMenu(menuBtn);
    if (!action || !lvl) return;

    if (action === "rename") {
      const next = window.prompt("Rename level", lvl.name);
      if (next && next.trim()) {
        lvl.name = next.trim();
        renderAll();
      }
    } else if (action === "duplicate") {
      const copy = JSON.parse(JSON.stringify(lvl));
      copy.id = M.uid();
      copy.name = lvl.name + " copy";
      preset.levels.push(copy);
      selectedId = copy.id;
      renderAll();
    } else if (action === "default") {
      preset.defaultLevelId = id;
      renderAll();
    } else if (action === "remove") {
      if (preset.levels.length <= 1) {
        window.alert("A preset needs at least one level.");
        return;
      }
      const ok = window.confirmDialog
        ? await window.confirmDialog({
            title: "Remove level",
            body: 'Remove "' + lvl.name + '" from this minimap?',
            confirmLabel: "Remove",
          })
        : window.confirm("Remove this level?");
      if (!ok) return;
      preset.levels = preset.levels.filter((l) => l.id !== id);
      if (preset.defaultLevelId === id) preset.defaultLevelId = preset.levels[0].id;
      if (selectedId === id) selectedId = preset.levels[0].id;
      renderAll();
    }
  });

  // Lightweight popover menu anchored to the ⋯ button. Resolves an action string.
  function levelMenu(anchor) {
    return new Promise((resolve) => {
      const menu = document.createElement("div");
      menu.className = "filter-popover";
      menu.setAttribute("role", "menu");
      menu.innerHTML =
        '<button type="button" class="sort-option" role="menuitem" data-a="rename">Rename</button>' +
        '<button type="button" class="sort-option" role="menuitem" data-a="duplicate">Duplicate</button>' +
        '<button type="button" class="sort-option" role="menuitem" data-a="default">Set as default</button>' +
        '<button type="button" class="sort-option" role="menuitem" data-a="remove">Remove</button>';
      const r = anchor.getBoundingClientRect();
      menu.style.position = "fixed";
      menu.style.top = Math.round(r.bottom + 4) + "px";
      menu.style.left = Math.round(r.right - 160) + "px";
      menu.style.minWidth = "160px";
      document.body.appendChild(menu);
      function cleanup(val) {
        menu.remove();
        document.removeEventListener("click", onDoc, true);
        resolve(val);
      }
      function onDoc(ev) {
        const opt = ev.target.closest("[data-a]");
        if (opt && menu.contains(opt)) {
          ev.preventDefault();
          cleanup(opt.dataset.a);
          return;
        }
        if (!menu.contains(ev.target)) cleanup(null);
      }
      setTimeout(() => document.addEventListener("click", onDoc, true), 0);
    });
  }
```

- [ ] **Step 3: Add the custom-style (Maputnik) file stub**

Append inside the IIFE, after the overflow-menu wiring:

```js
  // --- Advanced: custom style file (records filename only; no parsing) ---
  const fileInput = document.querySelector("[data-mm-custom-file]");
  const clearBtn = document.querySelector("[data-mm-custom-clear]");
  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    selectedLevel().customStyle = { filename: file.name };
    fileInput.value = "";
    renderSettings(); // re-render fields disabled + custom note
  });
  clearBtn.addEventListener("click", () => {
    selectedLevel().customStyle = null;
    renderSettings();
  });
```

- [ ] **Step 4: Verify in browser**

Serve, open the editor, hard-reload. Verify each:
- **+ Add level → Region** adds a second Region below; it slots after the existing Region (near end) and becomes selected.
- **⋯ → Set as default** on Country moves the **Default** pill to Country.
- **⋯ → Duplicate** on Globe creates "Globe copy".
- **⋯ → Rename** changes the name in the rail + settings title.
- **⋯ → Remove** shows a confirm, then removes; removing the last remaining level is blocked with an alert.
- **Advanced → Choose file…** picking any `.json` shows "Custom style in use: <name>", disables the field inputs, and **Clear** restores them.
- No console errors.

- [ ] **Step 5: Commit**

```bash
git add assets/js/minimap-editor.js
git commit -m "feat(minimap): level add/rename/duplicate/remove/default + custom-style stub"
```

---

## Task 7: Persist presets — Save + hydrate on edit

**Files:**
- Modify: `assets/js/minimap-editor.js`
- Reference: the existing Save button `[data-action="open-save-modal"]` and save modal in `pages/minimap-editor.html`; the editor title `[data-editor-title]`.

- [ ] **Step 1: Add serialize/hydrate and hook Save**

Append inside the IIFE in `assets/js/minimap-editor.js`, before the final `renderAll();`:

```js
  // --- Persistence: snapshot the whole minimap library in the "minimap" bucket ---
  // Each saved entry carries card fields (id/name/created/thumb) plus the rich
  // level data (defaultLevelId/levels). Mirrors the preset editor's approach.
  // The controller owns persistence outright: the page's old inline persistSave()
  // and its save-button handlers were removed in Task 4.
  //
  // Name source: the save modal's #save-template-name input is the source of
  // truth on save (openModal prefills it from the editor title). Fall back to
  // the title, then "Untitled".
  function currentName() {
    const input = document.getElementById("save-template-name");
    if (input && input.value.trim()) return input.value.trim();
    const t = document.querySelector("[data-editor-title]");
    return (t && t.textContent.trim()) || "Untitled";
  }

  // A tiny inline-SVG data URI thumbnail of the default level (land over bg).
  function makeThumb() {
    const def = preset.levels.find((l) => l.id === preset.defaultLevelId) || preset.levels[0];
    const s = def.settings;
    const bg = s.background || "#fff";
    const land = def.schema === "physical" ? s.water : s.land;
    const svg =
      "<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'>" +
      "<rect width='80' height='80' fill='" + bg + "'/>" +
      "<circle cx='40' cy='40' r='26' fill='" + (land || "#ddd") + "'/></svg>";
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  function serialize() {
    if (!window.SavedMaps) return;
    preset.name = currentName();
    preset.thumb = makeThumb();
    const list = SavedMaps.list("minimap").filter((e) => e.id !== preset.id);
    if (!preset.created) preset.created = null; // SavedMaps snapshot keeps our field; stamp below
    // Stamp created on first save.
    if (!preset.createdStamped) {
      preset.created = new Date().toISOString().slice(0, 10);
      preset.createdStamped = true;
    }
    list.push(JSON.parse(JSON.stringify(preset)));
    SavedMaps.replaceAll("minimap", list);
  }

  function hydrate() {
    if (!window.SavedMaps) return;
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    if (!id) return;
    const found = SavedMaps.list("minimap").find((e) => e.id === id);
    if (!found || !found.levels) return;
    preset = JSON.parse(JSON.stringify(found));
    preset.createdStamped = true;
    selectedId = (preset.levels[0] || {}).id;
    const titleEl = document.querySelector("[data-editor-title]");
    if (titleEl && preset.name) titleEl.textContent = preset.name;
    renderAll();
  }

  // The save modal has two commit buttons: [data-action="save-confirm"] (Save,
  // stays on page) and [data-action="save-and-go"] (Save & go to library, an
  // <a> that then navigates). Persist on both; also reflect the saved name back
  // onto the editor title and fire the shared toast on save-confirm.
  document.addEventListener("click", (e) => {
    if (e.target.closest('[data-action="save-confirm"], [data-action="save-and-go"]')) {
      serialize();
      const titleEl = document.querySelector("[data-editor-title]");
      if (titleEl) titleEl.textContent = preset.name;
      if (e.target.closest('[data-action="save-confirm"]') && window.__mmShowToast) {
        window.__mmShowToast();
      }
    }
  });

  hydrate();
```

- [ ] **Step 2: Confirm the save modal's commit-button hooks**

Verify the two commit buttons the Step 1 listener targets still exist:
```bash
grep -n 'data-action="save-confirm"\|data-action="save-and-go"' pages/minimap-editor.html
```
Expected: both present (inside `[data-save-modal]`). `open-save-modal` is the button that *opens* the modal — do not hook that one. Also confirm Task 4 removed the old inline `persistSave` handlers so they don't double-write:
```bash
grep -n 'persistSave' pages/minimap-editor.html
```
Expected: no matches.

- [ ] **Step 3: Verify in browser**

Serve, open `http://localhost:8777/pages/minimap-editor.html`, hard-reload.
- Rename the title to "Nordics locator", edit a couple of colours, add a Region level, set Country as default, click **Save** and confirm.
- In DevTools console: `JSON.parse(localStorage.getItem("everviz-saved-minimaps"))` — expect an array with one entry containing `name: "Nordics locator"`, `defaultLevelId`, and a `levels` array of 4.
- Copy that entry's `id`, open `http://localhost:8777/pages/minimap-editor.html?id=<that-id>`, hard-reload.
- Expected: title, colours, levels, and default all restored.

- [ ] **Step 4: Commit**

```bash
git add assets/js/minimap-editor.js
git commit -m "feat(minimap): persist presets to SavedMaps + hydrate on edit"
```

---

## Task 8: Template Customize → Minimap panel — preset picker, level, allow-zoom, placement

**Files:**
- Modify: `pages/template-creator.html` (the Minimap panel, ~lines 162–229)

- [ ] **Step 1: Replace the Minimap panel body**

In `pages/template-creator.html`, replace the Minimap panel's inner rows (the block containing `data-minimap-enable`, `data-minimap-border-*`, `data-minimap-color*`, `data-minimap-border-width`, `data-minimap-size`, `data-minimap-icon-*`) with this. The new panel keeps the enable toggle, size, and icon; drops border colour/thickness; and adds preset / level / allow-zoom / placement:

```html
                  <div class="wiz-row">
                    <span class="wiz-row__label">Minimap</span>
                    <label class="wiz-switch">
                      <input type="checkbox" data-minimap-enable aria-label="Show minimap" />
                      <span class="wiz-switch__track" aria-hidden="true"><span class="wiz-switch__thumb"></span></span>
                    </label>
                  </div>
                  <div class="wiz-row" data-minimap-dependent>
                    <span class="wiz-row__label">Preset</span>
                    <button class="select" type="button" data-minimap-preset-trigger aria-haspopup="dialog">
                      <span class="select__value select__value--placeholder" data-minimap-preset-value>Choose a preset</span>
                      <img src="assets/icons/chevron-down.svg" alt="" width="16" height="16" />
                    </button>
                  </div>
                  <div class="wiz-row" data-minimap-dependent>
                    <span class="wiz-row__label">Level</span>
                    <div class="wiz-select">
                      <button class="select" type="button" data-minimap-level-trigger aria-haspopup="listbox" aria-expanded="false">
                        <span class="select__value" data-minimap-level-value>Default</span>
                        <img src="assets/icons/chevron-down.svg" alt="" width="16" height="16" />
                      </button>
                      <div class="filter-popover wiz-select-menu" data-minimap-level-menu hidden role="listbox"></div>
                    </div>
                  </div>
                  <div class="wiz-row" data-minimap-dependent>
                    <span class="wiz-row__label">Allow zoom</span>
                    <label class="wiz-switch">
                      <input type="checkbox" data-minimap-allow-zoom aria-label="Allow zoom" />
                      <span class="wiz-switch__track" aria-hidden="true"><span class="wiz-switch__thumb"></span></span>
                    </label>
                  </div>
                  <div class="wiz-row" data-minimap-dependent>
                    <span class="wiz-row__label">Minimap size</span>
                    <div class="prop-stepper">
                      <input type="number" class="prop-stepper__input" value="0" min="0" max="100" data-minimap-size />
                      <span class="prop-stepper__spinners">
                        <button type="button" aria-label="Increment" data-stepper="up">▲</button>
                        <button type="button" aria-label="Decrement" data-stepper="down">▼</button>
                      </span>
                    </div>
                  </div>
                  <div class="wiz-row" data-minimap-dependent>
                    <span class="wiz-row__label">Placement</span>
                    <div class="wiz-select">
                      <button class="select" type="button" data-minimap-placement-trigger aria-haspopup="listbox" aria-expanded="false">
                        <span class="select__value" data-minimap-placement-value>Top left</span>
                        <img src="assets/icons/chevron-down.svg" alt="" width="16" height="16" />
                      </button>
                      <div class="filter-popover wiz-select-menu" data-minimap-placement-menu hidden role="listbox">
                        <button type="button" class="sort-option is-selected" role="option" data-placement="tl">Top left</button>
                        <button type="button" class="sort-option" role="option" data-placement="tr">Top right</button>
                        <button type="button" class="sort-option" role="option" data-placement="bl">Bottom left</button>
                        <button type="button" class="sort-option" role="option" data-placement="br">Bottom right</button>
                      </div>
                    </div>
                  </div>
                  <div class="wiz-row" data-minimap-dependent>
                    <span class="wiz-row__label">Icon</span>
                    <div class="wiz-select">
                      <button class="select" type="button" data-minimap-icon-trigger aria-haspopup="listbox" aria-expanded="false">
                        <span class="select__value" data-minimap-icon-value>None</span>
                        <img src="assets/icons/chevron-down.svg" alt="" width="16" height="16" />
                      </button>
                      <div class="filter-popover wiz-select-menu" data-minimap-icon-menu hidden role="listbox">
                        <button type="button" class="sort-option is-selected" role="option" data-icon-type="none">None</button>
                        <button type="button" class="sort-option" role="option" data-icon-type="pin">Pin</button>
                        <button type="button" class="sort-option" role="option" data-icon-type="dot">Dot</button>
                        <button type="button" class="sort-option" role="option" data-icon-type="star">Star</button>
                      </div>
                    </div>
                  </div>
```

- [ ] **Step 2: Verify markup renders**

Serve, open `http://localhost:8777/pages/template-creator.html#customize`, enable the Minimap toggle. Expect rows: Preset, Level, Allow zoom, Minimap size, Placement, Icon. Border colour/thickness rows are gone. (Wiring comes next; dropdowns may not open yet for the new ones — that's fine.)

- [ ] **Step 3: Commit**

```bash
git add pages/template-creator.html
git commit -m "feat(minimap): template panel — preset/level/allow-zoom/placement"
```

---

## Task 9: Wire the template Minimap panel

**Files:**
- Modify: `assets/js/template-wizard.js` (the minimap section, ~lines 100–258; specifically remove the border-type/border-color/border-width wiring and add preset/level/placement wiring)

- [ ] **Step 1: Remove obsolete border wiring**

In `assets/js/template-wizard.js`, delete the blocks that reference `data-minimap-border-trigger`/`data-minimap-border-menu`/`data-minimap-border-value` (the `setupWizSelect(...)` call for border type and `setBorderControlsEnabled`), and the `data-minimap-color*` and `data-minimap-border-width` (`bWidth`) handlers. Keep: `overlay`, `minimapEnable`, `minimapRows`, the `size` stepper, the icon `setupWizSelect`, and `setMinimapIcon`.

- [ ] **Step 2: Add preset picker + level + placement wiring**

In `assets/js/template-wizard.js`, immediately after the icon `setupWizSelect(...)` block, add:

```js
    // --- Minimap preset picker (lists saved minimap presets) ---
    const presetTrigger = document.querySelector("[data-minimap-preset-trigger]");
    const presetValue = document.querySelector("[data-minimap-preset-value]");
    const levelValue = document.querySelector("[data-minimap-level-value]");
    const levelMenu = document.querySelector("[data-minimap-level-menu]");
    let chosenPreset = null;

    function fillLevelMenu(pr) {
      levelMenu.innerHTML = "";
      if (!pr || !pr.levels) return;
      pr.levels.forEach((lvl) => {
        const isDefault = lvl.id === pr.defaultLevelId;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sort-option" + (isDefault ? " is-selected" : "");
        btn.setAttribute("role", "option");
        btn.dataset.levelId = lvl.id;
        btn.textContent = lvl.name;
        levelMenu.appendChild(btn);
      });
      const def = pr.levels.find((l) => l.id === pr.defaultLevelId) || pr.levels[0];
      if (def) levelValue.textContent = def.name;
    }

    presetTrigger?.addEventListener("click", async () => {
      if (!window.pickerModal || !window.SavedMaps) return;
      const items = SavedMaps.list("minimap").map((e) => ({ name: e.name, id: e.id }));
      const choice = await window.pickerModal({ title: "Choose a minimap preset", items });
      if (!choice) return;
      chosenPreset = SavedMaps.list("minimap").find((e) => e.name === choice.name) || null;
      presetValue.textContent = choice.name;
      presetValue.classList.remove("select__value--placeholder");
      fillLevelMenu(chosenPreset);
    });

    // Level dropdown (options are (re)built when a preset is chosen).
    setupWizSelect(
      document.querySelector("[data-minimap-level-trigger]"),
      levelMenu,
      levelValue,
      "data-level-id",
      () => {}
    );

    // Placement → move the preview overlay into a corner.
    setupWizSelect(
      document.querySelector("[data-minimap-placement-trigger]"),
      document.querySelector("[data-minimap-placement-menu]"),
      document.querySelector("[data-minimap-placement-value]"),
      "data-placement",
      (pos) => overlay?.setAttribute("data-placement", pos)
    );

    // Allow zoom is stored on the checkbox state; no preview behavior in the prototype.
    document.querySelector("[data-minimap-allow-zoom]")?.addEventListener("change", () => {});
```

- [ ] **Step 3: Add placement CSS for the overlay**

The overlay currently sits top-left. Add corner positioning in `assets/css/pages/template-wizard.css` (append at end):

```css
.minimap-overlay[data-placement="tr"] { left: auto; right: 16px; top: 16px; }
.minimap-overlay[data-placement="bl"] { left: 16px; right: auto; top: auto; bottom: 16px; }
.minimap-overlay[data-placement="br"] { left: auto; right: 16px; top: auto; bottom: 16px; }
```
(The default `tl` uses the existing rule.) If the overlay's base rule sets `top`/`left` differently, match those values so only the corner changes.

- [ ] **Step 4: Verify in browser**

First ensure at least one saved minimap preset exists (create + save one via the editor, Task 7). Then serve, open `http://localhost:8777/pages/template-creator.html#customize`, enable Minimap.
- **Preset** → opens the picker modal listing your saved preset(s); choosing one sets the value and fills the **Level** dropdown with that preset's level names (default marked).
- **Level** dropdown opens and selects a level.
- **Placement** → choosing Top right / Bottom left / Bottom right moves the minimap overlay to that corner of the preview.
- **Icon** still works (None/Pin/Dot/Star).
- No console errors; no leftover references to removed border controls.

- [ ] **Step 5: Commit**

```bash
git add assets/js/template-wizard.js assets/css/pages/template-wizard.css
git commit -m "feat(minimap): wire template preset/level/placement; drop inline border"
```

---

## Task 10: Library card — default-level thumbnail + level-count badge

**Files:**
- Modify: `pages/mini-map-library.html` (card markup — add a badge slot)
- Modify: `assets/js/library-saved.js` (render saved minimap entries with thumb + count)

- [ ] **Step 1: Inspect how saved library cards are rendered**

Run:
```bash
grep -n 'minimap\|thumb\|levels\|createCard\|innerHTML\|data-name\|badge' assets/js/library-saved.js | head -40
```
Note the function that builds a card for a saved entry and where the thumbnail/name are set. The new code in Step 2 must follow that existing card-building pattern (same classes as the static cards in `pages/mini-map-library.html`).

- [ ] **Step 2: Add a level-count badge to saved minimap cards**

In `assets/js/library-saved.js`, in the branch that builds a **minimap** saved card, set the card thumbnail from `entry.thumb` (the data-URI created in Task 7) and inject a badge. Add, where the card element is assembled:

```js
      // entry is a saved minimap preset { name, thumb, levels, ... }
      if (entry.thumb) {
        const thumbEl = card.querySelector(".map-card__thumb, .card-thumb, [data-card-thumb]");
        if (thumbEl) thumbEl.style.backgroundImage = `url("${entry.thumb}")`;
      }
      const count = Array.isArray(entry.levels) ? entry.levels.length : 0;
      if (count) {
        const badge = document.createElement("span");
        badge.className = "map-card__badge";
        badge.textContent = count + (count === 1 ? " level" : " levels");
        (card.querySelector(".map-card__media, .card-thumb, [data-card-thumb]") || card).appendChild(badge);
      }
```
Adjust the selectors in the snippet to the actual card class names found in Step 1 (the static cards in `pages/mini-map-library.html` show the correct classes — match them).

- [ ] **Step 3: Add badge styling**

Append to `assets/css/pages/library.css`:

```css
.map-card__badge {
  position: absolute;
  left: 8px;
  bottom: 8px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: rgba(28, 28, 36, 0.72);
  border-radius: 999px;
  padding: 2px 8px;
}
```
Ensure the card media container is `position: relative` (most library cards already are — if not, add it to the media element rule).

- [ ] **Step 4: Verify in browser**

Save 1–2 presets via the editor (with differing level counts). Serve, open `http://localhost:8777/pages/mini-map-library.html`, hard-reload.
Expected: saved presets appear as cards with the default-level colour thumbnail and a "3 levels"/"4 levels" badge. Static seed cards are unaffected. Clicking Edit opens `minimap-editor.html?id=…` and restores the preset (from Task 7).

- [ ] **Step 5: Commit**

```bash
git add pages/mini-map-library.html assets/js/library-saved.js assets/css/pages/library.css
git commit -m "feat(minimap): library card default-level thumb + level-count badge"
```

---

## Task 11: Full-flow verification + open PR

**Files:** none (verification + PR)

- [ ] **Step 1: End-to-end walkthrough over HTTP**

Serve, then walk the whole loop, hard-reloading between pages:
1. `minimap-editor.html` — build a preset: rename it, style Globe + Country + Region, add a City level, set a default, save.
2. `mini-map-library.html` — see the card with thumb + "4 levels"; click Edit → confirm restore.
3. `template-creator.html#customize` — enable Minimap, choose the preset, pick a level, set placement to Bottom right, set an icon, toggle Allow zoom.
Expected: no console errors on any page; every step behaves as described.

- [ ] **Step 2: Confirm no dead references to the removed layer editor / border controls**

Run:
```bash
grep -rn 'minimap-border\|data-minimap-color\|editor-pane--layers' pages/minimap-editor.html pages/template-creator.html assets/js/template-wizard.js
```
Expected: no matches. If any remain, remove them and re-commit.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feat/minimap-editor-redesign
gh pr create --base main --head feat/minimap-editor-redesign \
  --title "Redesign minimap editor: zoom-level preset editor" \
  --body "Implements docs/superpowers/specs/2026-07-02-minimap-editor-redesign-design.md. Replaces the Maputnik layer editor with a curated, zoom-level preset editor (Globe/Country/Region), moves styling into presets, and updates the template panel (preset/level/allow-zoom/placement) and library card (thumb + level count).

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

---

## Self-review (author check against the spec)

- **Spec coverage:** Core model → Tasks 2,5,6,7. Levels/schemas → Task 2. Editor 3-pane → Tasks 3,4,5. Advanced/Maputnik stub → Tasks 4,6. Preview → Tasks 3,5. Template panel (preset/level/allow-zoom/size/placement/icon, border removed) → Tasks 8,9. Library card thumb + badge → Task 10. Persistence/data shape → Tasks 1,7. Every spec section maps to a task.
- **Placeholder scan:** No TBD/TODO; each code step shows full code. Two steps (Task 7 Step 2, Task 10 Steps 1–2) intentionally verify real class/attribute names against the codebase before finalizing selectors, with an explicit fallback — this is selector-matching, not a placeholder.
- **Type consistency:** `preset` shape (`id/name/created/thumb/defaultLevelId/levels`) and `level` shape (`id/type/name/schema/settings/customStyle`) are identical across Tasks 2, 5, 6, 7, 9, 10. `MinimapModel` methods (`makeLevel`, `makeDefaultPreset`, `sortLevels`, `uid`, `SCHEMAS`, `TYPE_LABEL`) are defined in Task 2 and used consistently. `SavedMaps` bucket key is `"minimap"` throughout.
```
