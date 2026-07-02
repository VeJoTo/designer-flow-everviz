# Template Config Round-Trip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the whole template-wizard state (map, minimap, presets, controls, export) into the saved template and restore it on edit via `?id`.

**Architecture:** Two functions appended inside the wizard's `DOMContentLoaded` callback in `assets/js/template-wizard.js` — `serializeWizard()` reads each tab's controls into a `config` blob; `hydrateWizard(config)` writes them back and re-applies side-effects. Because the wizard's helpers live in nested block scopes, two small refactors expose what hydrate needs (`addPresetItem` hoisted to callback scope; an `exportApi` object). Save switches from the light `SavedMaps.save` to a snapshot `replaceAll("template", …)` carrying `config`; load hydrates by `?id`.

**Tech Stack:** Static prototype — HTML, vanilla JS IIFE, `localStorage` via `SavedMaps`. No build/test runner: **verification is in the browser served over HTTP.**

**Spec:** `docs/superpowers/specs/2026-07-02-template-config-round-trip-design.md`

---

## Verification conventions (read once)

```bash
cd ~/Documents/designer-flow-everviz
python3 -m http.server 8777   # leave running
```
**⚠️ Hard cache:** after editing `.js`/`.html`, hard-reload (⌘⇧R) or use a **fresh isolated browser context** — a plain re-navigate runs stale code. Never verify over `file://`. Branch: `feat/template-round-trip` (created, stacked on `feat/minimap-editor-redesign`). Commit after every task. `node --check` is the JS parse gate.

Key page: `http://localhost:8777/pages/template-creator.html` (tabs via `#map`, `#customize`, `#presets`, `#controls`, `#publish`).

---

## File structure

**Modify:**
- `pages/template-creator.html` — add `data-control-key` to the 5 Controls sections.
- `assets/js/template-wizard.js` — the whole feature: two refactors (`addPresetItem`, `exportApi`) + `serializeWizard` + `hydrateWizard` + the `persistSave` rewrite + hydrate-on-load.

All wizard code lives inside one `document.addEventListener("DOMContentLoaded", () => { … })` (opens at line 39, closes near line 528 with `});`). "Callback scope" = directly inside that arrow function.

---

## Task 1: Key the Controls sections

**Files:** Modify `pages/template-creator.html`

- [ ] **Step 1: Add `data-control-key` to each Controls `<details>`**

In the `data-controls` panel (starts `<section class="wizard-panel" data-panel="controls" data-controls hidden>`, ~line 269), each control category is a `<details class="wiz-section">`. Add a `data-control-key` to each, matching this order:
- the `<details>` whose title is **Text** → `<details class="wiz-section" data-control-key="text">`
- **Features** → `data-control-key="features"`
- **Interactivity** → `data-control-key="interactivity"`
- **Appearance styles** → `data-control-key="appearance"`
- **Map layers** → `data-control-key="maplayers"`

(Only the five sections inside `data-controls`. Do NOT touch the same-named sections in the Customize panel.)

- [ ] **Step 2: Verify**

```bash
cd ~/Documents/designer-flow-everviz
grep -c 'data-control-key' pages/template-creator.html   # expect 5
```
Expected: `5`.

- [ ] **Step 3: Commit**

```bash
git add pages/template-creator.html
git commit -m "feat(round-trip): key Controls sections with data-control-key"
```

---

## Task 2: Factor `addPresetItem(container, name)` to callback scope

**Files:** Modify `assets/js/template-wizard.js`

- [ ] **Step 1: Replace the inline preset-item creation with a shared helper**

Find the Presets block (~lines 262–285). Replace the `document.querySelectorAll("[data-add-preset]").forEach(...)` block with this — a top-level `addPresetItem` plus the same handler using it:

