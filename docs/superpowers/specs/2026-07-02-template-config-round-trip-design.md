# Template config round-trip — design spec

**Date:** 2026-07-02
**Status:** Approved (brainstorm), pending implementation plan
**Prototype:** `designer-flow-everviz` (static hi-fi HTML/CSS/vanilla JS)
**Branch:** `feat/template-round-trip` (stacked on `feat/minimap-editor-redesign`, whose
minimap template-panel state this feature restores)

## Problem

Saving a template writes only `{id, name, thumb}` and editing one restores only the
title (`?name`). Every wizard choice — map, minimap config, added presets, control
availability, export presets — resets to defaults on re-open. The template "editor"
doesn't actually round-trip its own configuration.

## Goal

Persist the whole wizard state into the saved template and restore it on edit, so
editing a template reopens it exactly as it was saved. Reuse the minimap editor's
`serialize()`/`hydrate()` snapshot pattern; touch the wizard's controls as little as
possible.

## Approach: serialize-from-DOM / hydrate-to-DOM

Two functions appended inside the existing wizard IIFE (`assets/js/template-wizard.js`),
mirroring the minimap editor:

- `serializeWizard()` reads each control's current value straight from the DOM into a
  `config` blob.
- `hydrateWizard(config)` writes each value back **and re-applies its side-effect**
  (reveal minimap rows, move the overlay, set the marker, rebuild the preset/export
  lists), running after the wizard's own init so it overrides defaults.

No central state-model rewrite (rejected: too invasive for a working DOM-driven wizard).
No per-consumer widget API. The two functions live next to the wiring so they can call
existing helpers.

## Reference model (presets)

Templates reference presets **by id** (+ a cached name for display / fallback):

- **Minimap preset** carries a real id (the wizard resolves the picked preset into
  `chosenPreset`, which has `.id`). On restore: look it up in `SavedMaps.list("minimap")`.
  - **found** → use the live preset (so later edits to it flow into the template).
  - **missing** → show `"<presetName> (unavailable)"` in the preset control (muted),
    leave the level menu empty, prompt a re-pick. Never crash.
- **Marker/region presets** (Presets tab) come from a hardcoded demo list and have no
  SavedMaps id, so they key on **name**; restore recreates the display chips by name.
- **Export presets** are self-contained values (defined inline per template) — no
  reference, always restore.

## Data shape

The template entry gains a `config`:

```js
{
  id, name, created, thumb,        // thumb derived from the selected map (see Save wiring)
  config: {
    version: 1,
    map:      { pick: "<selected map's data-thumb>" | null },
    minimap:  { enabled, presetId, presetName, level, allowZoom, size, placement, icon },
    presets:  { markers: [name…], regions: [name…] },
    controls: { <key>: { on: bool, opts: [bool…] }, … },   // key per Controls section
    export:   { presets: [{ name, platform, width, height }], defaultName }
  }
}
```

`controls[key].opts` is an **ordered boolean array** (not hardcoded field names) — DRY
and resilient if a section's sub-options change.

## `serializeWizard()` — read each tab

- **Map** — the selected map button (`.map-pick--selected` → its `data-thumb`); `null`
  if none. → `config.map.pick`.
