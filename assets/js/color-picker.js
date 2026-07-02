// Shared custom colour picker. Exposed as window.ColorPicker.
// Skins over existing .color-input markup: hides the native <input type=color>,
// opens a branded HSV popover, and writes hex back through the same input/change
// events consumers already bind.
(function (global) {
  "use strict";

  // ---- Colour maths (all pure) ----
  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }
  function normHex(input) {
    if (typeof input !== "string") return null;
    let s = input.trim().replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
    return "#" + s.toLowerCase();
  }
  function hexToRgb(hex) {
    const h = normHex(hex) || "#000000";
    return {
      r: parseInt(h.slice(1, 3), 16),
      g: parseInt(h.slice(3, 5), 16),
      b: parseInt(h.slice(5, 7), 16),
    };
  }
  function rgbToHex(r, g, b) {
    const to2 = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
    return "#" + to2(r) + to2(g) + to2(b);
  }
  // h in [0,360), s/v in [0,1]
  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    const s = max === 0 ? 0 : d / max;
    return { h, s, v: max };
  }
  function hsvToRgb(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
  }
  function hexToHsv(hex) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHsv(r, g, b);
  }
  function hsvToHex(h, s, v) {
    const { r, g, b } = hsvToRgb(h, s, v);
    return rgbToHex(r, g, b);
  }

  // ---- Enhancer ----
  const M = { clamp, normHex, hexToRgb, rgbToHex, rgbToHsv, hsvToRgb, hexToHsv, hsvToHex };

  // Resolve the parts of a .color-input defensively (markup differs per site).
  function resolveParts(root) {
    const swatch = root.querySelector(".color-input__swatch");
    if (!swatch) return null;
    const hex =
      root.querySelector(".color-input__hex") ||
      root.querySelector('input[type="text"]');
    const native = swatch.querySelector('input[type="color"]'); // may be null
    return { root, swatch, hex, native };
  }

  function currentHex(parts) {
    if (parts.native && M.normHex(parts.native.value)) return M.normHex(parts.native.value);
    if (parts.hex && M.normHex(parts.hex.value)) return M.normHex(parts.hex.value);
    const bg = parts.swatch.style.background || "";
    const m = bg.match(/#([0-9a-fA-F]{6})/);
    return m ? "#" + m[1].toLowerCase() : "#000000";
  }

  // Single write path. Updates swatch + hex + native, fires input/change on both
  // so any consumer binding is hit. `applying` guards against the hex-change loop.
  let applying = false;
  function setValue(parts, hexRaw) {
    const hex = M.normHex(hexRaw);
    if (!hex) return;
    applying = true;
    parts.swatch.style.background = hex;
    if (parts.hex) parts.hex.value = hex.toUpperCase();
    if (parts.native) parts.native.value = hex;
    const fire = (el) => {
      if (!el) return;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    fire(parts.native);
    fire(parts.hex);
    applying = false;
  }

  function labelFor(root) {
    const row = root.closest(".mm-field, .prop-row, .wiz-row") || root.parentElement;
    const lab = row && row.querySelector(".mm-field__label, .prop-label, .wiz-row__label, label");
    const t = lab && lab.textContent.trim();
    return t || "Colour";
  }

  function enhance(root) {
    if (root.dataset.cpReady) return;
    const parts = resolveParts(root);
    if (!parts) return;
    root.dataset.cpReady = "1";
    parts.swatch.dataset.cpReady = "1";
    parts.swatch.setAttribute("role", "button");
    parts.swatch.setAttribute("tabindex", "0");
    parts.swatch.setAttribute("aria-haspopup", "dialog");
    parts.swatch.setAttribute("aria-expanded", "false");
    parts.swatch.style.background = currentHex(parts);
    const open = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      openPopover(parts);
    };
    parts.swatch.addEventListener("click", open);
    parts.swatch.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") open(e);
    });
    if (parts.hex) {
      parts.hex.addEventListener("change", () => {
        if (applying) return;
        const hex = M.normHex(parts.hex.value);
        if (hex) { setValue(parts, hex); syncPopover(parts, hex); }
      });
    }
  }

  function enhanceAll(root) {
    (root || document).querySelectorAll(".color-input").forEach(enhance);
  }

  // Popover hooks — real implementations land in later tasks. Stubs so this task
  // is verifiable (swatch shows colour, native hidden) without a popover.
  // ---- Shared popover ----
  let popEl = null;
  let activeParts = null;
  let activeHsv = { h: 0, s: 0, v: 0 };

  function ensurePop() {
    if (popEl) return popEl;
    popEl = document.createElement("div");
    popEl.className = "cp-pop";
    popEl.setAttribute("role", "dialog");
    popEl.hidden = true;
    popEl.innerHTML =
      '<div class="cp-head">' +
        '<span class="cp-title" data-cp-title>Colour</span>' +
        '<button type="button" class="cp-close" aria-label="Close">✕</button>' +
      "</div>" +
      '<div class="cp-sv" data-cp-sv><span class="cp-sv__handle" data-cp-sv-handle></span></div>' +
      '<div class="cp-hue" data-cp-hue><span class="cp-hue__handle" data-cp-hue-handle></span></div>' +
      '<div class="cp-hex-row"><input type="text" class="cp-hex" data-cp-hex maxlength="7" spellcheck="false" /></div>';
    document.body.appendChild(popEl);
    popEl.querySelector(".cp-close").addEventListener("click", closePopover);
    document.addEventListener("click", (e) => {
      if (popEl.hidden) return;
      if (popEl.contains(e.target)) return;
      if (activeParts && activeParts.swatch.contains(e.target)) return;
      closePopover();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !popEl.hidden) closePopover();
    });
    wirePopInputs();
    return popEl;
  }

  function positionPop(swatch) {
    const r = swatch.getBoundingClientRect();
    ensurePop();
    popEl.hidden = false; // must be visible to measure
    const pw = popEl.offsetWidth, ph = popEl.offsetHeight;
    let top = r.bottom + 6;
    if (top + ph > window.innerHeight - 8 && r.top - ph - 6 > 8) top = r.top - ph - 6;
    let left = r.left;
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
    popEl.style.top = Math.round(Math.max(8, top)) + "px";
    popEl.style.left = Math.round(Math.max(8, left)) + "px";
  }

  function openPopover(parts) {
    activeParts = parts;
    ensurePop();
    popEl.querySelector("[data-cp-title]").textContent = labelFor(parts.root);
    const hex = currentHex(parts);
    activeHsv = M.hexToHsv(hex);
    positionPop(parts.swatch);
    renderPop(hex);
    parts.swatch.setAttribute("aria-expanded", "true");
  }

  function closePopover() {
    if (!popEl || popEl.hidden) return;
    popEl.hidden = true;
    if (activeParts) activeParts.swatch.setAttribute("aria-expanded", "false");
    activeParts = null;
  }

  function syncPopover(parts, hex) { syncPopoverReal(parts, hex); }

  // Paint the popover from activeHsv. `hex` is the current resolved colour.
  function renderPop(hex) {
    const sv = popEl.querySelector("[data-cp-sv]");
    const svH = popEl.querySelector("[data-cp-sv-handle]");
    const hueH = popEl.querySelector("[data-cp-hue-handle]");
    const hexEl = popEl.querySelector("[data-cp-hex]");
    sv.style.setProperty("--cp-hue-hex", M.hsvToHex(activeHsv.h, 1, 1));
    svH.style.left = activeHsv.s * sv.clientWidth + "px";
    svH.style.top = (1 - activeHsv.v) * sv.clientHeight + "px";
    const hue = popEl.querySelector("[data-cp-hue]");
    hueH.style.left = (activeHsv.h / 360) * hue.clientWidth + "px";
    if (hexEl && document.activeElement !== hexEl) hexEl.value = (M.normHex(hex) || "#000000").toUpperCase();
  }

  function syncPopoverReal(parts, hex) {
    if (activeParts === parts && popEl && !popEl.hidden) {
      activeHsv = M.hexToHsv(hex);
      renderPop(hex);
    }
  }

  // Commit the current activeHsv to the enhanced input + repaint.
  function commitHsv() {
    const hex = M.hsvToHex(activeHsv.h, activeHsv.s, activeHsv.v);
    if (activeParts) setValue(activeParts, hex);
    renderPop(hex);
  }

  function wirePopInputs() {
    const hexEl = popEl.querySelector("[data-cp-hex]");
    hexEl.addEventListener("change", () => {
      const hex = M.normHex(hexEl.value);
      if (!hex) { hexEl.value = M.hsvToHex(activeHsv.h, activeHsv.s, activeHsv.v).toUpperCase(); return; }
      activeHsv = M.hexToHsv(hex);
      commitHsv();
    });
    wirePopDrag();
  }

  function wirePopDrag() { /* later task */ }

  global.ColorPicker = { _math: M, enhance, enhanceAll, _setValue: setValue, _currentHex: currentHex, _resolveParts: resolveParts, _labelFor: labelFor };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => enhanceAll());
  } else {
    enhanceAll();
  }
})(typeof window !== "undefined" ? window : this);