```js
    // ── Preset pickers (Presets tab) ────────────────────────────────
    // addPresetItem builds a chip in the given section container; used by the
    // picker handler AND by hydrateWizard when restoring a saved template.
    function addPresetItem(container, name) {
      const btn = container.querySelector("[data-add-preset]");
      const item = document.createElement("div");
      item.className = "wiz-preset-item";
      item.innerHTML =
        '<span class="wiz-preset-item__thumb" aria-hidden="true"></span>' +
        '<span class="wiz-preset-item__name"></span>' +
        '<button type="button" class="wiz-preset-item__remove" aria-label="Remove preset">' +
        '<img src="assets/icons/x-mark.svg" alt="" width="14" height="14" /></button>';
      item.querySelector(".wiz-preset-item__name").textContent = name;
      container.insertBefore(item, btn);
    }
    document.querySelectorAll("[data-add-preset]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const cfg = PRESETS[btn.dataset.addPreset];
        if (!cfg || !window.pickerModal) return;
        const choice = await window.pickerModal(cfg);
        if (!choice) return;
        addPresetItem(btn.parentElement, choice.name);
      });
    });
    document.querySelectorAll(".wiz-sections").forEach((sec) => {
      sec.addEventListener("click", (e) => {
        const rm = e.target.closest(".wiz-preset-item__remove");
        if (rm) rm.closest(".wiz-preset-item").remove();
      });
    });
```

- [ ] **Step 2: Verify parse + presets still add**

```bash
cd ~/Documents/designer-flow-everviz && node --check assets/js/template-wizard.js && echo PARSE_OK
```
Then serve + fresh context: `template-creator.html#presets` → click "Add marker preset", pick one → a chip appears; the ✕ removes it. No console errors.

- [ ] **Step 3: Commit**

```bash
git add assets/js/template-wizard.js
git commit -m "refactor(round-trip): factor addPresetItem helper (no behaviour change)"
```

---

## Task 3: Expose `exportApi` at callback scope

**Files:** Modify `assets/js/template-wizard.js`

- [ ] **Step 1: Declare a callback-scope handle**

Immediately after the `document.addEventListener("DOMContentLoaded", () => {` line (line 39), add:
```js
    let exportApi = null; // set inside the export block; used by serialize/hydrate
```

- [ ] **Step 2: Assign it at the end of the export block**

In the export block, find the seeding lines near the end:
```js
      // Seed the initial presets (replacing the static template card).
      list.innerHTML = "";
      INITIAL.forEach((cfg) => list.appendChild(makeCard(cfg)));
      refreshDefaultOptions();
```
Immediately AFTER `refreshDefaultOptions();` (still inside `if (exportRoot) {`), add:
```js
      exportApi = { list, makeCard, refreshDefaultOptions, defaultValue };
```

- [ ] **Step 3: Verify parse**

```bash
cd ~/Documents/designer-flow-everviz && node --check assets/js/template-wizard.js && echo PARSE_OK
```
Serve + fresh context: `template-creator.html#publish` still shows the 5 seeded export presets; add/delete still work. No console errors.

- [ ] **Step 4: Commit**

```bash
git add assets/js/template-wizard.js
git commit -m "refactor(round-trip): expose exportApi for serialize/hydrate"
```

---

## Task 4: `serializeWizard()`

**Files:** Modify `assets/js/template-wizard.js`

- [ ] **Step 1: Append `serializeWizard()` at the end of the callback**

Just before the callback's closing `});` (the line near 528, right after the `if (exportRoot) { … }` block closes), add:

