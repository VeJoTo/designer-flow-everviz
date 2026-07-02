// Pure data model for minimap presets. No DOM. Exposed as window.MinimapModel.
// A preset = { id, name, created, thumb, defaultLevelId, levels: [Level] }.
// A Level = { id, type, name, schema, settings, customStyle }.
(function (global) {
  // Two field schemas. "physical" = globe (water/land/bg);
  // "political" = country/continent/region/city (land/stroke/opacity/bg).
  const SCHEMAS = {
    physical: {
      fields: [
        { key: "water", label: "Water", kind: "color", default: "#cfe8f5" },
        { key: "land", label: "Land", kind: "color", default: "#e9e6df" },
        { key: "background", label: "Background", kind: "color", default: "#ffffff" },
      ],
    },
    political: {
      fields: [
        { key: "land", label: "Land", kind: "color", default: "#e9e6df" },
        { key: "strokeColor", label: "Stroke", kind: "color", default: "#8a8a8a" },
        { key: "strokeWidth", label: "Stroke width", kind: "number", default: 1, min: 0, max: 8 },
        { key: "opacity", label: "Opacity", kind: "number", default: 100, min: 0, max: 100 },
        { key: "background", label: "Background", kind: "color", default: "#ffffff" },
      ],
    },
  };

  // Which schema a level type renders with.
  const TYPE_SCHEMA = {
    globe: "physical",
    continent: "political",
    country: "political",
    region: "political",
    city: "political",
  };

  // Order used to slot a newly-added level into the ladder (far -> near).
  const TYPE_ORDER = ["globe", "continent", "country", "region", "city"];

  const TYPE_LABEL = {
    globe: "Globe",
    continent: "Continent",
    country: "Country",
    region: "Region",
    city: "City",
  };

  function uid() {
    return global.SavedMaps
      ? SavedMaps.id()
      : `l_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  // Build default settings for a schema from its field defaults.
  function defaultSettings(schema) {
    const out = {};
    SCHEMAS[schema].fields.forEach((f) => (out[f.key] = f.default));
    return out;
  }

  function makeLevel(type) {
    const schema = TYPE_SCHEMA[type] || "political";
    return {
      id: uid(),
      type,
      name: TYPE_LABEL[type] || "Level",
      schema,
      settings: defaultSettings(schema),
      customStyle: null, // or { filename }
    };
  }

  // A brand-new preset: Globe + Country + Region, default = Globe.
  function makeDefaultPreset() {
    const levels = ["globe", "country", "region"].map(makeLevel);
    return {
      id: uid(),
      name: "Untitled",
      created: null, // stamped by SavedMaps on save
      thumb: "",
      defaultLevelId: levels[0].id,
      levels,
    };
  }

  // Sort levels far -> near by TYPE_ORDER (stable for equal types).
  function sortLevels(levels) {
    return levels
      .map((lvl, i) => [lvl, i])
      .sort((a, b) => {
        const d = TYPE_ORDER.indexOf(a[0].type) - TYPE_ORDER.indexOf(b[0].type);
        return d !== 0 ? d : a[1] - b[1];
      })
      .map((pair) => pair[0]);
  }

  global.MinimapModel = {
    SCHEMAS,
    TYPE_SCHEMA,
    TYPE_ORDER,
    TYPE_LABEL,
    makeLevel,
    makeDefaultPreset,
    defaultSettings,
    sortLevels,
    uid,
  };
})(typeof window !== "undefined" ? window : this);
