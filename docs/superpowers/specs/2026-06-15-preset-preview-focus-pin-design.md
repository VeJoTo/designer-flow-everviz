# Preset editor — focus-by-default preview with pin-to-compare

**Date:** 2026-06-15
**Status:** Approved (design), pending implementation
**Page:** `pages/preset-editor.html` (preview + left-list interaction)

## Problem

In the preset editor, visibility and selection are decoupled. Clicking a
preset row *selects* it (drives the properties panel) and auto-shows it in
the preview, but never hides the previously-shown presets. So the preview
silently **accumulates** every preset the user clicks, cluttering the map
even when they only meant to inspect/edit one. The eye toggle is the only
thing that removes a preset, so users end up with a pile-up they didn't ask
for.

Primary use is **editing and creating presets one at a time**, with
**occasional side-by-side comparison**. The current model optimises for the
rare case (compare) at the expense of the common one (focus).

## Design

### Core rule

> **Preview = the preset currently being edited (selected) ∪ the set of
> pinned presets.**

- Clicking a row makes it the edited preset and shows **just that one**
  (plus any pins). The previously-edited, unpinned preset drops out of the
  preview automatically — no more accumulation.
- The selected preset is **always** shown (editing implies previewing), so
  the preview is never mysteriously empty and you can't lose the thing
  you're working on.
- Comparison is opt-in: pin A, then select B → both show. Unpin to drop one.
  Pins are not kind-restricted (a marker and a region can be compared).

### The control (eye, relabelled)

The existing per-row eye button changes meaning from **show/hide** to
**keep in preview** (pin):

- **Eye open** = pinned (kept in the preview regardless of selection).
- **Eye-slash** = not pinned (only appears in the preview while selected).
- Tooltip: "Keep in preview" (when unpinned) / "Pinned" (when pinned).
- No new icon asset (chosen over a pushpin to avoid adding art).

Accepted wrinkle: the selected preset is shown even when its eye reads
"off" (unpinned), because it's the one being edited. This is the trade-off
of keeping the eye glyph.

### Visual states

- **List rows:** selected row keeps its existing `--selected` highlight;
  pinned rows are indicated by the open-eye icon. The blanket dimming that
  today marks "hidden" rows is dropped — "not in the preview" is now the
  normal resting state for most rows, so dimming them all would be noise.
- **Preview:** the pin/icon/label/region for the **edited** preset gets a
  subtle ring/halo (`is-editing` modifier) so that, when several are shown
  side by side, the user can always tell which one reflects their live
  edits.

### Edge cases

- **New preset:** becomes selected → previews solo, not auto-pinned.
- **Delete:** a deleted preset leaves the preview cleanly whether it was
  pinned and/or selected.
- **Type filter:** filtering the *list* does not disturb the preview — a
  pinned preset stays previewed even when its type is filtered out of the
  list.
- **Default on load:** nothing pinned; the initially-selected marker shows
  solo with the editing highlight; all eyes render as eye-slash (unpinned).

## Implementation notes (orientation, not prescriptive)

Concentrated in the `DOMContentLoaded` script of `pages/preset-editor.html`
plus a little CSS:

- Introduce a **pinned** state in place of the current "hidden" meaning
  (e.g. a `preset-item--pinned` class; the eye reflects it).
- `renderPins()`: render set becomes `{ selected row } ∪ { .preset-item--pinned }`
  instead of "all not-hidden". Add the `is-editing` modifier to the
  selected preset's preview element.
- `selectItem()`: drop the auto-unhide block; simply set `--selected` and
  re-render the preview so the new selection shows and the old unpinned one
  leaves.
- Eye toggle handler: toggle `--pinned` (not `--hidden`), swap the eye/
  eye-slash glyph + tooltip accordingly, re-render, re-serialize.
- `serialize()` / persistence: store the pinned set rather than the hidden
  set.
- CSS: add `is-editing` ring/halo for `.preset-map__pin/__icon/__textlabel/
  __region`; remove/repurpose the dimmed `.preset-item--hidden` list styling.
- Migrate initial markup: rows currently marked `preset-item--hidden`
  become plain (unpinned); eyes default to eye-slash; keep one row
  `--selected`.

## Acceptance

- Clicking a preset shows only it in the preview (plus any pinned), and the
  previously-edited unpinned preset is no longer shown.
- The eye toggle pins/unpins a preset (kept in preview across selections),
  with updated glyph + tooltip.
- The edited preset is visually distinguished in the preview when shown
  alongside pinned presets.
- New/deleted/filtered presets behave per the edge cases above.

## Out of scope

- A separate "Compare" mode or multi-select gesture.
- A dedicated pushpin icon asset.
- Changes to how preset *positions* (`data-pin-x/y`) are assigned.
