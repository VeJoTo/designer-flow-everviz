# Template Wizard Tabs (Presets · Customize · stubs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build out the remaining Template-wizard tabs so the wizard works end-to-end and matches the reference images — Presets and Customize built in full, Enabled controls and Publish & Export as inert "Coming soon" stubs, and all five tabs wired together as navigable pages.

**Architecture:** One HTML file per tab (the prototype's one-file-per-screen convention). Each page carries the shared wizard chrome (wizard-bar + step-tabs + right-hand preview pane). Tabs are real links; the active tab gets `.wizard-step--active`. The left pane swaps per tab: map grid (Map), preset accordions (Presets), customize accordions (Customize), placeholder (stubs). Form controls reuse the house kit; wizard-specific styles live in `template-wizard.css` per the project's per-page-CSS convention.

**Tech Stack:** HTML5, CSS3 (custom properties), vanilla JS. No build step. Served as static files; verify visually in a browser against the reference JPGs.

**Branch:** `feat/template-wizard-step-1-map` (current) — continue here, or branch `feat/template-wizard-tabs` off it. Per the repo convention, one feature branch; commit per task.

**Source-of-truth references:**
- Issue: `#50` — Build template creator / wizard screens
- Spec: `docs/superpowers/specs/2026-05-20-designer-flow-everviz-design.md`
- Figma flow: `https://www.figma.com/design/8BEAtpEUofhQLtcCHIJ8TO/everviz-UX-2026-Vera`
  - `Template-preset` node `3:597`
  - `customize-template-wiz-1/2/3` nodes `3:294` / `3:313` / `3:333`
- Reference screenshots (on `~/Desktop/`):
  - `Template-map.jpg` (Map tab — already built)
  - `Template-preset.jpg` (Presets tab)
  - `customize-template-wiz-1.jpg` (Customize, Mini-Map collapsed-then-shown, minimap OFF)
  - `customize-template-wiz-2.jpg` (Customize, Mini-Map ON — minimap appears top-left of preview)
  - `customize-template-wiz-3.jpg` (Customize, Icon select expanded)

**Pattern sources to copy verbatim (house style):**
- Collapsible section: `pages/preset-editor.html:220-225` (Coming-soon variant), `:55-92` (open `<details class="preset-section">`)
- `.select`: `pages/preset-editor.html:30-33` + CSS `assets/css/filters.css:47-64`
- `.switch`: `pages/preset-editor.html:346-349` + CSS `assets/css/pages/preset-editor.css:684-726`
- `.color-input`: `pages/preset-editor.html:426-431` + CSS `:620-655`
- `.prop-stepper`: `pages/preset-editor.html:264-271` + CSS `:330-366`
- `.prop-row--inline`: CSS `assets/css/pages/preset-editor.css:258-280`
- Shared wizard chrome: `pages/template-creator.html:16-44` (bar + steps) and `:123-134` (preview)

---

## Design notes / decisions (already agreed with Vera)

1. **Mini-Map placement.** The references put the Mini-Map panel inside the Customize tab, so that's where it goes for this build — even though an earlier IA decision scoped the *minimap library/editor* as its own section parallel to Base-map. Those are different things: the Customize Mini-Map panel is **per-template instance config** (enable + border + size + icon), not minimap authoring. Build per the references.
2. **"Boarder" → "Border".** The Figma frames misspell it ("Boarder", "Boarder color"). This code is written fresh, so just spell it **Border** / **Border color** correctly. Not a replication of the typo.
3. **Enable control = square checkbox.** The reference draws a square checkbox for the Mini-Map enable, not the prototype's usual `.switch`. Per Vera, match the reference: build a square `.wiz-checkbox`.
4. **The four non-Mini-Map Customize sections** (Text, Interactivity, Appearance, Map layers) appear only collapsed in the references. Build them as real collapsible `<details>` with a muted placeholder body (no "Coming soon" badge — the refs don't show one). Only Mini-Map is built out.
5. **"Functional" depth = stateful.** Tab nav works; accordions open/close (native `<details>`); the Mini-Map enable checkbox shows/hides a minimap overlay in the preview (as wiz-2/3 show); Border/size/icon controls hold state and visibly affect the minimap overlay where cheap. No live map engine.

---

## File Structure

After this plan, the wizard looks like:

```
pages/
├── template-creator.html       Map tab        (exists — Task 1 wires its nav)
├── template-presets.html       Presets tab    (Task 2)
├── template-customize.html     Customize tab  (Task 3)
├── template-controls.html      Enabled controls — stub (Task 4)
├── template-publish.html       Publish & Export — stub (Task 4)
assets/css/pages/
└── template-wizard.css         + accordion / rows / checkbox / minimap-overlay / control styles (Tasks 2-3)
```

Each wizard page links, in `<head>`: `tokens.css`, `base.css`, `chrome.css`, `filters.css` (for `.select` / `.field-label`), `template-wizard.css`.
> Note: `.switch`, `.color-input`, `.prop-stepper` are added to `template-wizard.css` as verbatim mirrors of their `preset-editor.css` definitions, keeping wizard pages self-contained (they don't load `preset-editor.css`). This follows the repo's existing per-page-CSS duplication; a future `controls.css` extraction is out of scope here.

---

### Canonical shared chrome (reused on every wizard page)

Every wizard page uses this exact `<body>` skeleton. **Only two things change per page:** (a) which `.wizard-step` has `--active` + `aria-current="step"`, and (b) the right-hand jump link target/label. Copy from `template-creator.html` and swap the left pane.

```html
<body data-screen="designer-tools" data-screen-title="Template wizard"
      data-crumbs='[{"title":"Designer tools","href":"./"},{"title":"Map designer","href":"pages/map-designer.html"}]'
      data-page-mode="wizard">
  <div class="app">
    <div id="chrome" class="chrome-mount"></div>
    <main>
      <header class="wizard-bar">
        <div class="wizard-bar__left">
          <span class="wizard-bar__kicker">Template wizard</span>
          <span class="wizard-bar__sep" aria-hidden="true">|</span>
          <span class="wizard-bar__title" data-wizard-title contenteditable="true" spellcheck="false">Untitled project</span>
        </div>
        <div class="wizard-bar__actions">
          <button type="button" class="wizard-action" data-action="save-wizard">Save</button>
          <a class="wizard-exit" href="pages/map-designer.html" aria-label="Exit wizard" data-tooltip="Exit wizard">
            <img src="assets/icons/arrow-right-on-rectangle.svg" alt="" width="22" height="22" />
          </a>
        </div>
      </header>

      <nav class="wizard-steps" aria-label="Wizard steps">
        <ol class="wizard-steps__list">
          <li><a href="pages/template-creator.html"  class="wizard-step">Map</a></li>
          <li><a href="pages/template-presets.html"   class="wizard-step">Presets</a></li>
          <li><a href="pages/template-customize.html" class="wizard-step">Customize</a></li>
          <li><a href="pages/template-controls.html"  class="wizard-step">Enabled controls</a></li>
          <li><a href="pages/template-publish.html"   class="wizard-step">Publish &amp; Export</a></li>
        </ol>
        <a class="wizard-steps__jump" href="pages/base-map-editor.html">Open map editor</a>
      </nav>

      <div class="wizard-body">
        <aside class="wizard-pane wizard-pane--list">
          <!-- PER-PAGE LEFT CONTENT -->
        </aside>
        <aside class="wizard-pane wizard-pane--preview">
          <div class="wizard-preview" data-wizard-preview>
            <button type="button" class="wizard-preview__fullscreen" aria-label="Fullscreen preview" data-tooltip="Fullscreen">
              <img src="assets/icons/expand-collapse.svg" alt="" width="20" height="20" />
            </button>
            <div class="wizard-preview__stage" data-preview-stage data-stage="globe"></div>
            <div class="wizard-preview__attr">everviz | © Stadia Maps © OpenMapTiles © OpenStreetMap</div>
          </div>
          <button class="wizard-help-fab" aria-label="Help" data-tooltip="Help">
            <img src="assets/icons/question-mark-circle.svg" alt="" width="20" height="20" />
          </button>
        </aside>
      </div>
    </main>
  </div>
  <script src="assets/js/tooltip.js" defer></script>
  <script src="assets/js/chrome.js" defer></script>
  <script src="assets/js/prefetch.js" defer></script>
</body>
```

Per page: add `wizard-step--active` + `aria-current="step"` to that page's own tab.

---

## Task 1: Wire the Map tab's step navigation

The Map page (`template-creator.html`) currently has `href="#"` on the Presets/Customize/Enabled controls/Publish tabs. Point them at the real pages.

**Files:**
- Modify: `pages/template-creator.html:37-42`

- [ ] **Step 1: Replace the dead-link step list**

Replace lines 37-42 with:

```html
          <li><a href="pages/template-creator.html" class="wizard-step wizard-step--active" aria-current="step">Map</a></li>
          <li><a href="pages/template-presets.html" class="wizard-step">Presets</a></li>
          <li><a href="pages/template-customize.html" class="wizard-step">Customize</a></li>
          <li><a href="pages/template-controls.html" class="wizard-step">Enabled controls</a></li>
          <li><a href="pages/template-publish.html" class="wizard-step">Publish &amp; Export</a></li>
```

- [ ] **Step 2: Verify**

Open `pages/template-creator.html` in a browser (served from repo root, e.g. `python3 -m http.server` then `http://localhost:8000/pages/template-creator.html`). Confirm the Map tab still looks identical to `Template-map.jpg` and the four other tabs are now clickable (they'll 404 until later tasks — that's expected this step). Map tab still shows navy underline.

- [ ] **Step 3: Commit**

```bash
git add pages/template-creator.html
git commit -m "feat: wire Template wizard step tabs to real page targets (#50)"
```

---

## Task 2: Presets tab

Reference: `Template-preset.jpg`. Left pane = two collapsible sections **Markers** and **Regions**, each open, each containing one full-width **"+ Add preset"** button. Right jump link reads **"Open preset editor"** → `preset-editor.html`. Shared preview (globe).

**Files:**
- Create: `pages/template-presets.html`
- Modify: `assets/css/pages/template-wizard.css` (append accordion + add-button styles)

- [ ] **Step 1: Append shared accordion + add-preset styles to `template-wizard.css`**

Append at end of `assets/css/pages/template-wizard.css`:

```css
/* ──────────────────────────────────────────────────────────────
   Wizard left-pane accordions (Presets + Customize tabs)
   Native <details>; chevron rotates when open. Mirrors the
   preset-editor section pattern so the two read as one system.
   ────────────────────────────────────────────────────────────── */
.wiz-sections { display: flex; flex-direction: column; gap: var(--space-3); }
.wiz-section { background: transparent; }
.wiz-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  list-style: none;
  cursor: pointer;
  background: var(--color-bg-surface);
  border-radius: var(--radius-sm);
}
.wiz-section__head::-webkit-details-marker { display: none; }
.wiz-section__title {
  font-size: var(--fs-body);
  font-weight: var(--fw-bold);
  color: var(--color-text-primary);
}
.wiz-section__chev {
  filter: invert(11%) sepia(74%) saturate(2178%) hue-rotate(228deg) brightness(64%) contrast(91%);
  transition: transform var(--duration-fast) var(--ease-out);
}
.wiz-section[open] .wiz-section__chev { transform: rotate(180deg); }
.wiz-section__body { padding: var(--space-3) var(--space-4) var(--space-4); }
.wiz-section__placeholder {
  font-size: var(--fs-small);
  color: var(--color-text-muted);
}

/* "+ Add preset" full-width button */
.wiz-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  padding: 12px 18px;
  border: 1.5px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  background: var(--color-bg-surface);
  color: var(--color-text-link);
  font-weight: var(--fw-bold);
  font-size: var(--fs-body);
  cursor: pointer;
  transition: border-color var(--duration-fast) var(--ease-out),
              background var(--duration-fast) var(--ease-out);
}
.wiz-add:hover { border-color: var(--color-text-link); background: var(--color-brand-purple-soft); }
.wiz-add img { filter: invert(34%) sepia(86%) saturate(1500%) hue-rotate(228deg) brightness(95%) contrast(95%); }
```

- [ ] **Step 2: Create `pages/template-presets.html`**

Use the canonical chrome (Presets tab active, jump link = "Open preset editor"). Left pane:

```html
        <aside class="wizard-pane wizard-pane--list">
          <div class="wiz-sections">
            <details class="wiz-section" open>
              <summary class="wiz-section__head">
                <span class="wiz-section__title">Markers</span>
                <img class="wiz-section__chev" src="assets/icons/chevron-down.svg" alt="" width="20" height="20" />
              </summary>
              <div class="wiz-section__body">
                <button type="button" class="wiz-add" data-add-preset="markers">
                  <img src="assets/icons/plus.svg" alt="" width="18" height="18" /> Add preset
                </button>
              </div>
            </details>

            <details class="wiz-section" open>
              <summary class="wiz-section__head">
                <span class="wiz-section__title">Regions</span>
                <img class="wiz-section__chev" src="assets/icons/chevron-down.svg" alt="" width="20" height="20" />
              </summary>
              <div class="wiz-section__body">
                <button type="button" class="wiz-add" data-add-preset="regions">
                  <img src="assets/icons/plus.svg" alt="" width="18" height="18" /> Add preset
                </button>
              </div>
            </details>
          </div>
        </aside>
```

And set the jump link on this page to:

```html
        <a class="wizard-steps__jump" href="pages/preset-editor.html">Open preset editor</a>
```

Set the Presets tab `<a>` to `class="wizard-step wizard-step--active" aria-current="step"`. Reuse the same title-edit `<script>` block as `template-creator.html:139-181` (project-title inline edit) — copy it verbatim before the shared `<script src>` tags. (Drop the map-grid selection portion; keep only the `[data-wizard-title]` part.)

- [ ] **Step 3: Verify against `Template-preset.jpg`**

Serve and open `http://localhost:8000/pages/template-presets.html`. Confirm: Presets tab underlined navy; "Markers" and "Regions" headers each with up-chevron and an "+ Add preset" button below; jump link reads "Open preset editor"; preview shows the globe; chevrons collapse/expand on click. Compare side-by-side with `Template-preset.jpg`.

- [ ] **Step 4: Commit**

```bash
git add pages/template-presets.html assets/css/pages/template-wizard.css
git commit -m "feat: Template wizard Presets tab — Markers/Regions add-preset (#50)"
```

---

## Task 3: Customize tab

References: `customize-template-wiz-1/2/3.jpg`. Left pane = five `<details>` accordions: **Text, Interactivity, Appearance, Map layers** (collapsed, placeholder bodies) and **Mini-Map** (open, fully built). Mini-Map controls: enable checkbox, **Border** select (Off), **Border color** color-input (#123456), **Minimap size** stepper (0), **Icon** select (None). Enabling the checkbox shows a minimap overlay in the preview (top-left), matching wiz-2/3.

**Files:**
- Create: `pages/template-customize.html`
- Modify: `assets/css/pages/template-wizard.css` (append rows, checkbox, control mirrors, minimap overlay)

- [ ] **Step 1: Append control + row + checkbox + minimap-overlay styles to `template-wizard.css`**

```css
/* ──────────────────────────────────────────────────────────────
   Customize tab — labeled control rows
   ────────────────────────────────────────────────────────────── */
.wiz-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-top: 1px solid var(--color-border-subtle);
}
.wiz-row:first-child { border-top: 0; }
.wiz-row__label { font-size: var(--fs-body); font-weight: var(--fw-semibold); color: var(--color-text-primary); }
.wiz-row .select { width: auto; min-width: 96px; }
.wiz-row__value { color: var(--color-text-link); font-weight: var(--fw-semibold); }

/* Square checkbox (matches the customize reference for Mini-Map enable) */
.wiz-checkbox { position: relative; width: 22px; height: 22px; cursor: pointer; display: inline-block; }
.wiz-checkbox input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; }
.wiz-checkbox__box {
  position: absolute; inset: 0;
  border: 1.5px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  background: var(--color-bg-surface);
  display: grid; place-items: center;
  transition: background var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out);
}
.wiz-checkbox input:checked + .wiz-checkbox__box {
  background: var(--color-text-primary);
  border-color: var(--color-text-primary);
}
.wiz-checkbox__box::after {
  content: "";
  width: 6px; height: 11px;
  border: solid var(--color-text-on-dark);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg) translateY(-1px);
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out);
}
.wiz-checkbox input:checked + .wiz-checkbox__box::after { opacity: 1; }
.wiz-checkbox input:focus-visible + .wiz-checkbox__box { outline: 2px solid var(--color-text-link); outline-offset: 2px; }

/* --- Control mirrors (verbatim from preset-editor.css; wizard pages don't load that file) --- */
.color-input { display: inline-flex; align-items: center; gap: var(--space-2); }
.color-input__hex {
  width: 96px; border: 0; background: transparent;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: var(--fs-small); font-weight: var(--fw-semibold);
  text-transform: uppercase; text-align: right;
  color: var(--color-text-link); outline: none;
}
.color-input__swatch {
  position: relative; width: 22px; height: 22px; border-radius: 50%;
  border: 1.5px solid var(--color-border-subtle); cursor: pointer; overflow: hidden;
}
.color-input__swatch input[type="color"] {
  position: absolute; inset: 0; width: 100%; height: 100%; border: 0; padding: 0; opacity: 0; cursor: pointer;
}
.prop-stepper {
  position: relative; display: inline-flex; align-items: center;
  background: var(--color-bg-surface); border: 1.5px solid var(--color-border-subtle);
  border-radius: var(--radius-sm); padding: 4px 8px;
}
.prop-stepper__input {
  width: 48px; border: 0; outline: none; background: transparent;
  text-align: right; font: inherit; color: var(--color-text-primary);
  -webkit-appearance: textfield; -moz-appearance: textfield;
}
.prop-stepper__input::-webkit-outer-spin-button,
.prop-stepper__input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.prop-stepper__spinners { display: flex; flex-direction: column; margin-left: 4px; }
.prop-stepper__spinners button { font-size: 8px; line-height: 1; color: var(--color-text-link); padding: 1px 4px; cursor: pointer; background: none; border: 0; }

/* --- Minimap overlay in the preview (shown when Mini-Map enabled) --- */
.wizard-preview__stage { /* ensure overlay positions relative to stage — already position: relative */ }
.minimap-overlay {
  position: absolute;
  top: var(--space-4);
  left: var(--space-4);
  width: 132px;
  height: 132px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25) 0%, transparent 55%),
    url("../../img/maps/world.png") center/cover;
  filter: grayscale(1) contrast(1.15) brightness(0.9);
  box-shadow: inset -10px -8px 24px rgba(16, 21, 61, 0.35);
  display: none;
}
.minimap-overlay.is-on { display: block; }
.minimap-overlay[data-border="on"] { border: 2px solid var(--minimap-border-color, #123456); }
```

> Note: the overlay is a stylised stand-in (greyscale globe with the red viewport box is not engine-rendered); enabling toggles `.is-on`, the size stepper scales `width/height`, Border `on` shows the ring, and Border color sets `--minimap-border-color`. This satisfies the "stateful, visibly affects the minimap" depth without a map engine.

- [ ] **Step 2: Create `pages/template-customize.html`**

Canonical chrome with Customize tab active and the default jump link ("Open map editor" → `base-map-editor.html`, as the Customize reference shows no preset jump). Left pane:

```html
        <aside class="wizard-pane wizard-pane--list">
          <div class="wiz-sections">
            <details class="wiz-section">
              <summary class="wiz-section__head">
                <span class="wiz-section__title">Text</span>
                <img class="wiz-section__chev" src="assets/icons/chevron-down.svg" alt="" width="20" height="20" />
              </summary>
              <div class="wiz-section__body"><p class="wiz-section__placeholder">No options yet.</p></div>
            </details>
            <details class="wiz-section">
              <summary class="wiz-section__head">
                <span class="wiz-section__title">Interactivity</span>
                <img class="wiz-section__chev" src="assets/icons/chevron-down.svg" alt="" width="20" height="20" />
              </summary>
              <div class="wiz-section__body"><p class="wiz-section__placeholder">No options yet.</p></div>
            </details>
            <details class="wiz-section">
              <summary class="wiz-section__head">
                <span class="wiz-section__title">Appearance</span>
                <img class="wiz-section__chev" src="assets/icons/chevron-down.svg" alt="" width="20" height="20" />
              </summary>
              <div class="wiz-section__body"><p class="wiz-section__placeholder">No options yet.</p></div>
            </details>
            <details class="wiz-section">
              <summary class="wiz-section__head">
                <span class="wiz-section__title">Map layers</span>
                <img class="wiz-section__chev" src="assets/icons/chevron-down.svg" alt="" width="20" height="20" />
              </summary>
              <div class="wiz-section__body"><p class="wiz-section__placeholder">No options yet.</p></div>
            </details>

            <details class="wiz-section" open>
              <summary class="wiz-section__head">
                <span class="wiz-section__title">Mini-Map</span>
                <img class="wiz-section__chev" src="assets/icons/chevron-down.svg" alt="" width="20" height="20" />
              </summary>
              <div class="wiz-section__body">
                <div class="wiz-row">
                  <span class="wiz-row__label">Minimap</span>
                  <label class="wiz-checkbox">
                    <input type="checkbox" data-minimap-enable />
                    <span class="wiz-checkbox__box" aria-hidden="true"></span>
                  </label>
                </div>
                <div class="wiz-row">
                  <span class="wiz-row__label">Border</span>
                  <button class="select" data-minimap-border type="button">
                    <span class="select__value">Off</span>
                    <img src="assets/icons/chevron-down.svg" alt="" width="16" height="16" />
                  </button>
                </div>
                <div class="wiz-row">
                  <span class="wiz-row__label">Border color</span>
                  <div class="color-input">
                    <input type="text" class="color-input__hex" value="#123456" maxlength="7" data-minimap-color-hex />
                    <label class="color-input__swatch" style="background:#123456">
                      <input type="color" value="#123456" aria-label="Minimap border color" data-minimap-color />
                    </label>
                  </div>
                </div>
                <div class="wiz-row">
                  <span class="wiz-row__label">Minimap size</span>
                  <div class="prop-stepper">
                    <input type="number" class="prop-stepper__input" value="0" min="0" max="100" data-minimap-size />
                    <span class="prop-stepper__spinners">
                      <button type="button" aria-label="Increment" data-stepper="up">▲</button>
                      <button type="button" aria-label="Decrement" data-stepper="down">▼</button>
                    </span>
                  </div>
                </div>
                <div class="wiz-row">
                  <span class="wiz-row__label">Icon</span>
                  <button class="select" data-minimap-icon type="button">
                    <span class="select__value">None</span>
                    <img src="assets/icons/chevron-down.svg" alt="" width="16" height="16" />
                  </button>
                </div>
              </div>
            </details>
          </div>
        </aside>
```

Add the minimap overlay element inside the preview stage (replace the stage line in the canonical chrome for this page only):

```html
            <div class="wizard-preview__stage" data-preview-stage data-stage="globe">
              <div class="minimap-overlay" data-minimap-overlay data-border="off"></div>
            </div>
```

- [ ] **Step 3: Add the Customize page script (before the shared `<script src>` tags)**

```html
  <script>
    document.addEventListener("DOMContentLoaded", () => {
      // Project-title inline edit (same as Map tab)
      const title = document.querySelector("[data-wizard-title]");
      if (title) {
        let before = "";
        title.addEventListener("focus", () => {
          before = title.textContent;
          const range = document.createRange();
          range.selectNodeContents(title);
          const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
        });
        title.addEventListener("keydown", (e) => {
          if (e.key === "Enter") { e.preventDefault(); title.blur(); }
          else if (e.key === "Escape") { e.preventDefault(); title.textContent = before; title.blur(); }
        });
        title.addEventListener("blur", () => {
          const v = (title.textContent || "").replace(/\s+/g, " ").trim();
          title.textContent = v || "Untitled project";
        });
      }

      const overlay = document.querySelector("[data-minimap-overlay]");

      // Enable → show/hide minimap overlay
      document.querySelector("[data-minimap-enable]")?.addEventListener("change", (e) => {
        overlay?.classList.toggle("is-on", e.target.checked);
      });

      // Border select → cycle Off/On, toggle ring on overlay
      const borderBtn = document.querySelector("[data-minimap-border]");
      borderBtn?.addEventListener("click", () => {
        const val = borderBtn.querySelector(".select__value");
        const on = val.textContent.trim() === "Off";
        val.textContent = on ? "On" : "Off";
        overlay?.setAttribute("data-border", on ? "on" : "off");
      });

      // Border color → sync hex + swatch + overlay ring color
      const hex = document.querySelector("[data-minimap-color-hex]");
      const color = document.querySelector("[data-minimap-color]");
      const swatch = color?.closest(".color-input__swatch");
      const applyColor = (v) => {
        if (!/^#[0-9a-fA-F]{6}$/.test(v)) return;
        if (hex) hex.value = v.toUpperCase();
        if (color) color.value = v;
        if (swatch) swatch.style.background = v;
        overlay?.style.setProperty("--minimap-border-color", v);
      };
      color?.addEventListener("input", (e) => applyColor(e.target.value));
      hex?.addEventListener("change", (e) => applyColor(e.target.value.trim()));

      // Size stepper → scale overlay (each unit = 2px over a 132px base)
      const size = document.querySelector("[data-minimap-size]");
      const applySize = () => {
        const px = 132 + Number(size.value || 0) * 2;
        if (overlay) { overlay.style.width = px + "px"; overlay.style.height = px + "px"; }
      };
      document.querySelectorAll("[data-stepper]").forEach((b) => {
        b.addEventListener("click", () => {
          const dir = b.dataset.stepper === "up" ? 1 : -1;
          const min = Number(size.min || 0), max = Number(size.max || 100);
          size.value = Math.max(min, Math.min(max, Number(size.value || 0) + dir));
          applySize();
        });
      });
      size?.addEventListener("change", applySize);

      // Icon select → cycle None / Pin
      const iconBtn = document.querySelector("[data-minimap-icon]");
      iconBtn?.addEventListener("click", () => {
        const val = iconBtn.querySelector(".select__value");
        val.textContent = val.textContent.trim() === "None" ? "Pin" : "None";
      });
    });
  </script>
```

- [ ] **Step 4: Verify against the three customize refs**

Serve and open `http://localhost:8000/pages/template-customize.html`.
- Matches `customize-template-wiz-1.jpg`: five accordion headers, Mini-Map open with the five rows; checkbox empty; preview globe, no minimap.
- Tick the checkbox → minimap appears top-left (matches `customize-template-wiz-2.jpg`).
- Border select toggles Off↔On (ring appears); Border color picker updates hex + swatch + ring; size stepper grows/shrinks the minimap; Icon select toggles None↔Pin (matches the expanded state in `customize-template-wiz-3.jpg`).
- Confirm label reads **Border** / **Border color** (not "Boarder").

- [ ] **Step 5: Commit**

```bash
git add pages/template-customize.html assets/css/pages/template-wizard.css
git commit -m "feat: Template wizard Customize tab — Mini-Map panel + stateful preview (#50)"
```

---

## Task 4: Stub tabs — Enabled controls & Publish & Export

No reference exists for these. Build navigable pages with the full wizard chrome and a centered "Coming soon" placeholder in the left pane, so tab nav is complete end-to-end.

**Files:**
- Create: `pages/template-controls.html`
- Create: `pages/template-publish.html`
- Modify: `assets/css/pages/template-wizard.css` (append stub-placeholder style)

- [ ] **Step 1: Append stub style**

```css
/* Stub tabs — Enabled controls / Publish & Export (not yet designed) */
.wiz-stub {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: var(--space-2); height: 100%; text-align: center; padding: var(--space-8) var(--space-4);
}
.wiz-stub__title { font-size: var(--fs-body); font-weight: var(--fw-bold); color: var(--color-text-primary); }
.wiz-stub__badge {
  font-size: var(--fs-small); font-weight: var(--fw-semibold);
  color: var(--color-text-link); background: var(--color-brand-purple-soft);
  padding: 2px 10px; border-radius: 999px;
}
.wiz-stub__sub { font-size: var(--fs-small); color: var(--color-text-muted); max-width: 240px; }
```

- [ ] **Step 2: Create `pages/template-controls.html`**

Canonical chrome, **Enabled controls** tab active, left pane:

```html
        <aside class="wizard-pane wizard-pane--list">
          <div class="wiz-stub">
            <span class="wiz-stub__badge">Coming soon</span>
            <span class="wiz-stub__title">Enabled controls</span>
            <span class="wiz-stub__sub">Choose which interactive controls appear on the published map.</span>
          </div>
        </aside>
```

Include the project-title inline-edit script (title-only portion).

- [ ] **Step 3: Create `pages/template-publish.html`**

Same as Step 2, **Publish &amp; Export** tab active, left pane:

```html
        <aside class="wizard-pane wizard-pane--list">
          <div class="wiz-stub">
            <span class="wiz-stub__badge">Coming soon</span>
            <span class="wiz-stub__title">Publish &amp; Export</span>
            <span class="wiz-stub__sub">Publish your template or export it as code, image, or data.</span>
          </div>
        </aside>
```

- [ ] **Step 4: Verify**

Serve; click through Map → Presets → Customize → Enabled controls → Publish & Export and back. Every tab loads, the active tab underlines navy, the preview pane is present on each, and the two stubs show the "Coming soon" placeholder.

- [ ] **Step 5: Commit**

```bash
git add pages/template-controls.html pages/template-publish.html assets/css/pages/template-wizard.css
git commit -m "feat: Template wizard stub tabs — Enabled controls + Publish & Export (#50)"
```

---

## Task 5: Follow-up issues & close out #50

- [ ] **Step 1: Open follow-up issues for the two stubs**

```bash
gh issue create --title "Design + build Template wizard: Enabled controls tab" \
  --body "Stub page pages/template-controls.html exists with a Coming soon placeholder. Needs a Figma design then a real control list (which interactive controls appear on the published map). Follow-up to #50."
gh issue create --title "Design + build Template wizard: Publish & Export tab" \
  --body "Stub page pages/template-publish.html exists with a Coming soon placeholder. Needs a Figma design then real publish/export actions (publish, embed code, image, data). Follow-up to #50."
```

- [ ] **Step 2: Comment on #50 with status**

```bash
gh issue comment 50 --body "Built as a tabbed editor (not a linear Next/Back wizard) to match the reference frames: Map, Presets, Customize done; Enabled controls + Publish & Export are navigable Coming-soon stubs tracked in their own follow-up issues. Note: implemented as one HTML file per tab (pages/template-*.html) sharing the wizard chrome."
```

- [ ] **Step 3: Full end-to-end verification pass**

Walk all five tabs once more against the reference JPGs. Confirm tab nav, accordions, and the Mini-Map stateful behavior. Then hand back for review / PR per the repo's branch workflow.

---

## Self-Review

**Spec coverage** (vs the agreed design notes + references):
- Map tab wired — Task 1. ✓
- Presets tab (Markers/Regions + Add preset, "Open preset editor" jump) — Task 2, matches `Template-preset.jpg`. ✓
- Customize tab (5 accordions; Mini-Map enable/Border/Border color/size/Icon; minimap appears in preview on enable) — Task 3, matches `customize-template-wiz-1/2/3.jpg`. ✓
- "Boarder"→"Border" corrected — Task 3 markup uses Border. ✓
- Square checkbox enable control — Task 3 `.wiz-checkbox`. ✓
- Enabled controls + Publish & Export inert stubs — Task 4. ✓
- Follow-up issues + #50 update — Task 5. ✓

**Placeholder scan:** No "TBD/TODO". The four non-Mini-Map Customize sections intentionally carry a visible "No options yet." body — that's the agreed design (no ref content exists), not a plan placeholder.

**Class/selector consistency:** Accordion `.wiz-section*`, rows `.wiz-row*`, checkbox `.wiz-checkbox*`, add button `.wiz-add`, stub `.wiz-stub*` are defined in Task 2/3/4 and used consistently. `.select`/`.field-label` come from `filters.css` (linked in head). `.color-input`/`.prop-stepper` are defined (mirrored) in Task 3 CSS and used in Task 3 markup. Data hooks (`data-minimap-enable/-border/-color/-color-hex/-size/-icon/-overlay`, `data-stepper`) match between the Task 3 markup and script.
