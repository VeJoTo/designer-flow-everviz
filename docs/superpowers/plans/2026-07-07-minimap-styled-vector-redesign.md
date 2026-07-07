# Minimap Styled-Vector Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimap's OSM-tiles-plus-blobby-polygons rendering with a single vendored d3-geo vector engine that draws a real recolorable globe and recognizable styled regions, and fix the minimap to exactly Globe + Region.

**Architecture:** One renderer (`minimap-render.js`) draws every level to a `<canvas>` with d3-geo — an orthographic round earth for the physical (Globe) level and a Mercator styled locator for the political (Region) level, both driven entirely by the level's colour settings. The public API (`render(el, level, view)`, `schemaOf(level)`) is preserved so the four existing call sites (editor, wizard inset, picker thumbnails, library thumbnails) keep working unchanged; a new `dispose(el)` replaces the old `OsmMap.dispose` used for the wizard inset. `GeoRegions` is left as-is (`{center:[lat,lng], zoom}`); the renderer interprets that framing.

**Tech Stack:** Vanilla JS (IIFE modules on `window`), d3-array + d3-geo (vendored UMD), Natural Earth 50m GeoJSON (vendored), HTML canvas 2D. No build step. Verified in-browser via chrome-devtools.

## Global Constraints

- **Vendored only, no CDN/keys at runtime** — all libraries and data are served from `assets/vendor/`. The minimap must make **no external network calls**.
- **`<base href="../" />`** is set on every page under `pages/`, so all `assets/...` URLs (script `src`, `fetch`) resolve from the site root. Mirror the existing relative path style (`assets/vendor/geo/...`).
- **No automated test harness exists** in this repo. Every prior minimap task was verified in-browser; this plan does the same. "Verify" steps mean: serve on a **fresh port** (Chrome caches page JS/CSS hard — a new port = new origin = empty cache), then drive/screenshot with chrome-devtools and assert via `evaluate_script`.
- **Preserve the public renderer API:** `MinimapRender.render(el, level, view)` and `MinimapRender.schemaOf(level)` must keep their signatures. `view` stays `{ center:[lat,lng], zoom }`.
- **Scope: minimap only.** Do **not** touch the main wizard preview map (`[data-preview-map]` / `OsmMap.mountZoomOnly` in `template-wizard.js` ~line 136) — it intentionally keeps live OSM. `osm-map.js` stays.
- **Feature branch:** `feat/minimap-styled-vector` (already created, stacked on local `feat/live-osm-maps`). Commit after each task.
- Full spec: `docs/superpowers/specs/2026-07-07-minimap-styled-vector-redesign-design.md`.

---

## File Structure

- `assets/vendor/d3/d3-array.min.js` — **new** — vendored d3-array UMD (dependency of d3-geo).
- `assets/vendor/d3/d3-geo.min.js` — **new** — vendored d3-geo UMD (projections + `geoPath`).
- `assets/vendor/geo/land-50m.geojson` — **new** — Natural Earth 50m land (continents) for the globe.
- `assets/vendor/geo/countries-50m.geojson` — **new** — Natural Earth 50m admin-0 countries for regions.
- `assets/js/minimap-render.js` — **rewrite** — d3 canvas renderer; keep `render`/`schemaOf`, add `dispose`.
- `assets/js/minimap-model.js` — **modify** — trim `TYPE_SCHEMA`/`TYPE_ORDER`/`TYPE_LABEL` to `globe` + `region`.
- `assets/js/minimap-editor.js` — **modify** — delete the add-level handler; drop count-changing rail-menu actions (Duplicate/Remove) so the 2-level set is truly fixed.
- `pages/minimap-editor.html` — **modify** — delete add-level markup; add d3 scripts; drop unused leaflet/osm.
- `pages/template-creator.html` — **modify** — add d3 scripts (wizard renders minimap insets/thumbs). Keep leaflet/osm (main preview).
- `pages/mini-map-library.html` — **modify** — add d3 scripts; drop unused leaflet/osm.
- `assets/js/template-wizard.js` — **modify** — swap `OsmMap.dispose(minimapMapEl)` → `MinimapRender.dispose(...)`; refresh OSM-referencing comments. (Main preview untouched.)
- `assets/vendor/geo/world-countries.geojson` — **delete** at the end, once nothing references it.
- `assets/js/minimap-thumbs.js` — **unchanged** (calls `render`/`schemaOf` with the preserved API; verified only).
- `assets/js/geo-regions.js` — **unchanged**.
- `assets/js/osm-map.js` — **unchanged** (main preview only).

