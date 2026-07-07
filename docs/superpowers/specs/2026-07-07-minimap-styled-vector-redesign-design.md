# Minimap styled-vector redesign (drop OSM)

Date: 2026-07-07
Status: Design — approved in brainstorming, pending spec review
Builds on: branch `feat/live-osm-maps` (local-only). Keeps that branch's **main
wizard preview** OSM map; replaces its **minimap** rendering entirely.

## Problem

On `feat/live-osm-maps` the minimap renders with two different engines:

- **Globe (physical)** → raw OpenStreetMap raster tiles via Leaflet.
- **Region / political** → coarse Natural Earth **110m** country polygons
  (~10k points for the whole world) via Leaflet canvas.

This produces three concrete defects, all visible in the minimap editor:

1. **The "Globe" is not a globe.** It's a flat, zoomed-out OSM street map framed
   on Europe/Africa. Nothing about it reads as a round earth.
2. **The Globe's colour controls are dead.** Water / Land / Background sit in the
   panel, but raw tiles can't be recoloured, so the controls do nothing on the
   one level users most want to brand.
3. **The Region reads as broken.** Blobby 110m shapes zoomed onto an arbitrary
   crop, with a stray white "background" wedge cutting through. It doesn't
   resemble any recognizable place.

Plus the OSM attribution and generic cartography read as a placeholder, not a
branded everviz locator.

## Goal

The minimap is a **fully branded, designer-styled locator**. Every level renders
as clean, recolorable vector shapes driven by the level's own colour controls.
No OSM, no tiles, no attribution, no external network calls.

## Scope

**In:** the minimap only — editor preview, wizard overlay inset, picker
thumbnails, library card thumbnails.

**Out:** the big wizard preview map behind the chart (keeps its current live-OSM
map — decided minimap-only for now); the Advanced "custom Maputnik style" escape
hatch (stays a stub); any focus/highlight locator styling or new schema colour.

## Design

### 1. One vector renderer (d3-geo)

Replace both engines with a single renderer built on **vendored d3-geo** (UMD,
no CDN, no key). It draws each level from Natural Earth GeoJSON:

- **SVG** for the editor preview and wizard overlay inset (crisp, few shapes).
- **Canvas** for picker/library thumbnails (many small instances — perf).

`minimap-render.js` is rewritten: the OSM-tile branch and the Leaflet-geoJSON
branch both go away. Leaflet is no longer used by the minimap at all (it remains
vendored and in use only by the out-of-scope main preview).

### 2. Globe level — physical schema (Water / Land / Background)

Rendered with an **orthographic projection** = a real round earth:

- A disc filled with the **Water** colour (the sphere/sea).
- Land polygons (Natural Earth **land 50m**) filled with the **Land** colour.
- Sitting on the **Background** colour.
- A subtle sphere outline; no graticule by default (keep it clean).

The colour controls now fully drive the globe.

### 3. Region level — political schema (Land / Stroke / Opacity / Background)

Plain styled locator (no highlight — confirmed), fixing all three region defects:

- **Recognizable geometry** — higher-resolution admin-0 country borders
  (Natural Earth **50m**) instead of the 110m blobs.
- **Proper framing** — projection fitted to the region's bounding box so the
  frame fills edge-to-edge; no stray Background wedge.
- **Styled** — Land fill + Stroke (colour + width) at Opacity, over Background
  (the sea). Region derived from the map's location via `GeoRegions`, with a
  sensible default framing in the editor (which has no map-location context).

### 4. Fixed levels: Globe + Region

- Remove the **"+ Add level"** button and its menu.
- Remove the **Country / Continent / City** level types from the model and any
  type pickers.
- A minimap is always exactly **Globe + Region**.
- Customize → Minimap "Level" control (Globe / Region / **All levels**) is
  unchanged; the "All levels" default is retained.

## Data / assets

- Vendor **d3-geo** (+ the minimal d3 deps it needs) under `assets/vendor/d3/`.
- Add Natural Earth **50m** land + admin-0 countries under `assets/vendor/geo/`,
  properties trimmed to keep file size down. Retire the 110m file once unused.
- Adapt `GeoRegions` to supply d3-friendly framing (center + rotation/scale, or
  a bounding box) instead of Leaflet center+zoom.

## Affected files

- `assets/js/minimap-render.js` — rewrite: d3 renderer; remove OSM + Leaflet branches.
- `assets/js/minimap-model.js` — levels fixed to globe + region; drop other types.
- `assets/js/minimap-editor.js` — remove "+ Add level" UI + handler.
- `assets/js/minimap-thumbs.js` — canvas thumbnails via the new renderer.
- `assets/js/geo-regions.js` — d3-friendly framing.
- `template-wizard.js` — `MINIMAP_DEFAULTS` levels = globe + region; drop
  references to removed types. Picker / hydrate otherwise unaffected.
- `assets/vendor/d3/*`, `assets/vendor/geo/*` — new / replaced assets.
- `assets/js/osm-map.js` — unchanged (still used by the main preview).

## Verification

Serve on a **fresh port** (Chrome caches page JS hard). Verify in-browser across
all four minimap surfaces:

- Editor preview — Globe is a round disc and Water/Land/Background drive it;
  Region is recognizable, framed edge-to-edge, and Land/Stroke/Opacity/Background
  drive it.
- Wizard overlay inset — follows the selected level (All levels → globe,
  Region → region).
- Picker thumbnails and library card thumbnails — styled locators, no blobs.

Confirm: no OSM attribution anywhere in the minimap, no external network requests
for the minimap, no "+ Add level", no Country/Continent/City.

## Risks / notes

- Vendoring d3-geo + higher-res geometry adds weight; mitigate by using **50m**
  (not 10m) and trimming GeoJSON properties.
- Region framing needs a sane default in the editor (no map-location context there).
- This redesign moots the branch's open review finding #2 (picker leaks a Leaflet
  map per card) — the picker no longer uses Leaflet. Finding #1 (main preview
  hydrate recenter) is about the out-of-scope main preview and still stands.