- **Minimap** —
  - `enabled` = `[data-minimap-enable]`.checked
  - `presetId` / `presetName` = resolved `chosenPreset` `.id` / `.name` (null if unset)
  - `level` = the level menu's selected option `[data-minimap-level-menu] .is-selected`'s
    `data-level-id`
  - `allowZoom` = `[data-minimap-allow-zoom]`.checked · `size` = `[data-minimap-size]`.value
  - `placement` = the placement menu's selected option `[data-minimap-placement-menu]
    .is-selected`'s `data-placement` (its markup marks `tl` selected by default, so this
    is reliable even before the user changes it — more so than the overlay's
    `data-placement`, which is absent until first change)
  - `icon` = the icon menu's selected option's `data-icon-type`
- **Presets** — for the markers container and the regions container, collect each
  `.wiz-preset-item__name` text → `config.presets.markers[]` / `.regions[]`.
- **Controls** — walk each Controls section: record its header `[data-control-toggle]`.checked
  plus its sub-option checkboxes **in DOM order**. Sections are keyed by a new
  `data-control-key="text|features|interactivity|appearance|mapLayers"` attribute added to
  each section header (one-line markup touch). → `config.controls[key] = { on, opts }`.
- **Export** — iterate `[data-export-preset]` cards for `{name, platform, width, height}`;
  `defaultName` = the default menu's selected `data-default-name`. → `config.export`.

## `hydrateWizard(config)` — write back + re-apply side-effects

- **Map** — find the `[data-map-pick]` whose `data-thumb` matches `config.map.pick`; apply
  the selected class + set the preview stage (reuse the existing map-pick selection path).
- **Minimap** — set `enabled` and trigger the dependent-row reveal; resolve the preset
  (found → set `chosenPreset` + fill level menu + select `config.level`; missing → muted
  "(unavailable)" + empty level menu); then apply `allowZoom`, `size`, `placement` (value
  **and** `overlay.data-placement`), `icon` (value **and** call the existing `setMinimapIcon`).
- **Presets** — for each saved name, recreate a `.wiz-preset-item` chip in the right
  section via a shared `addPresetItem(section, name)` helper factored out of the current
  add handler.
- **Controls** — for each `config.controls[key]`, find the section by `data-control-key`,
  set the header toggle (re-apply its enable/dim side-effect), then set each sub-checkbox
  by index.
- **Export** — clear `[data-export-list]`, then for each saved preset call the existing
  add-card routine and populate name/platform/width/height; finally select `defaultName`.

## Save wiring

Replace the light `persistSave` (`template-wizard.js:346`, currently
`SavedMaps.save("template", {id, name, thumb})`):

- Build `{ id, name, created, thumb, config: serializeWizard() }`.
- Persist via `SavedMaps.replaceAll("template", list)` (snapshot model, like the minimap
  editor) so the rich `config` survives; keep the card fields so `saved-templates.js`
  still renders cards.
- Derive `thumb` from `config.map.pick` (the selected map's image) so the template card
  shows the chosen map instead of the hardcoded `north-europe.png`.

Edit entry: on load, read `?id`; if it resolves to a saved template with a `config`,
call `hydrateWizard(config)` after the wizard's own init.

## Scope & fidelity

**In:** full round-trip of Map, Minimap, Presets, Controls, Export; reference-by-id for
the minimap preset with graceful "unavailable" fallback; thumb-from-map.

**Out / deferred:**
- The Customize "No options yet" sections (Text/Interactivity/Appearance/Map layers
  panels) have no controls — nothing to persist.
- Marker/region presets are recreated as display chips by name; not marked "unavailable"
  if their underlying preset is gone (cosmetic only — optional later).
- No migration of pre-existing light template entries (they simply have no `config` →
  hydrate is a no-op, wizard shows defaults; saving upgrades them).

## Edge cases

- `?id` with no matching template, or a matching entry with no `config` → skip hydrate,
  leave wizard at defaults (no throw).
- Minimap preset id missing → "(unavailable)" fallback (above).
- Empty presets/export lists → serialize `[]`; hydrate creates nothing.
- Hydrate order: run after the wizard finishes wiring its controls so listeners exist and
  side-effects (reveal/overlay/marker) apply correctly.

## Success criteria

- Configure a template across all five tabs, Save, reopen via Edit (`?id`) → every tab is
  restored exactly (map, minimap incl. level/placement/icon, preset chips, control
  checkboxes, export cards + default).
- A template referencing a since-edited minimap preset reflects the edit; one referencing
  a since-deleted preset shows "(unavailable)" and prompts a re-pick without breaking.
- The template card thumbnail shows the selected map.
- No wizard control's existing behaviour regresses.