---

### Task 1: Vendor d3-geo and Natural Earth 50m geometry

**Files:**
- Create: `assets/vendor/d3/d3-array.min.js`, `assets/vendor/d3/d3-geo.min.js`
- Create: `assets/vendor/geo/land-50m.geojson`, `assets/vendor/geo/countries-50m.geojson`
- Modify: `pages/minimap-editor.html`, `pages/template-creator.html`, `pages/mini-map-library.html` (add d3 script tags)

**Interfaces:**
- Produces: global `d3` with `d3.geoOrthographic`, `d3.geoMercator`, `d3.geoPath` (consumed by Task 2). Two vendored GeoJSON files at the paths above.

- [ ] **Step 1: Download the vendored libraries and data**

```bash
cd ~/Documents/designer-flow-everviz
mkdir -p assets/vendor/d3
curl -fL https://cdn.jsdelivr.net/npm/d3-array@3/dist/d3-array.min.js -o assets/vendor/d3/d3-array.min.js
curl -fL https://cdn.jsdelivr.net/npm/d3-geo@3/dist/d3-geo.min.js   -o assets/vendor/d3/d3-geo.min.js
curl -fL https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/50m/physical/ne_50m_land.json \
  -o assets/vendor/geo/land-50m.geojson
curl -fL https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/50m/cultural/ne_50m_admin_0_countries.json \
  -o assets/vendor/geo/countries-50m.geojson
```

- [ ] **Step 2: Verify the files are valid**

```bash
cd ~/Documents/designer-flow-everviz
ls -lh assets/vendor/d3/*.js assets/vendor/geo/*-50m.geojson
node -e "for (const f of ['land-50m','countries-50m']){const d=require('./assets/vendor/geo/'+f+'.geojson');console.log(f, d.type, (d.features||[]).length,'features')}"
head -c 60 assets/vendor/d3/d3-geo.min.js; echo
```
Expected: both `.js` files are non-empty; both GeoJSON files parse as `FeatureCollection` with a plausible feature count (land ~1–1.5k, countries ~240). d3-geo header starts with a UMD wrapper comment/`!function`.

- [ ] **Step 3: Add d3 script tags before `minimap-render.js` on all three minimap pages**

In each of `pages/minimap-editor.html`, `pages/template-creator.html`, `pages/mini-map-library.html`, find the line `<script src="assets/js/minimap-render.js" defer></script>` and insert immediately **before** it:

```html
  <script src="assets/vendor/d3/d3-array.min.js" defer></script>
  <script src="assets/vendor/d3/d3-geo.min.js" defer></script>
```
(`defer` preserves execution order: d3-array populates `window.d3`, d3-geo augments it, then `minimap-render.js` runs.)

- [ ] **Step 4: Verify d3 loads in the browser**

Serve on a fresh port and check the global is present (chrome-devtools):
```bash
cd ~/Documents/designer-flow-everviz && (python3 -m http.server 8801 >/tmp/mm-serve.log 2>&1 &) ; sleep 1
```
- `new_page` → `http://localhost:8801/pages/minimap-editor.html`
- `evaluate_script`: `() => ({ path: typeof d3.geoPath, ortho: typeof d3.geoOrthographic, merc: typeof d3.geoMercator })`

