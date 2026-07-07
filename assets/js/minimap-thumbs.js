// On the Minimaps library page, render each card's thumbnail as the minimap's
// own styled locator (flat land colour on background, real geography) instead
// of a flat image — matching what the minimap actually produces. Runs after
// library-saved.js so freshly-rendered saved cards are included.
document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.libraryKind !== "minimap") return;
  if (!window.MinimapRender || !window.GeoRegions) return;

  // Library card modifier slug → GeoRegions region slug (most match 1:1).
  const REMAP = { "nordic-dark": "scandinavia" };
  function cardRegion(card) {
    let slug = null;
    card.classList.forEach((c) => {
      if (c.indexOf("map-card--") === 0 && c !== "map-card--saved") slug = c.slice(10);
    });
    slug = REMAP[slug] || slug;
    return slug && GeoRegions.has(slug) ? slug : "world";
  }
  // A saved minimap card carries a data-saved-id → use that preset's real
  // political level (its configured colours). Static demo cards use defaults.
  function savedPreset(card) {
    const id = card.dataset.savedId;
    if (!id || !window.SavedMaps) return null;
    return SavedMaps.list("minimap").find((e) => e.id === id) || null;
  }

  document.querySelectorAll(".map-card").forEach((card) => {
    const thumb = card.querySelector(".map-card__thumb");
    if (!thumb) return;
    const saved = savedPreset(card);
    if (saved) {
      const level =
        (saved.levels || []).find((l) => MinimapRender.schemaOf(l) === "political") || { type: "region" };
      MinimapRender.render(thumb, level, GeoRegions.level("region"));
    } else {
      MinimapRender.render(thumb, { type: "region" }, GeoRegions.region(cardRegion(card)));
    }
  });
});
