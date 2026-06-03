// Default selection: at most one default per kind (basemap, minimap,
// template). Click "Set as default …" on any card to set it; click
// again (the text flips to "Default …") to clear it. Persisted in
// localStorage. Modeled on favorites.js.

(function () {
  const KEYS = {
    basemap: "everviz-default-basemap",
    minimap: "everviz-default-minimap",
    template: "everviz-default-template",
  };

  function read(kind) {
    if (!KEYS[kind]) return null;
    return localStorage.getItem(KEYS[kind]);
  }
  function write(kind, key) {
    if (!KEYS[kind]) return;
    if (key == null) localStorage.removeItem(KEYS[kind]);
    else localStorage.setItem(KEYS[kind], key);
  }

  window.Defaults = {
    get(kind) { return read(kind); },
    set(kind, key) { write(kind, key); },
    clear(kind) { write(kind, null); },
  };

  function cardKind(card) {
    return card.closest("[data-fav-kind]")?.dataset.favKind;
  }
  function cardKey(card) {
    return card.dataset.savedId || card.dataset.name;
  }
  function nounFor(kind) {
    if (kind === "template") return "location map template";
    return kind; // "basemap" or "minimap"
  }

  function setVisualState(card, isDefault) {
    card.classList.toggle("is-default", isDefault);
    const affordance = card.querySelector(".map-card__default, .template-card__default");
    if (affordance) {
      const noun = nounFor(cardKind(card));
      affordance.textContent = isDefault ? `Default ${noun}` : `Set as default ${noun}`;
    }
  }

  function applyInitialState() {
    document.querySelectorAll(".map-card, .template-card").forEach((card) => {
      const kind = cardKind(card);
      const key = cardKey(card);
      if (!kind || !key) return;
      setVisualState(card, window.Defaults.get(kind) === key);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyInitialState();

    document.addEventListener("click", (e) => {
      const affordance = e.target.closest(".map-card__default, .template-card__default");
      if (!affordance) return;
      const card = affordance.closest(".map-card, .template-card");
      if (!card) return;
      e.preventDefault();
      e.stopPropagation();
      const kind = cardKind(card);
      const key = cardKey(card);
      if (!kind || !key) return;

      const current = window.Defaults.get(kind);
      if (current === key) {
        window.Defaults.clear(kind);
        setVisualState(card, false);
        return;
      }
      // Clear the previous default's visual state, if any, before setting this one.
      document.querySelectorAll(".map-card.is-default, .template-card.is-default").forEach((c) => {
        if (cardKind(c) === kind) setVisualState(c, false);
      });
      window.Defaults.set(kind, key);
      setVisualState(card, true);
    });
  });
})();