```js
    // ── Round-trip: read the whole wizard into a config blob ─────────
    function serializeWizard() {
      // Map
      const mapPick = document.querySelector("[data-map-pick-grid] .map-pick--selected");
      // Minimap
      const levelSel = document.querySelector("[data-minimap-level-menu] .is-selected");
      const placeSel = document.querySelector("[data-minimap-placement-menu] .is-selected");
      const iconSel = document.querySelector("[data-minimap-icon-menu] .is-selected");
      const minimap = {
        enabled: !!document.querySelector("[data-minimap-enable]")?.checked,
        presetId: (typeof chosenPreset !== "undefined" && chosenPreset) ? chosenPreset.id : null,
        presetName: (typeof chosenPreset !== "undefined" && chosenPreset) ? chosenPreset.name : null,
        level: levelSel ? levelSel.dataset.levelId : null,
        allowZoom: !!document.querySelector("[data-minimap-allow-zoom]")?.checked,
        size: Number(document.querySelector("[data-minimap-size]")?.value || 0),
        placement: placeSel ? placeSel.dataset.placement : "tl",
        icon: iconSel ? iconSel.dataset.iconType : "none",
      };
      // Presets (name-keyed chips per section)
      const namesIn = (container) =>
        container ? [...container.querySelectorAll(".wiz-preset-item__name")].map((n) => n.textContent.trim()) : [];
      const markersC = document.querySelector('[data-add-preset="markers"]')?.parentElement;
      const regionsC = document.querySelector('[data-add-preset="regions"]')?.parentElement;
      const presets = { markers: namesIn(markersC), regions: namesIn(regionsC) };
      // Controls (keyed sections; ordered sub-option booleans)
      const controls = {};
      document.querySelectorAll("[data-controls] .wiz-section[data-control-key]").forEach((sec) => {
        const key = sec.dataset.controlKey;
        const head = sec.querySelector("[data-control-toggle]");
        const opts = [...sec.querySelectorAll('.wiz-section__body input[type="checkbox"]')].map((c) => c.checked);
        controls[key] = { on: !!head?.checked, opts };
      });
      // Export
      const exp = { presets: [], defaultName: null };
      if (exportApi) {
        exp.presets = [...exportApi.list.querySelectorAll("[data-export-preset]")].map((card) => ({
          name: card.querySelector(".export-preset__name").value.trim() || "Untitled",
          platform: card.querySelector("[data-platform].is-selected")?.dataset.platform || "multi",
          width: Number(card.querySelector("[data-export-w]").value || 0),
          height: Number(card.querySelector("[data-export-h]").value || 0),
        }));
        exp.defaultName = exportApi.defaultValue.textContent.trim() || null;
      }
      return {
        version: 1,
        map: { pick: mapPick ? mapPick.dataset.thumb : null },
        minimap,
        presets,
        controls,
        export: exp,
      };
    }
    window.__wizardSerialize = serializeWizard; // exposed for browser verification
```
Note: `chosenPreset` is a `let` declared in the minimap wiring earlier in this same callback scope, so `serializeWizard` closes over it. The `typeof` guard keeps it safe if that binding is ever renamed.

- [ ] **Step 2: Verify the shape in-browser**

Parse: `node --check assets/js/template-wizard.js` → PARSE_OK.
Serve + fresh context on `template-creator.html`. In DevTools console (or via evaluate) after enabling the minimap + picking a level/placement:
```js
window.__wizardSerialize()
```
Expected: an object with `version:1`, `map.pick`, a `minimap` object (enabled/level/placement/icon/size), `presets.markers`/`.regions` arrays, `controls` with 5 keys each `{on,opts:[…]}`, and `export.presets` (5 seeded) + `export.defaultName`. No console errors.

- [ ] **Step 3: Commit**

```bash
git add assets/js/template-wizard.js
git commit -m "feat(round-trip): serializeWizard() reads all tabs into config"
```

---

## Task 5: `hydrateWizard()` — Map + Minimap

**Files:** Modify `assets/js/template-wizard.js`

- [ ] **Step 1: Append `hydrateWizard` (map + minimap) after `serializeWizard`**

Immediately after the `window.__wizardSerialize = serializeWizard;` line, add:

