// Per-browser persistence for user-created minimaps and basemaps.
// Stored in localStorage under "everviz-saved-minimaps" and
// "everviz-saved-basemaps". Each entry:
//   { id, name, created, thumb }
// where:
//   id      — string, stable per entry; used to update vs create
//   name    — string, user-typed
//   created — ISO date string ("YYYY-MM-DD")
//   thumb   — CSS background-image string, e.g. 'url("assets/img/maps/europe.png")'

(function (global) {
  const KEYS = {
    minimap: "everviz-saved-minimaps",
    basemap: "everviz-saved-basemaps",
    template: "everviz-saved-templates",
  };

  function read(kind) {
    try {
      const raw = localStorage.getItem(KEYS[kind]);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
  function write(kind, list) {
    try {
      localStorage.setItem(KEYS[kind], JSON.stringify(list));
    } catch (e) {
      console.warn("saved-maps: localStorage write failed", e);
    }
  }
  function todayISO() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }
  function newId() {
    return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  global.SavedMaps = {
    list(kind) {
      return read(kind);
    },
    /** Save or update. Returns the saved entry. */
    save(kind, { id, name, thumb }) {
      const list = read(kind);
      if (id) {
        const existing = list.find((e) => e.id === id);
        if (existing) {
          existing.name = name;
          if (thumb) existing.thumb = thumb;
          // Bump created to bring it to the top of Most recent
          existing.created = todayISO();
          write(kind, list);
          return existing;
        }
      }
      const entry = {
        id: id || newId(),
        name,
        created: todayISO(),
        thumb: thumb || "",
      };
      list.unshift(entry);
      write(kind, list);
      return entry;
    },
    delete(kind, id) {
      const list = read(kind).filter((e) => e.id !== id);
      write(kind, list);
    },
  };
})(window);
