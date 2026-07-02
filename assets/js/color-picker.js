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

  // Expose maths now; the enhancer + popover are added in later tasks.
  global.ColorPicker = {
    _math: { clamp, normHex, hexToRgb, rgbToHex, rgbToHsv, hsvToRgb, hexToHsv, hsvToHex },
  };
})(typeof window !== "undefined" ? window : this);
