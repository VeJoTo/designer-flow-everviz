# Minimap editor redesign — design spec

**Date:** 2026-07-02
**Status:** Approved (brainstorm), pending implementation plan
**Prototype:** `designer-flow-everviz` (static hi-fi HTML/CSS/vanilla JS + `SavedMaps` localStorage)

## Problem

The current minimap editor (`pages/minimap-editor.html`) is a full Maputnik-style
**layer** editor — a Layers pane listing raw map layers (background, water, ocean,
lake, waterway, building…), a Paint Properties + Filter panel, and a map preview.
Stakeholder feedback: it is **too complicated**. It exposes low-level map-style
internals to a designer who just wants a good-looking locator inset.

## Goal

Replace the layer editor with a **curated preset editor sectioned by zoom/height
level**. A minimap preset holds a small stack of styled **levels** (Globe → Country
→ Region). Each level exposes only a handful of curated controls; the raw
map-style power moves behind an Advanced escape hatch. Levels are grouped within a
single preset so it reads as "one minimap, styled at several zooms."

## Core model

**One preset = a stack of levels, each styled. The template picks one level as the
default to display and can optionally "allow zoom" across the rest.**

This unifies the meeting notes:
- "Design the different levels within the same preset, grouped" → the editor's level rail.
- "Allow zoom" gains concrete meaning: it lets the reader move between the levels the
  designer styled.
- The simple case stays simple: a designer may style just one level; the template
  shows it. Styling more levels is optional and additive.

### Levels

Start with **three** levels, ordered far→near: **Globe → Country → Region**.
This is a *starting set, not a cap* — an "+ Add level" affordance can insert
Continent or City. The rationale for not shipping a fixed 5-tier list: continent /
country / region / city all *look* alike in a locator (filled land + borders +
highlight); only the zoom differs. The visual regime changes just twice — physical
vs political — so we build **two field schemas**, not five:

- **Physical schema** (Globe): Water · Land · Background
- **Political schema** (Country, Continent, Region, City): Land/fill · Stroke
  (colour + width) · Opacity · Background

A level's *type* determines which schema it renders. Country/Continent/City reuse
the Political schema with no bespoke fields.

## Editor anatomy (`pages/minimap-editor.html`)

Three panes, left→right:

### ① Level rail (left)
- Vertical "zoom ladder" ordered far→near. Each row: a tiny live thumbnail, the
  level name, and a selected-state highlight.
- One level carries a **Default** pill — the level a template shows before anyone
  customizes it, so a freshly-added preset looks right immediately.
- Per-row overflow (⋯) menu: **Rename**, **Duplicate**, **Remove**.
- **+ Add level** at the bottom opens a small menu (Globe / Continent / Country /
  Region / City); the new level slots into the ladder at the correct zoom position.

