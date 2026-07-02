# Custom colour-picker component — design spec

**Date:** 2026-07-02
**Status:** Approved (brainstorm), pending implementation plan
**Prototype:** `designer-flow-everviz` (static hi-fi HTML/CSS/vanilla JS)
**Branch:** `feat/color-picker` (stacked on `feat/minimap-editor-redesign`, which introduces the minimap editor this component also enhances)
**Figma:** everviz atomic design — "Colour picker" (node `45:239`)

## Problem

Every colour control in the app uses the browser-native `<input type="color">`.
It's off-brand and, on the minimap editor, its default chrome even bled out of the
styled swatch. The design system defines a branded custom picker (Figma node
`45:239`) that should replace the native one everywhere.

## Goal

A shared, auto-enhancing colour-picker component that upgrades every `.color-input`
on any page that includes it — minimap, preset, and base-map editors at once — with
**zero changes to the consumers' existing event wiring**.

## Approach: skin over the existing inputs

Rather than a new widget API each site must adopt, the component **enhances the
existing `.color-input` markup** and preserves the existing event contracts:

- Hide the native `<input type="color">` (keep it in the DOM as the value holder).
- Turn the `.color-input__swatch` into a button that opens a **single shared popover**
  (the `confirm-dialog.js` "one element, repositioned per use" pattern).
- On any change, write the new hex back to **both** the `.color-input__hex` text input
  and the hidden native input, then **dispatch the same events consumers already
  listen for** — `change` on the hex input and `input` on the native input.

