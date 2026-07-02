// Minimap editor controller. Renders a 3-pane editor from a preset in memory.
(function () {
  const M = window.MinimapModel;
  if (!M) return;

  // Representative SVG shapes for the preview (fills use currentColor / stroke vars).
  const REGION_SVG =
    '<svg class="mm-preview__region" viewBox="0 0 100 100" aria-hidden="true">' +
    '<path d="M18 30 L46 20 L74 28 L82 52 L64 78 L34 82 L14 60 Z"/></svg>';
  const BLOB_SVG =
    '<svg class="mm-preview__blob" viewBox="0 0 100 100" aria-hidden="true">' +
    '<path d="M20 40 Q35 18 55 30 Q80 24 78 50 Q84 74 58 74 Q30 82 22 60 Z"/></svg>';

  // --- State ---
  let preset = M.makeDefaultPreset();
  let selectedId = preset.levels[0].id;

  // --- DOM refs ---
  const $ = (sel) => document.querySelector(sel);
  const levelsEl = $("[data-mm-levels]");
  const nameEl = $("[data-mm-level-name]");
  const typeEl = $("[data-mm-level-type]");
  const fieldsEl = $("[data-mm-fields]");
  const previewLabelEl = $("[data-mm-preview-label]");
  const previewStageEl = $("[data-mm-preview-stage]");

  function selectedLevel() {
    return preset.levels.find((l) => l.id === selectedId) || preset.levels[0];
  }

  // --- Render: level rail ---
  function renderRail() {
    levelsEl.innerHTML = "";
    M.sortLevels(preset.levels).forEach((lvl) => {
      const li = document.createElement("li");
      li.className = "mm-level" + (lvl.id === selectedId ? " is-selected" : "");
      li.dataset.levelId = lvl.id;
      const isDefault = lvl.id === preset.defaultLevelId;
      li.innerHTML =
        '<span class="mm-level__thumb" style="' + thumbStyle(lvl) + '"></span>' +
        '<span class="mm-level__body">' +
        '<span class="mm-level__name"></span>' +
        '<span class="mm-level__type">' + (M.TYPE_LABEL[lvl.type] || "Level") + "</span>" +
        "</span>" +
        (isDefault ? '<span class="mm-level__default">Default</span>' : "") +
        '<button class="mm-level__menu" aria-label="More options" data-level-menu>' +
        '<img src="assets/icons/ellipsis-vertical.svg" alt="" width="18" height="18" /></button>';
      li.querySelector(".mm-level__name").textContent = lvl.name;
      levelsEl.appendChild(li);
    });
  }

  // A flat swatch for the rail thumbnail (land colour over background).
  function thumbStyle(lvl) {
    const s = lvl.settings;
    const bg = s.background || "#fff";
    const land = lvl.schema === "physical" ? s.water : s.land;
    return "background-color:" + bg + ";box-shadow:inset 0 0 0 8px " + (land || "#ddd") + ";";
  }

  // --- Render: settings pane for the selected level ---
  function renderSettings() {
    const lvl = selectedLevel();
    nameEl.textContent = lvl.name;
    const schemaLabel =
      lvl.schema === "physical" ? "Physical · water, land, background" : "Political · land, stroke, opacity, background";
    typeEl.textContent = schemaLabel;

    fieldsEl.innerHTML = "";
    const usingCustom = !!lvl.customStyle;
    M.SCHEMAS[lvl.schema].fields.forEach((f) => {
      const row = document.createElement("div");
      row.className = "mm-field";
      const label = document.createElement("span");
      label.className = "mm-field__label";
      label.textContent = f.label;
      row.appendChild(label);
      row.appendChild(buildControl(lvl, f, usingCustom));
      fieldsEl.appendChild(row);
    });
    renderCustomState(lvl);
  }

  function buildControl(lvl, f, disabled) {
    if (f.kind === "color") {
      const wrap = document.createElement("label");
      wrap.className = "color-input";
      const hex = document.createElement("input");
      hex.type = "text";
      hex.className = "color-input__hex";
      hex.maxLength = 7;
      hex.value = lvl.settings[f.key];
      hex.disabled = disabled;
      const swatch = document.createElement("span");
      swatch.className = "color-input__swatch";
      swatch.style.background = lvl.settings[f.key];
      const picker = document.createElement("input");
      picker.type = "color";
      picker.value = lvl.settings[f.key];
      picker.disabled = disabled;
      picker.setAttribute("aria-label", f.label);
      const apply = (v) => {
        if (!/^#[0-9a-fA-F]{6}$/.test(v)) return;
        lvl.settings[f.key] = v;
        hex.value = v;
        swatch.style.background = v;
        picker.value = v;
        renderPreview();
        renderRail();
      };
      picker.addEventListener("input", (e) => apply(e.target.value));
      hex.addEventListener("change", (e) => apply(e.target.value.trim()));
      swatch.appendChild(picker);
      wrap.appendChild(hex);
      wrap.appendChild(swatch);
      return wrap;
    }
    // number
    const input = document.createElement("input");
    input.type = "number";
    input.className = "prop-input prop-input--number";
    input.value = lvl.settings[f.key];
    if (f.min != null) input.min = f.min;
    if (f.max != null) input.max = f.max;
    input.disabled = disabled;
    input.addEventListener("change", () => {
      let v = Number(input.value);
      if (f.min != null) v = Math.max(f.min, v);
      if (f.max != null) v = Math.min(f.max, v);
      input.value = v;
      lvl.settings[f.key] = v;
      renderPreview();
    });
    return input;
  }

  // --- Render: preview ---
  function renderPreview() {
    const lvl = selectedLevel();
    previewLabelEl.textContent = lvl.name;
    const s = lvl.settings;
    const stage = previewStageEl;
    stage.style.setProperty("--mm-bg", s.background || "#fff");
    if (lvl.schema === "physical") {
      stage.style.setProperty("--mm-water", s.water || "#cfe8f5");
      stage.style.setProperty("--mm-land", s.land || "#e9e6df");
      stage.innerHTML = '<div class="mm-preview__globe">' + BLOB_SVG + "</div>";
    } else {
      stage.style.setProperty("--mm-land", s.land || "#e9e6df");
      stage.style.setProperty("--mm-stroke", s.strokeColor || "#8a8a8a");
      stage.style.setProperty("--mm-stroke-w", String(s.strokeWidth ?? 1));
      stage.style.setProperty("--mm-opacity", String(s.opacity ?? 100));
      stage.innerHTML = REGION_SVG;
    }
  }

  // --- Advanced / custom style state ---
  function renderCustomState(lvl) {
    const empty = $("[data-mm-custom-empty]");
    const set = $("[data-mm-custom-set]");
    const nameOut = $("[data-mm-custom-name]");
    if (lvl.customStyle) {
      empty.hidden = true;
      set.hidden = false;
      nameOut.textContent = lvl.customStyle.filename;
    } else {
      empty.hidden = false;
      set.hidden = true;
    }
  }

  function renderAll() {
    renderRail();
    renderSettings();
    renderPreview();
  }

  // --- Events: select a level (delegated on the rail) ---
  levelsEl.addEventListener("click", (e) => {
    if (e.target.closest("[data-level-menu]")) return; // handled in Task 6
    const row = e.target.closest(".mm-level");
    if (!row) return;
    selectedId = row.dataset.levelId;
    renderAll();
  });

  // Expose for later tasks (persistence, rail menu, add-level, custom file).
  window.__mmEditor = {
    getPreset: () => preset,
    setPreset: (p) => {
      preset = p;
      selectedId = (p.levels[0] || {}).id;
      renderAll();
    },
    getSelectedId: () => selectedId,
    setSelectedId: (id) => {
      selectedId = id;
    },
    renderAll,
    renderSettings,
    renderCustomState,
    selectedLevel,
  };

  renderAll();
})();