### ② Settings (center)
- Curated fields for the **selected level only** (progressive disclosure — the user
  never sees every level's controls at once).
- Field set is driven by the level's schema (Physical vs Political, above).
- Bottom: a collapsed **▸ Advanced · Use custom style** disclosure → upload/pick a
  Maputnik `.json`. When set, it **overrides the curated fields for that level only**,
  and the panel shows a "Custom style in use · Clear" note. (Stubbed in the
  prototype — records filename only; see Scope.)

### ③ Preview (right)
- Renders the **selected level** — globe framing (disc) vs region framing
  (silhouette) — live-updating as fields change, with a caption ("Previewing: Globe").
- Selecting a level in the rail swaps settings **and** preview together, so the two
  always agree (spatial continuity).

The net change: ~3–4 curated controls per level instead of a raw layer tree; full
power preserved behind Advanced.

## Template side (`pages/template-creator.html` → Customize → Minimap panel)

The panel already exists but styles the minimap *inline* today (Border, Border
colour, Border thickness). Because styling now lives in the **preset's levels**, those
inline controls are **removed** and the panel becomes about choosing and placing a
preset:

- **Minimap preset** — picker to choose a saved preset (meeting-notes "Step 2: add
  preset", reusing the existing picker-modal pattern). Empty state: "No minimap yet —
  choose a preset."
- **Show minimap** — on/off (unchanged).
- **Level** — dropdown of *that preset's* levels (Globe / Country / Region),
  defaulting to the preset's Default. Makes the levels usable at template time.
- **Allow zoom** — toggle. Off = static locator at the chosen level; on = reader can
  zoom across the preset's other designed levels.
- **Size** — unchanged.
- **Placement** — corner picker (top-left / top-right / bottom-left / bottom-right);
  moves the overlay in the preview.
- **Icon** — marker at the focus point (None / Pin / Dot / Star), unchanged.

Result: the template panel stops overlapping the editor. **Editor = how the minimap
looks (per level); template = which preset, which level, where, how big.** No
duplicated styling controls.

**Consequence:** removing Border colour/thickness from the template supersedes issue
#130 — the border now comes from the preset's Political stroke, so that dropdown is
retired entirely rather than extended. (#130 is already closed; this is the cleaner
resolution.)

## Library card (`pages/mini-map-library.html`)

Each card represents a preset. Thumbnail shows the **Default level**, plus a small
**"N levels"** count badge so multi-level presets are distinguishable at a glance.
Duplicate / Edit / Favorite / Delete, tags, search, and sort stay as-is.

## Data model (`assets/js/saved-maps.js`)

The `minimap` bucket already exists. Rich level data uses the **snapshot model**
(`replaceAll` + a `serialize`/`hydrate` pair), exactly like the preset editor, rather
than the light `{id,name,created,thumb}` card entry.

A saved minimap preset entry:

```js
{
  id, name, created, thumb,          // card fields (thumb = default level's render)
  defaultLevelId,                    // which level the template shows by default
  levels: [
    {
      id,
      type: "globe" | "continent" | "country" | "region" | "city",
      name,                          // editable display name
      schema: "physical" | "political",
      settings: {                    // keys per schema
        // physical: water, land, background
        // political: land, strokeColor, strokeWidth, opacity, background
      },
      customStyle: null | { filename }  // Advanced/Maputnik override (stub)
    }
  ]
}
```

Editing an existing preset hydrates from `?id` (mirrors the preset editor's edit flow).

## Scope & fidelity (static prototype)

**Real (interactive):**
- New 3-pane editor markup replacing the layer editor in `minimap-editor.html`.
- Level rail: select-to-edit, add / duplicate / remove / rename, set Default.
- Two field schemas (Physical, Political); colour / stroke / opacity edits
  live-update the preview via CSS variables.
- Preview: representative CSS/SVG rendering (globe disc; region silhouette with fill
  + stroke + opacity + bg). Not a real map engine.
- Save: persist to `SavedMaps` `minimap` bucket via snapshot model; hydrate on `?id`.
- Template Customize → Minimap: Preset picker + Level dropdown + Allow zoom + Size +
  Placement + Icon; Level options populate from the chosen preset; Placement moves the
  overlay in the preview.
- Library card: default-level thumbnail + "N levels" badge from SavedMaps.

**Stubbed / representative:**
- Advanced → Maputnik: file input records a filename and shows "Custom style in use ·
  Clear"; no style parsing or rendering.
- Preview is stylized, not a live tile render.
- "Allow zoom" is stored only; no live zoomable reader inset is built.
- Continent / City reuse the Political schema (no bespoke fields).

**Out of scope:**
- Real geodata / region boundaries (the region shape is representative).
- Published-embed / reader-facing runtime behavior.

## Implementation gotchas

- Preview SVG `mask-image` pins do **not** render over `file://` in Chrome — must
  serve over HTTP (`python3 -m http.server 8777`). Where reliable, bake colour into
  the SVG and use a plain `<img>` instead of a CSS mask.
- Browser caches HTML/JS hard — hard-reload (⌘⇧R) after edits.
- Follow the repo's feature-branch-per-issue workflow; open a PR, don't commit to
  `main` directly.

## Success criteria

- A designer can create a multi-level minimap preset without ever seeing a raw map
  layer, save it, reopen it, and see their levels restored.
- The zoom-ladder makes the level hierarchy legible at a glance (far→near).
- A template can pick a preset, choose a level, place it in a corner, size it, set an
  icon, and toggle allow-zoom — with no styling controls duplicated from the editor.
- The editor reads as clearly simpler than the Maputnik layer editor it replaces.