Expected: `{ path: "function", ortho: "function", merc: "function" }`. (The map still renders the OLD way here — that's fine; this task only wires d3 in.)

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/designer-flow-everviz
git add assets/vendor/d3 assets/vendor/geo/land-50m.geojson assets/vendor/geo/countries-50m.geojson \
  pages/minimap-editor.html pages/template-creator.html pages/mini-map-library.html
git commit -m "feat(minimap): vendor d3-geo + Natural Earth 50m geometry"
```

---

### Task 2: Rewrite `minimap-render.js` as a d3 canvas renderer

**Files:**
- Rewrite: `assets/js/minimap-render.js`

**Interfaces:**
- Consumes: global `d3` (Task 1); vendored `land-50m.geojson` / `countries-50m.geojson`.
- Produces: `window.MinimapRender = { render(el, level, view), dispose(el), schemaOf(level), loadLand(), loadCountries() }`.
  - `render(el, level, view)` → `Promise<void>`. `view = { center:[lat,lng], zoom }`.
  - `dispose(el)` → removes the canvas (`el.__mmCanvas`).
  - `schemaOf(level)` → `"physical" | "political"`.

- [ ] **Step 1: Replace the whole file with the d3 canvas renderer**

```js
// Renders a minimap level into an element as a fully branded, styled vector
// LOCATOR — no OSM, no tiles, no network. Uses vendored d3-geo to draw
// recolorable shapes to a <canvas>. window.MinimapRender.
//
//   render(el, level, view) → Promise<void>
//     schema "physical" (globe)  → orthographic round earth: water sphere +
//                                  land (Natural Earth 50m) in the level colours.
//     schema "political" (region)→ mercator styled locator: country land
//                                  (Natural Earth 50m) filled + stroked over
//                                  the background (the sea). No highlight.
//     view = { center:[lat,lng], zoom } — orthographic rotates to centre;
//            mercator centres on it and derives scale from the Leaflet zoom.
//   dispose(el)     → tear down the canvas.
//   schemaOf(level) → "physical" | "political".
//
// Depends on: global d3 (d3-array + d3-geo). No Leaflet.
(function (global) {
  const TYPE_SCHEMA = { globe: "physical", region: "political" };
  const DEFAULTS = {
    physical: { water: "#cfe8f5", land: "#e9e6df", background: "#ffffff" },
    political: { land: "#e9e6df", strokeColor: "#8a8a8a", strokeWidth: 1, opacity: 100, background: "#ffffff" },
  };

  function schemaOf(level) {
    return (level && level.schema) || (level && TYPE_SCHEMA[level.type]) || "political";
  }
  function settingsOf(level, schema) {
    return Object.assign({}, DEFAULTS[schema], (level && level.settings) || {});
  }

  // Vendored Natural Earth 50m GeoJSON, fetched once each.
  let landPromise = null, countriesPromise = null;
  function fetchJSON(url) {
    return fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  }
  function loadLand() {
    if (!landPromise) landPromise = fetchJSON("assets/vendor/geo/land-50m.geojson");
    return landPromise;
  }
  function loadCountries() {
    if (!countriesPromise) countriesPromise = fetchJSON("assets/vendor/geo/countries-50m.geojson");
    return countriesPromise;
  }

  // Ensure a correctly-sized canvas child; return { canvas, ctx, w, h } in CSS px.
  function ensureCanvas(el) {
    let canvas = el.__mmCanvas;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "mm-canvas";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      el.appendChild(canvas);
      el.__mmCanvas = canvas;
    }
    const rect = el.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const dpr = global.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS px
    return { canvas, ctx, w, h };
  }

  function dispose(el) {
    if (el && el.__mmCanvas) {
      el.__mmCanvas.remove();
      el.__mmCanvas = null;
    }
  }

  async function render(el, level, view) {
    if (!el || !global.d3 || !d3.geoPath) return;
    const schema = schemaOf(level);
    const s = settingsOf(level, schema);
    const center = (view && view.center) || [20, 0];
    const zoom = view && view.zoom != null ? view.zoom : 2;
    const lat = center[0], lng = center[1];

    const { canvas, ctx, w, h } = ensureCanvas(el);
    el.style.background = s.background || "#ffffff";
    ctx.clearRect(0, 0, w, h);

    if (schema === "physical") {
      const projection = d3.geoOrthographic()
        .rotate([-lng, -lat])
        .clipAngle(90)
        .translate([w / 2, h / 2])
        .scale(Math.min(w, h) / 2 - 1);
      const path = d3.geoPath(projection, ctx);
      ctx.beginPath(); path({ type: "Sphere" });
      ctx.fillStyle = s.water || "#cfe8f5"; ctx.fill();
      const land = await loadLand();
      if (land && el.__mmCanvas === canvas) {
        ctx.beginPath(); path(land);
        ctx.fillStyle = s.land || "#e9e6df"; ctx.fill();
      }
      ctx.beginPath(); path({ type: "Sphere" });
      ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth = 1; ctx.stroke();
      return;
    }

    // political: mercator styled locator. Leaflet zoom z ⇒ world width 256·2^z px,
    // and geoMercator scale = worldWidth / 2π.
    const scale = (256 * Math.pow(2, zoom)) / (2 * Math.PI);
    const projection = d3.geoMercator()
      .center([lng, lat])
      .translate([w / 2, h / 2])
      .scale(scale);
    const path = d3.geoPath(projection, ctx);
    ctx.fillStyle = s.background || "#ffffff"; // the sea
    ctx.fillRect(0, 0, w, h);
    const countries = await loadCountries();
    if (countries && el.__mmCanvas === canvas) {
      ctx.beginPath(); path(countries);
      ctx.globalAlpha = (s.opacity == null ? 100 : s.opacity) / 100;
      ctx.fillStyle = s.land || "#e9e6df"; ctx.fill();
      ctx.globalAlpha = 1;
      const sw = s.strokeWidth == null ? 1 : s.strokeWidth;
      if (sw > 0) {
        ctx.lineWidth = sw;
        ctx.strokeStyle = s.strokeColor || "#8a8a8a";
        ctx.stroke();
      }
    }
  }

  global.MinimapRender = { render, dispose, schemaOf, loadLand, loadCountries };
})(window);
```

- [ ] **Step 2: Verify the Globe level renders as a recolorable round earth**

Serve on a fresh port; open the editor:
```bash
cd ~/Documents/designer-flow-everviz && (python3 -m http.server 8802 >/tmp/mm-serve.log 2>&1 &) ; sleep 1
```
- `new_page` → `http://localhost:8802/pages/minimap-editor.html`
- `take_screenshot` — expect the preview to be a **round disc**: water-coloured sphere with land continents drawn on it, on a white background (not a flat street map, no OSM attribution).
- Drive a colour change and confirm it applies: `evaluate_script`:
```js
() => {
  const hex = document.querySelector('[data-mm-fields] .color-input__hex');
  hex.value = '#ff0000';
  hex.dispatchEvent(new Event('change', { bubbles: true }));
  return 'water set red';
}
```
- `take_screenshot` — the sphere/water is now red.