Net effect: `minimap-editor.js`, `preset-editor.html`, and `base-map-editor.html`
keep reacting exactly as they do today; only the *interaction surface* changes. No
consumer JS is rewritten. (Rejected alternatives: a first-class widget API that
requires rewiring all three consumers; styling the native picker, which browsers
don't allow.)

## Files

**Create:**
- `assets/js/color-picker.js` — the enhancer, the shared popover, HSV maths.
- `assets/css/color-picker.css` — popover + enhanced-swatch styles.

**Modify (add the two includes only):**
- `pages/minimap-editor.html`, `pages/preset-editor.html`, `pages/base-map-editor.html`
- `assets/js/minimap-editor.js` — one line: call `window.ColorPicker.enhanceAll()`
  after it renders the settings pane (its `.color-input`s are built at runtime).

## Component & auto-enhance (`color-picker.js`)

Exposed as `window.ColorPicker` with:
- `enhanceAll(root = document)` — find every `.color-input` under `root` not already
  enhanced (guard with a `data-cp-ready` flag), and enhance each.
- Auto-runs `enhanceAll()` on `DOMContentLoaded` for static pages.

**Heterogeneous markup** — the three sites don't share one shape, so the enhancer
resolves parts defensively:
- preset-editor & minimap: `.color-input__hex` + `.color-input__swatch` with a native
  `<input type="color">` inside.
- base-map-editor: a bare `<span class="color-input__swatch">` (no native input) + a
  `.prop-input--inline` text field (no `.color-input__hex`).

So: **hex field** = `.color-input__hex` else the first `input[type="text"]` in the
`.color-input`; **native input** = `.color-input__swatch input[type="color"]` (may be
absent — then there's nothing to hide and `setValue` just skips the native dispatch).

**Enhance one `.color-input`:**
1. Resolve the hex field and native input per the rules above.
2. Set the native input to `display:none` (kept for value + events).
3. Mark the swatch as a button: `role`/`tabindex` or wrap semantics, `aria-haspopup="dialog"`,
   `aria-expanded`, and seed its background from the current hex.
4. Click / Enter on the swatch → open the shared popover, seeded from the current hex,
   positioned next to the swatch.
5. Keep the hex text input working: on `change`, validate and, if the popover is open,
   re-sync its handles.

**Value write-back (single path used by popover + hex edits):**
```
setValue(colorInput, hex):
  hex = normalise(hex)                       // "#RRGGBB", lowercased
  hexInput.value = hex.toUpperCase()
  swatch.style.background = hex
  nativeInput.value = hex
  // Fire both events on both inputs so no consumer binding is missed,
  // whichever of input/change it listens to.
  for (el of [nativeInput, hexInput])
    for (type of ["input", "change"])
      el.dispatchEvent(new Event(type, { bubbles: true }))
```
This covers every event contract in use today (minimap `buildControl` binds
`picker "input"` + `hex "change"`; preset/base-map bind the analogous pair) without
the enhancer needing to know which each consumer chose.

## The popover

A single element appended to `<body>` (so editor panel `overflow` can't clip it),
~200px wide, white, `border-radius:4px`, shadow `0 1px 15px 6px rgba(0,0,0,0.06)`.

Contents (top→bottom), per Figma minus the opacity row:
- **Header** — Title = the enhanced field's own label text (nearest `.mm-field__label` /
  `.prop-label` / row label; fallback `"Colour"`), Gordita Bold `#172B4C`; **✕ close**
  button top-right.
- **Saturation/Value square** (~168×124) — background = current hue at full S/V, with two
  CSS overlays: `linear-gradient(to right, #fff, transparent)` (saturation) and
  `linear-gradient(to top, #000, transparent)` (value). A round handle sits at
  `left = S`, `top = 1 − V`.
- **Hue slider** — horizontal rainbow gradient, rounded, with a round handle for H (0–360).
- **Hex field** — grey inset box `#F7F8F8`, editable `#RRGGBB` text in `#28277E`.

**Interactions:**
- **Open** — position near the swatch with fixed coordinates; flip above if there isn't
  room below (same logic as the wizard select popovers). Seed handles + hex from current.
- **Drag** — `pointerdown` on the square or hue bar starts a drag; listen for
  `pointermove` on `document` until `pointerup`; clamp to the element's bounds; each move
  recomputes hex and calls `setValue(...)` so the app preview updates live during the drag.
- **Close** — ✕ button, outside-click, or Escape.
- **A11y** — swatch is a real button (`aria-haspopup`/`aria-expanded`); the hex field is a
  full keyboard path to any colour; Escape closes. Arrow-key nudging on handles is optional
  polish, not required.

## Colour maths (pure helpers in `color-picker.js`)

- `hexToHsv(hex) -> {h,s,v}`
- `hsvToRgb(h,s,v) -> {r,g,b}`
- `hsvToHex(h,s,v) -> "#rrggbb"`
- `rgbToHex(r,g,b) -> "#rrggbb"`
- `clamp(n,min,max)`

Standard conversions, no dependency. Typing a valid hex re-derives H/S/V and repositions
both handles; dragging updates the hex.

## Scope & fidelity

**In:**
- Real HSV picker with drag on the square + hue slider, editable hex, live write-back.
- Shared component auto-enhancing every `.color-input` on the three editor pages.
- Native picker hidden but retained; consumers untouched.

**Out / deferred:**
- **Opacity/alpha** — no opacity slider; colours stay 6-digit hex (minimap keeps its
  separate Opacity fields). (Product decision.)
- **Hover/focus hex-chip on the swatch** (the Figma "EDIT COLOR" states) — deferred polish;
  the popover already shows the hex. Can be added later without touching the value flow.
- Arrow-key handle nudging — optional.

## Edge cases

- Invalid hex typed → ignore (don't write back) until it matches `^#?[0-9a-fA-F]{6}$`;
  normalise with/without leading `#`.
- Feedback guard: `setValue` dispatches `change` on the hex input, which the enhancer
  itself also listens to (to re-sync the popover). Set an internal `applying` flag during
  `setValue` and have the hex-`change` handler no-op while it's set, so writes don't loop.
- Dynamically-created inputs (minimap) → `enhanceAll()` is idempotent via the
  `data-cp-ready` guard, safe to call on every settings re-render.
- Popover open when its source input is re-rendered/removed (minimap swaps levels) →
  closing on outside-click/level-select handles it; the popover reads/writes by reference
  captured at open time, and a stale write is harmless (guard: if the source input is no
  longer in the DOM, close without writing).

## Success criteria

- Clicking any colour swatch across minimap / preset / base-map editors opens the branded
  popover, not the native picker.
- Dragging the square/hue updates the swatch, the hex field, and the app's live preview.
- Typing a hex updates the popover; the popover updates the hex.
- No consumer JS changed except the one `enhanceAll()` call in the minimap editor.
- The native picker chrome never appears.
