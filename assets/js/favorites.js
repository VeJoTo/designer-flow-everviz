// Favorites: toggle star on any card, persist per-kind in localStorage.
// Three buckets: basemap, minimap, template. Storage shape per bucket:
//   { "<key>": true, ... }  where <key> = data-saved-id (preferred) or data-name.
//
// Reads data-fav-kind off the closest ancestor section (set in the
// page HTML on the [data-filter-root] element).

(function () {
  const KEYS = {
    basemap: "everviz-fav-basemap",
    minimap: "everviz-fav-minimap",
    template: "everviz-fav-template",
  };

  function read(kind) {
    if (!KEYS[kind]) return {};
    try {
      return JSON.parse(localStorage.getItem(KEYS[kind]) || "{}");
    } catch {
      return {};
    }
  }
  function write(kind, data) {
    if (!KEYS[kind]) return;
    localStorage.setItem(KEYS[kind], JSON.stringify(data));
  }

  window.Favorites = {
    isFavorite(kind, key) {
      return !!read(kind)[key];
    },
    toggle(kind, key) {
      const d = read(kind);
      if (d[key]) delete d[key];
      else d[key] = true;
      write(kind, d);
      return !!d[key];
    },
  };

  function cardKind(card) {
    return card.closest("[data-fav-kind]")?.dataset.favKind;
  }
  function cardKey(card) {
    return card.dataset.savedId || card.dataset.name;
  }
  function setVisualState(card, isFav) {
    card.classList.toggle("is-favorited", isFav);
    const star = card.querySelector(".icon-btn--toggle img");
    if (star) {
      star.src = isFav ? "assets/icons/star-solid.svg" : "assets/icons/star.svg";
    }
  }

  function applyInitialState() {
    document.querySelectorAll(".map-card, .template-card").forEach((card) => {
      const kind = cardKind(card);
      const key = cardKey(card);
      if (!kind || !key) return;
      setVisualState(card, window.Favorites.isFavorite(kind, key));
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Initial render (run again after library-saved.js adds saved cards;
    // library-saved.js dispatches DOMContentLoaded earlier in the order,
    // so by the time this listener fires the saved cards are already there.)
    applyInitialState();

    // Delegated star click handler — works for static, template, and saved cards.
    document.addEventListener("click", (e) => {
      const star = e.target.closest(".icon-btn--toggle");
      if (!star) return;
      const card = star.closest(".map-card, .template-card");
      if (!card) return;
      e.preventDefault();
      e.stopPropagation();
      const kind = cardKind(card);
      const key = cardKey(card);
      if (!kind || !key) return;
      const now = window.Favorites.toggle(kind, key);
      setVisualState(card, now);
      // Re-apply the filter so favorites-only mode hides/shows the card.
      card.dispatchEvent(
        new CustomEvent("favorite-changed", { bubbles: true, detail: { kind, key, value: now } })
      );
    });
  });
})();
