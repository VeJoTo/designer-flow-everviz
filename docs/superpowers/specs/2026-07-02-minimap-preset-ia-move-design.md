# Move minimap-preset choice to the Presets tab — design spec

**Date:** 2026-07-02
**Status:** Approved (brainstorm), small IA change
**Prototype:** `designer-flow-everviz`
**Branch:** `feat/minimap-preset-ia` (stacked on `feat/template-round-trip`)

## Problem / goal

The minimap **preset** is currently chosen inside Customize→Minimap, mixing "which
preset" with "how this instance is configured". Move preset selection to the **Presets**
tab (next to Markers/Regions), and reorder the wizard so **Presets comes before
Customize** — so the flow is "pick your presets, then customize the instance".

## Changes (relocation + reorder only — no behaviour rewrite)

1. **Remove** the Preset row from the Customize→Minimap panel
   (`pages/template-creator.html` lines ~170–176: the `.wiz-row` holding
   `[data-minimap-preset-trigger]` / `[data-minimap-preset-value]`).

2. **Add a "Minimap" section** to the Presets tab (`data-panel="presets"`), after
   Markers and Regions, as a `<details class="wiz-section" open>` whose body holds the
   **same** preset picker control (single-select — a minimap uses one preset):
   ```html
   <details class="wiz-section" open>
     <summary class="wiz-section__head">
       <span class="wiz-section__title">Minimap</span>
       <img class="wiz-section__chev" src="assets/icons/chevron-down.svg" alt="" width="20" height="20" />
     </summary>
     <div class="wiz-section__body">
       <div class="wiz-row">
         <span class="wiz-row__label">Preset</span>
         <button class="select" type="button" data-minimap-preset-trigger aria-haspopup="dialog">
           <span class="select__value select__value--placeholder" data-minimap-preset-value>Choose a preset</span>
           <img src="assets/icons/chevron-down.svg" alt="" width="16" height="16" />
         </button>
       </div>
     </div>
   </details>
   ```
   Note: no `data-minimap-dependent` here — the picker is always visible in Presets
   (independent of the Customize on/off toggle).

3. **Customize→Minimap keeps** on/off, **Level**, allow-zoom, size, placement, icon. The
   Level dropdown still fills from the chosen preset — the picker sets the shared
   `chosenPreset` and calls `fillLevelMenu` (targets `[data-minimap-level-menu]`, still in
   Customize); this works cross-tab because both elements live in the DOM regardless of the
   active tab.

4. **Reorder tabs** to Map · Presets · Customize · Controls · Publish:
   - swap the two `<a class="wizard-step">` nav links (Customize ↔ Presets) in
     `pages/template-creator.html` (~lines 40–41);
   - reorder the `TABS` array in `assets/js/template-wizard.js` (line 9) to
     `["map", "presets", "customize", "controls", "publish"]`.

## Why it's low-risk

- The picker wiring is selector-based (`document.querySelector("[data-minimap-preset-trigger]")`),
  so it keeps working once relocated — no JS logic change.
- The round-trip (#152) serializes/hydrates the minimap preset via `chosenPreset` and the
  Level menu, both untouched here — it keeps working.
- Panels render by `data-panel` (not DOM order), so only the nav-link order + `TABS` array
  drive the visible tab sequence.

## Scope

**In:** the four changes above. **Out:** any change to Level/allow-zoom/size/placement/icon
behaviour; any change to markers/regions; any change to the minimap editor or the picker
modal itself.

## Verification

Serve over HTTP (fresh context / hard reload):
- Tab order reads Map · Presets · Customize · Controls · Publish.
- Presets tab shows Markers, Regions, **Minimap** (with the "Choose a preset" picker).
- Customize→Minimap no longer shows a Preset row; on/off, Level, allow-zoom, size,
  placement, icon remain.
- Pick a minimap preset in Presets → switch to Customize → the Level dropdown is populated
  from that preset. Save → reload `?id` → the preset + level restore (round-trip intact).
