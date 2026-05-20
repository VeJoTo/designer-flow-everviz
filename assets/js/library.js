// On library pages: rewrite each card's editor links so they carry
// the card's title as a ?name=... query. The editor reads this param
// and shows the name in its title bar. Cards without a title (or the
// "Create new" button which has no card wrapper) are left alone.

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".map-card").forEach((card) => {
    const titleEl = card.querySelector(".map-card__title");
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