Expected: a real globe; Water/Land/Background controls visibly drive it.

- [ ] **Step 3: Verify the Region level renders recognizable, framed, recolorable land**

- `evaluate_script` to select the Region level:
```js
() => { const r=[...document.querySelectorAll('.mm-level')].find(x=>/Region/.test(x.textContent)); r && r.click(); return 'region selected'; }
```
- `take_screenshot` — expect **recognizable coastlines/borders** filling the frame edge-to-edge (no stray white wedge), land in the land colour over the background "sea".
- Change Land colour (repeat the Step-2 hex snippet targeting the first colour field) and confirm the land fill updates.

Expected: recognizable region, framed, colour-driven — no blobs.

- [ ] **Step 4: Confirm no external network calls for the minimap**

`list_network_requests` (or `evaluate_script` on `performance.getEntriesByType('resource').map(r=>r.name)`) and assert **no** `tile.openstreetmap.org` requests were made by this page.

Expected: zero OSM tile requests.

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/designer-flow-everviz
git add assets/js/minimap-render.js
git commit -m "feat(minimap): d3-geo canvas renderer — orthographic globe + styled region, no OSM"
```

---

### Task 3: Point the wizard minimap inset at the new renderer's `dispose`

**Files:**
- Modify: `assets/js/template-wizard.js` (the minimap-inset block only, ~lines 358–388 and the comment at ~362)

**Interfaces:**
- Consumes: `MinimapRender.dispose` (Task 2). Leaves `renderMinimapInset` / `minimapView` / `selectedLevelObj` logic intact (they already call the preserved `render`/`schemaOf`).

- [ ] **Step 1: Replace the OSM dispose call in `clearPresetChip`**

In `assets/js/template-wizard.js`, change:
```js
      if (minimapMapEl) OsmMap.dispose(minimapMapEl);
```
to:
```js
      if (minimapMapEl && window.MinimapRender) MinimapRender.dispose(minimapMapEl);
```

- [ ] **Step 2: Refresh the stale OSM comment above `selectedLevelObj`**

Replace the comment block at ~line 362–364:
```js
    // The currently-selected level object. "All levels" (id "all") / no selection
    // → treat as the globe level (physical → live OSM). MinimapRender then draws
    // physical levels as OSM tiles and political levels as styled vector polygons.
```
with:
```js
    // The currently-selected level object. "All levels" (id "all") / no selection
    // → treat as the globe level. MinimapRender draws every level as a styled
    // vector locator (globe = orthographic sphere, region = mercator land).