```js
    // ── Round-trip: write a config blob back into the wizard ─────────
    // Select an option in a .filter-popover-style menu: toggle is-selected,
    // set the trigger's value text, return the chosen option (or null).
    function pickMenuOption(menu, valueEl, attr, val) {
      if (!menu) return null;
      let chosen = null;
      menu.querySelectorAll("[" + attr + "]").forEach((o) => {
        const on = o.getAttribute(attr) === String(val);
        o.classList.toggle("is-selected", on);
        if (on) chosen = o;
      });
      if (chosen && valueEl) valueEl.textContent = chosen.textContent.trim();
      return chosen;
    }

    function hydrateWizard(config) {
      if (!config) return;

      // Map
      if (config.map && config.map.pick) {
        const g = document.querySelector("[data-map-pick-grid]");
        const card = g && g.querySelector('[data-map-pick][data-thumb="' + config.map.pick + '"]');
        if (card) {
          g.querySelectorAll(".map-pick--selected").forEach((c) => c.classList.remove("map-pick--selected"));
          card.classList.add("map-pick--selected");
          const st = document.querySelector("[data-preview-stage]");
          if (st) st.dataset.stage = card.dataset.thumb;
        }
      }

      // Minimap
      const mm = config.minimap || {};
      const enableEl = document.querySelector("[data-minimap-enable]");
      if (enableEl) {
        enableEl.checked = !!mm.enabled;
        if (typeof setMinimapRowsShown === "function") setMinimapRowsShown(!!mm.enabled);
        overlay?.classList.toggle("is-on", !!mm.enabled);
      }
      const presetValueEl = document.querySelector("[data-minimap-preset-value]");
      const levelMenuEl = document.querySelector("[data-minimap-level-menu]");
      const levelValueEl = document.querySelector("[data-minimap-level-value]");
      if (mm.presetId || mm.presetName) {
        const found = window.SavedMaps
          ? SavedMaps.list("minimap").find((e) => e.id === mm.presetId)
          : null;
        if (found) {
          chosenPreset = found;
          if (presetValueEl) {
            presetValueEl.textContent = found.name;
            presetValueEl.classList.remove("select__value--placeholder");
          }
          if (typeof fillLevelMenu === "function") fillLevelMenu(found);
          if (mm.level) pickMenuOption(levelMenuEl, levelValueEl, "data-level-id", mm.level);
        } else if (presetValueEl) {
          // Graceful fallback: referenced preset is gone.
          presetValueEl.textContent = (mm.presetName || "Preset") + " (unavailable)";
          presetValueEl.classList.remove("select__value--placeholder");
          if (levelMenuEl) levelMenuEl.innerHTML = "";
        }
      }
      const azEl = document.querySelector("[data-minimap-allow-zoom]");
      if (azEl) azEl.checked = !!mm.allowZoom;
      const sizeEl = document.querySelector("[data-minimap-size]");
      if (sizeEl && mm.size != null) sizeEl.value = mm.size;
      // Placement (also move the overlay)
      pickMenuOption(
        document.querySelector("[data-minimap-placement-menu]"),
        document.querySelector("[data-minimap-placement-value]"),
        "data-placement",
        mm.placement || "tl"
      );
      overlay?.setAttribute("data-placement", mm.placement || "tl");
      // Icon (also update the marker)
      pickMenuOption(
        document.querySelector("[data-minimap-icon-menu]"),
        document.querySelector("[data-minimap-icon-value]"),
        "data-icon-type",
        mm.icon || "none"
      );
      if (typeof setMinimapIcon === "function") setMinimapIcon(mm.icon || "none");

      hydrateRest(config); // presets + controls + export (next task)
    }
    window.__wizardHydrate = hydrateWizard; // exposed for browser verification
```

- [ ] **Step 2: Add a temporary `hydrateRest` stub so the file parses (replaced next task)**

Immediately after the `window.__wizardHydrate = hydrateWizard;` line, add:
```js
    function hydrateRest(config) { /* filled in the next task */ }
```

- [ ] **Step 3: Verify map + minimap restore**

Parse: `node --check assets/js/template-wizard.js` → PARSE_OK.
Serve + fresh context on `template-creator.html`. In console:
```js
window.__wizardHydrate({ version:1, map:{pick:"world"},
  minimap:{ enabled:true, presetId:null, presetName:null, level:null, allowZoom:true, size:20, placement:"br", icon:"pin" },
  presets:{markers:[],regions:[]}, controls:{}, export:{presets:[],defaultName:null} })
```
Expected: the Customize tab's minimap toggle is on, dependent rows revealed, Allow zoom on, size 20, Placement shows "Bottom right" and the overlay moved to the bottom-right, Icon shows "Pin". On the Map tab the "world" card (if present) is selected. No console errors.

- [ ] **Step 4: Commit**

```bash
git add assets/js/template-wizard.js
git commit -m "feat(round-trip): hydrateWizard — map + minimap (+ unavailable fallback)"
```

---

## Task 6: `hydrateRest()` — Presets + Controls + Export

**Files:** Modify `assets/js/template-wizard.js`

- [ ] **Step 1: Replace the `hydrateRest` stub**

Replace `function hydrateRest(config) { /* filled in the next task */ }` with:

