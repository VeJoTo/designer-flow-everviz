// On library/template pages: rewrite each card's editor links so they
// carry the card's title as a ?name=... query. The editor reads this
// param and shows the name in its title bar. Works for both library
// map cards and map-designer template cards.

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".map-card, .template-card").forEach((card) => {
    const titleEl = card.querySelector(".map-card__title, .template-card__title");
    const title = titleEl?.textContent?.trim();
    if (!title) return;
    card.querySelectorAll('a[href*="editor.html"]').forEach((a) => {
      try {
        const url = new URL(a.href, window.location.href);
        url.searchParams.set("name", title);
        a.href = url.toString();
      } catch (e) {
        // Skip malformed hrefs.
      }
    });
  });
});