```

- [ ] **Step 3: Verify the wizard inset renders + clears correctly**

Fresh port; open the wizard, add a minimap preset, check the inset:
```bash
cd ~/Documents/designer-flow-everviz && (python3 -m http.server 8803 >/tmp/mm-serve.log 2>&1 &) ; sleep 1
```
- `new_page` → `http://localhost:8803/pages/template-creator.html`
- Navigate to the **Presets** tab, click the minimap **Add preset**, choose a preset from the picker (`take_screenshot` of the picker — thumbnails should be styled locators, not blobs/OSM).
- `take_screenshot` of the preview — the **overlay inset** (top-left) shows the styled locator; with "All levels" it shows the globe disc.
- In Customize → Minimap, switch Level to **Region**; `take_screenshot` — inset swaps to the styled region.
- Remove the preset (clear the chip); `take_screenshot` — inset is gone, **no console errors** (`list_console_messages`).

Expected: inset renders as styled vector, follows the level, disposes cleanly, no errors, no OSM in the inset.

- [ ] **Step 4: Commit**

```bash
cd ~/Documents/designer-flow-everviz
git add assets/js/template-wizard.js
git commit -m "feat(wizard): minimap inset uses MinimapRender.dispose; drop OSM refs"
```

---

### Task 4: Fix the minimap to Globe + Region (remove Add level and count-changing actions)

**Files:**
- Modify: `pages/minimap-editor.html` (delete add-level button + menu markup, ~lines 58–67)
- Modify: `assets/js/minimap-editor.js` (delete add-level handler ~192–212; trim rail menu)
- Modify: `assets/js/minimap-model.js` (trim `TYPE_SCHEMA`/`TYPE_ORDER`/`TYPE_LABEL`)

**Interfaces:**
- Consumes: nothing new.
- Produces: a fixed 2-level editor. `MinimapModel.TYPE_LABEL` now `{ globe, region }` only; `makeLevel`/`makeDefaultPreset` still produce globe+region.

- [ ] **Step 1: Delete the add-level markup**

In `pages/minimap-editor.html`, remove the button + menu (the `data-mm-add-level` button and the `data-mm-add-menu` popover with its five `data-add-type` options), leaving just:
```html
          <ul class="mm-level-list" data-mm-levels></ul>
```

- [ ] **Step 2: Delete the add-level handler in the controller**

In `assets/js/minimap-editor.js`, delete the entire `// --- Add level ---` block (the `addBtn` / `addMenu` refs and their three listeners, ~lines 192–212).

- [ ] **Step 3: Remove count-changing actions from the rail menu (truly fixed set)**

A fixed Globe+Region set can't support Add, Duplicate, or Remove. In `assets/js/minimap-editor.js`:

(a) In `levelMenu(anchor)`, drop the Duplicate and Remove items so the menu is:
```js
      menu.innerHTML =
        '<button type="button" class="sort-option" role="menuitem" data-a="rename">Rename</button>' +
        '<button type="button" class="sort-option" role="menuitem" data-a="default">Set as default</button>';
```

(b) In the rail-menu click handler, delete the `else if (action === "duplicate")` and `else if (action === "remove")` branches, keeping only `rename` and `default`.

- [ ] **Step 4: Trim the model to globe + region**

In `assets/js/minimap-model.js`, replace the three type maps:
```js
  const TYPE_SCHEMA = {
    globe: "physical",
    region: "political",
  };
  const TYPE_ORDER = ["globe", "region"];
  const TYPE_LABEL = {
    globe: "Globe",
    region: "Region",
  };
```
(`makeDefaultPreset` already builds `["globe","region"]`; leave it and the rest of the file unchanged.)

- [ ] **Step 5: Verify the editor is a fixed 2-level editor**

Fresh port:
```bash
cd ~/Documents/designer-flow-everviz && (python3 -m http.server 8804 >/tmp/mm-serve.log 2>&1 &) ; sleep 1
```
- `new_page` → `http://localhost:8804/pages/minimap-editor.html`
- `take_screenshot` — rail shows exactly **Globe** and **Region**; **no "+ Add level"** button.
- `evaluate_script`: `() => ({ addBtn: !!document.querySelector('[data-mm-add-level]'), levels: document.querySelectorAll('.mm-level').length })`
  Expected: `{ addBtn: false, levels: 2 }`.