```js
    function hydrateRest(config) {
      // Presets — clear existing chips, recreate from saved names.
      const markersC = document.querySelector('[data-add-preset="markers"]')?.parentElement;
      const regionsC = document.querySelector('[data-add-preset="regions"]')?.parentElement;
      [markersC, regionsC].forEach((c) => c && c.querySelectorAll(".wiz-preset-item").forEach((i) => i.remove()));
      (config.presets?.markers || []).forEach((n) => markersC && addPresetItem(markersC, n));
      (config.presets?.regions || []).forEach((n) => regionsC && addPresetItem(regionsC, n));

      // Controls — set each section's header toggle + sub-options by index.
      Object.entries(config.controls || {}).forEach(([key, val]) => {
        const sec = document.querySelector('[data-controls] .wiz-section[data-control-key="' + key + '"]');
        if (!sec) return;
        const head = sec.querySelector("[data-control-toggle]");
        if (head) head.checked = !!val.on;
        const body = sec.querySelector(".wiz-section__body");
        if (body) body.classList.toggle("is-disabled", !val.on);
        const boxes = [...sec.querySelectorAll('.wiz-section__body input[type="checkbox"]')];
        (val.opts || []).forEach((on, i) => { if (boxes[i]) boxes[i].checked = !!on; });
      });

      // Export — rebuild the card list from saved presets, then set default.
      if (exportApi && config.export) {
        exportApi.list.innerHTML = "";
        (config.export.presets || []).forEach((p) =>
          exportApi.list.appendChild(exportApi.makeCard({ name: p.name, platform: p.platform, w: p.width, h: p.height }))
        );
        exportApi.refreshDefaultOptions();
        if (config.export.defaultName) {
          exportApi.defaultValue.textContent = config.export.defaultName;
          exportApi.refreshDefaultOptions();
        }
      }
    }
```

- [ ] **Step 2: Verify presets + controls + export restore**

Parse: `node --check assets/js/template-wizard.js` → PARSE_OK.
Serve + fresh context on `template-creator.html`. In console:
```js
window.__wizardHydrate({ version:1, map:{pick:null},
  minimap:{enabled:false}, presets:{ markers:["Red marker","Star marker"], regions:["Choropleth"] },
  controls:{ text:{on:false,opts:[false,true]}, features:{on:true,opts:[true]} },
  export:{ presets:[{name:"Story",platform:"video",width:1200,height:800}], defaultName:"Story" } })
```
Then check each tab:
- Presets tab → 2 marker chips ("Red marker", "Star marker") + 1 region chip ("Choropleth").
- Controls tab → Text section header unchecked (+ body dimmed); Features checked.
- Publish tab → a single "Story" export card (Video, 1200×800); Default preset shows "Story".
No console errors.

- [ ] **Step 3: Commit**

```bash
git add assets/js/template-wizard.js
git commit -m "feat(round-trip): hydrateRest — presets + controls + export"
```

---

## Task 7: Persist snapshot + hydrate on load

**Files:** Modify `assets/js/template-wizard.js`

- [ ] **Step 1: Rewrite `persistSave` to snapshot the full config**

In the save block (~lines 346–359), replace the `persistSave` function with:

```js
      const persistSave = () => {
        const name = (nameInput?.value || "").trim() || "Untitled project";
        if (titleEl) titleEl.textContent = name; // reflect rename on the bar
        const id = editingId || (window.SavedMaps ? SavedMaps.id() : "t_" + name);
        const config = serializeWizard();
        let created = null;
        const list = window.SavedMaps ? SavedMaps.list("template") : [];
        const existing = list.find((e) => e.id === id);
        created = existing ? existing.created : new Date().toISOString().slice(0, 10);
        const entry = { id, name, created, thumb: 'url("assets/img/maps/north-europe.png")', config };
        if (window.SavedMaps) {
          SavedMaps.replaceAll("template", [...list.filter((e) => e.id !== id), entry]);
        }
        try { sessionStorage.setItem("everviz-new-template", id); } catch (e) {}
        return entry;
      };
```

- [ ] **Step 2: Hydrate on load when editing**

At the very end of the callback (immediately before the closing `});`, AFTER `serializeWizard`/`hydrateWizard` are defined), add:

