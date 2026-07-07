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
    if (el && el.__mmRO) { el.__mmRO.disconnect(); el.__mmRO = null; }
    el && (el.__mmPending = null);
    if (el && el.__mmCanvas) {
      el.__mmCanvas.remove();
      el.__mmCanvas = null;
    }
  }

  async function render(el, level, view) {
    if (!el || !global.d3 || !d3.geoPath) return;
    const token = (el.__mmToken = (el.__mmToken || 0) + 1);

    // If the element isn't laid out yet (e.g. a thumbnail rendered into a modal
    // card before it's shown), draw nothing now and re-render once it gains a
    // real size. Elements that already have size fall straight through.
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) {
      el.__mmPending = { level, view };
      if (!el.__mmRO && typeof ResizeObserver !== "undefined") {
        el.__mmRO = new ResizeObserver(() => {
          const r = el.getBoundingClientRect();
          if (r.width >= 2 && r.height >= 2 && el.__mmPending) {
            const p = el.__mmPending;
            el.__mmRO.disconnect(); el.__mmRO = null; el.__mmPending = null;
            render(el, p.level, p.view);
          }
        });
        el.__mmRO.observe(el);
      }
      return;
    }
    el.__mmPending = null;
    if (el.__mmRO) { el.__mmRO.disconnect(); el.__mmRO = null; }
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
      if (el.__mmToken !== token || el.__mmCanvas !== canvas) return;
      if (land) {
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
    if (el.__mmToken !== token || el.__mmCanvas !== canvas) return;
    if (countries) {
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