- Open a level's ⋯ menu (`click` the `[data-level-menu]`), `take_snapshot` — menu shows **Rename** and **Set as default** only (no Duplicate/Remove).
- Click **Rename** flow still works (`evaluate_script` can't drive `window.prompt`; just confirm the menu item exists and clicking Set-as-default moves the Default badge).

Expected: two fixed levels, no add, no duplicate/remove, rename + set-default intact.

- [ ] **Step 6: Commit**

```bash
cd ~/Documents/designer-flow-everviz
git add pages/minimap-editor.html assets/js/minimap-editor.js assets/js/minimap-model.js
git commit -m "feat(minimap): fix levels to Globe + Region (remove add/duplicate/remove)"
```

---

### Task 5: Drop unused Leaflet/OSM from minimap-only pages; retire 110m data; full-surface verification

**Files:**
- Modify: `pages/minimap-editor.html`, `pages/mini-map-library.html` (remove leaflet + osm-map includes)
- Delete: `assets/vendor/geo/world-countries.geojson`
- Verify: `assets/js/minimap-thumbs.js` (unchanged) across editor, wizard inset, picker, library

**Interfaces:**
- Consumes: everything from Tasks 1–4.

- [ ] **Step 1: Remove now-unused Leaflet/OSM includes from the two minimap-only pages**

In `pages/minimap-editor.html` and `pages/mini-map-library.html`, delete:
- `<link rel="stylesheet" href="assets/vendor/leaflet/leaflet.css" />`
- `<script src="assets/vendor/leaflet/leaflet.js" defer></script>`
- `<script src="assets/js/osm-map.js" defer></script>`

**Do NOT** remove these from `pages/template-creator.html` — the main preview still uses them.

- [ ] **Step 2: Confirm nothing else references the old 110m file, then delete it**

```bash
cd ~/Documents/designer-flow-everviz
grep -rn "world-countries.geojson" assets pages || echo "no references — safe to delete"
git rm assets/vendor/geo/world-countries.geojson
```
Expected: no references; file removed.

- [ ] **Step 3: Verify all four minimap surfaces on a fresh port**

```bash
cd ~/Documents/designer-flow-everviz && (python3 -m http.server 8805 >/tmp/mm-serve.log 2>&1 &) ; sleep 1
```
1. **Editor** — `http://localhost:8805/pages/minimap-editor.html`: globe disc + region land render; `list_console_messages` clean; `evaluate_script` `() => performance.getEntriesByType('resource').some(r=>/openstreetmap/.test(r.name))` → `false`.
2. **Library** — `http://localhost:8805/pages/mini-map-library.html`: `take_screenshot` — every card thumbnail is a styled locator (recognizable land, not blobs); no console errors; no OSM requests.
3. **Wizard inset + picker** — `http://localhost:8805/pages/template-creator.html`: repeat Task 3's add-preset flow; picker thumbnails and the inset are styled locators; no OSM in the **inset/picker** (the main preview map may still load OSM — that is expected and in scope to keep).

Expected: all four surfaces render styled vector locators; the only OSM traffic anywhere is the main wizard preview.

- [ ] **Step 4: Commit**

```bash
cd ~/Documents/designer-flow-everviz
git add pages/minimap-editor.html pages/mini-map-library.html
git commit -m "chore(minimap): drop unused Leaflet/OSM from minimap-only pages; retire 110m geojson"
```

---

## Self-Review

**Spec coverage:**
- One vector engine, no OSM → Task 2 (renderer) + Task 5 (drop leaflet/osm on minimap pages). ✔
- Globe = orthographic recolorable round earth → Task 2 physical branch + Step 2 verify. ✔
- Region = plain styled, higher-res 50m, framed, colour-driven, no highlight → Task 1 (50m data) + Task 2 political branch + Step 3 verify. ✔
- Fixed Globe + Region; remove "+ Add level"; delete Country/Continent/City → Task 4. ✔
- Scope: minimap only; main preview untouched → Global Constraints + Task 3/5 explicitly preserve `template-creator.html` leaflet/osm. ✔
- Picker/library thumbnails via preserved API → Tasks 3 & 5 verify (minimap-thumbs.js unchanged). ✔

**Placeholder scan:** No TBD/TODO; every code step shows full content. ✔

**Type consistency:** `render(el, level, view)` and `schemaOf(level)` preserved verbatim from the old file and used unchanged by all consumers; new `dispose(el)` mirrors the old `OsmMap.dispose(el)` signature it replaces; `el.__mmCanvas` is the single canvas handle used by both `render` and `dispose`. `view` stays `{center:[lat,lng], zoom}`. ✔

**Deviation from spec (noted):** The spec suggested adapting `GeoRegions` to d3-friendly framing; this plan instead **keeps `GeoRegions` unchanged** and interprets the existing `{center, zoom}` inside the renderer — smaller blast radius, all call sites untouched. Also folds in removing Duplicate/Remove from the rail menu (implied by a truly fixed 2-level set) — flag for user confirmation at handoff.