```js
    // On edit (?id), restore the saved template's full config.
    (function restoreOnLoad() {
      const id = new URLSearchParams(location.search).get("id");
      if (!id || !window.SavedMaps) return;
      const entry = SavedMaps.list("template").find((e) => e.id === id);
      if (entry && entry.config) hydrateWizard(entry.config);
    })();
```

- [ ] **Step 3: Verify the full save → reload round-trip**

Parse: `node --check assets/js/template-wizard.js` → PARSE_OK.
Serve + fresh context on `template-creator.html`:
1. Configure: pick a map; Customize → enable minimap, set Placement = Bottom right, Icon = Star, size = 30; Presets → add a marker; Controls → uncheck "Text"; Publish → rename the first export preset.
2. Click **Save** (in the modal, "Save"). In console: `JSON.parse(localStorage.getItem("everviz-saved-templates"))` → one entry with a `config` matching the choices; note its `id`.
3. Open `template-creator.html?id=<that-id>` in a fresh context → every tab restored (map selection, minimap placement/icon/size/enabled, marker chip, Text unchecked, export rename).

- [ ] **Step 4: Commit**

```bash
git add assets/js/template-wizard.js
git commit -m "feat(round-trip): snapshot-persist template config + hydrate on edit"
```

---

## Task 8: Full round-trip verification + PR

**Files:** none (verification + PR)

- [ ] **Step 1: Missing-preset fallback check**

Save a template with a minimap preset chosen. Then delete that preset from `everviz-saved-minimaps` in localStorage (or save it under a new id). Reopen the template via `?id` → the minimap Preset control shows "`<name> (unavailable)`", the level menu is empty, and the page doesn't error. Re-picking a preset works.

- [ ] **Step 2: No-config safety**

Open `template-creator.html?id=nonexistent` and `?id=` (empty) in fresh contexts → wizard loads at defaults, no console errors (hydrate is a no-op).

- [ ] **Step 3: Push + open PR**

```bash
cd ~/Documents/designer-flow-everviz
git push -u origin feat/template-round-trip
gh pr create --base feat/minimap-editor-redesign --head feat/template-round-trip \
  --title "Template config round-trip (save + restore full wizard state)" \
  --body "Implements docs/superpowers/specs/2026-07-02-template-config-round-trip-design.md. serializeWizard()/hydrateWizard() persist the whole wizard state (map, minimap, presets, controls, export) into the saved template's config blob and restore it on edit via ?id. Minimap preset referenced by id with a graceful (unavailable) fallback. Snapshot persistence via SavedMaps.replaceAll. Stacked on feat/minimap-editor-redesign.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
(Base is `feat/minimap-editor-redesign`; retarget to `main` after #150 merges.)

---

## Self-review (author check against the spec)

- **Spec coverage:** serialize-from-DOM/hydrate-to-DOM → Tasks 4–6. Reference-by-id + unavailable fallback → Task 5. Data shape (config) → Task 4. Per-tab serialize → Task 4; per-tab hydrate → Tasks 5–6. Save wiring (snapshot replaceAll, no thumb-from-map) → Task 7. Hydrate-on-`?id` → Task 7. Controls keyed by `data-control-key` + ordered `opts` → Tasks 1, 4, 6. `addPresetItem`/`exportApi` scope refactors → Tasks 2, 3. Edge cases (no config / missing preset / empty lists) → Tasks 5, 8. Every spec section maps to a task.
- **Placeholder scan:** No TBD/TODO. Task 5 lands a `hydrateRest` stub that is *replaced in Task 6* (staged so each task parses + verifies); not an unfilled placeholder.
- **Type consistency:** `config` shape (`version/map/minimap/presets/controls/export`) identical across `serializeWizard` (Task 4) and `hydrateWizard`/`hydrateRest` (Tasks 5–6). `minimap` keys (`enabled/presetId/presetName/level/allowZoom/size/placement/icon`) match between read and write. `controls[key] = {on, opts:[…]}` consistent. `export.presets[]` uses `{name, platform, width, height}` in serialize and is mapped to `makeCard({name, platform, w, h})` in hydrate (width→w, height→h) — intentional, `makeCard` takes `w`/`h`. `pickMenuOption`, `addPresetItem`, `exportApi` referenced only where defined/exposed.
