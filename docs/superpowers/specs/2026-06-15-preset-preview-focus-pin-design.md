# Preset editor — preview hidden by default, edited preset shown, Show to compare

**Date:** 2026-06-15
**Status:** Built
**Page:** `pages/preset-editor.html` (preview + left-list interaction)

## Problem

In the preset editor, clicking a preset row to inspect/edit it also showed
it in the preview and **never hid the previously-shown presets**, so the map
silently accumulated every preset the user touched. Primary use is editing
and creating presets one at a time.

(Earlier iterations explored a "pin to preview" control and a "Show all"
compare mode — both rejected: the pin overloaded the eye and still
accumulated, and there is no real use case for viewing every preset at once.)

## Design

**Presets are hidden by default. The preview shows the preset you're editing,
plus any you've explicitly toggled visible to compare against.**

- **Hidden by default** — on load nothing is shown except the one preset that
  is selected (being edited).
- **The edited preset is always shown** — selecting a row makes it the edited
  preset and previews it; the previously-edited preset returns to hidden
  (unless it was explicitly toggled visible). No accumulation.
- **Per-row Show/Hide eye** — default Hidden (eye-slash, tooltip "Show").
  Press it to bring a preset into the preview alongside the one you're
  editing, for side-by-side comparison; press again to hide.
- **Truthful eyes** — a preset that is in the preview (because it's being
  edited *or* explicitly shown) reads the open eye / "Hide"; a hidden,
  unedited preset reads eye-slash / "Show". The eye always reflects what's
  actually on the map.

This keeps the familiar Show/Hide eye semantics; the only change from the
original is that **selecting a preset no longer permanently un-hides it**, so
the preview stays focused on what you're editing instead of piling up.

## Implementation

All in `pages/preset-editor.html`:

- `renderPins()` renders `{ rows not hidden } ∪ { selected row }` — the edited
  preset is always included.
- `selectItem()` no longer un-hides the selected row; it just re-renders the
  preview and calls `refreshEyes()`.
- `refreshEyes()` (new) sets every row's eye icon/label from
  `selected || !hidden`.
- The eye toggle handler flips `preset-item--hidden`, then
  `renderPins()` + `refreshEyes()` + `serialize()`.
- Seed markup: the first marker starts `preset-item--hidden` (shown only via
  selection); `makeRow()` creates new presets hidden too.

## Acceptance

- On load only the edited preset is shown; all others hidden.
- Clicking a preset swaps the preview to it; the previous one hides unless
  explicitly shown.
- The eye shows/hides a preset for comparison and always reflects real
  visibility.

## Out of scope

- A "Show all" / compare-everything mode.
- A separate pin control.
