// Promise-based picker modal — a navy-header dialog with a scrollable
// grid of selectable cards. Reuses the confirm-dialog aesthetic at a
// larger size. Used by the Template wizard's Presets tab to choose a
// marker / region preset. Usage:
//
//   const choice = await window.pickerModal({
//     title: "Choose Marker",
//     items: [{ name: "Red marker" }, { name: "Blue marker" }],
//   });
//   if (choice) { ...choice.name... }   // null if dismissed.

(function () {
  let modal = null;

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement("div");
    modal.className = "picker-modal";
    modal.dataset.pickerModal = "";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="picker-modal__backdrop" data-picker-close></div>
      <div class="picker-modal__panel" role="dialog" aria-modal="true" aria-labelledby="picker-modal-title">
        <header class="picker-modal__head">
          <h2 class="picker-modal__title" id="picker-modal-title"></h2>
          <button class="picker-modal__close" aria-label="Close" data-picker-close>
            <img src="assets/icons/x-mark.svg" alt="" width="18" height="18" />
          </button>
        </header>
        <div class="picker-modal__body" data-picker-body></div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  }

  // onCard(cardEl, item, index) — optional hook run for each card after render,
  // e.g. to mount a live styled preview into the card's .picker-card__thumb.
  function pickerModal({ title = "Choose", items = [], onCard } = {}) {
    const m = ensureModal();
    m.querySelector(".picker-modal__title").textContent = title;
    const body = m.querySelector("[data-picker-body]");
    body.scrollTop = 0;
    body.innerHTML =
      `<div class="picker-grid">` +
      items
        .map((it) => {
          const name = String(it.name);
          const esc = name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
          const t = it.thumb || {};
          // t.bg = a ready-made CSS background-image value (e.g. url("…")); its
          // double quotes are entity-escaped so they survive the style attribute.
          const mapStyle = t.bg
            ? ` style="background-image:${t.bg.replace(/"/g, "&quot;")}"`
            : t.map
            ? ` style="background-image:url('assets/img/maps/${t.map}.png')"`
            : "";
          const darkCls = t.dark ? " picker-card__thumb--dark" : "";
          const mark = t.kind
            ? `<span class="picker-card__mark picker-card__mark--${t.kind}"${t.color ? ` style="--mark:${t.color}"` : ""}></span>`
            : "";
          return `
        <button type="button" class="picker-card" data-pick="${esc}">
          <span class="picker-card__thumb${darkCls}"${mapStyle} aria-hidden="true">${mark}</span>
          <span class="picker-card__name">${esc}</span>
        </button>`;
        })
        .join("") +
      `</div>`;

    if (typeof onCard === "function") {
      body.querySelectorAll(".picker-card").forEach((card, i) => onCard(card, items[i], i));
    }

    return new Promise((resolve) => {
      function cleanup(result) {
        m.hidden = true;
        document.body.style.overflow = "";
        m.removeEventListener("click", onClick);
        document.removeEventListener("keydown", onKey);
        resolve(result);
      }
      function onClick(e) {
        const card = e.target.closest("[data-pick]");
        if (card) { cleanup({ name: card.dataset.pick }); return; }
        if (e.target.closest("[data-picker-close]")) cleanup(null);
      }
      function onKey(e) {
        if (e.key === "Escape") cleanup(null);
      }
      m.addEventListener("click", onClick);
      document.addEventListener("keydown", onKey);
      m.hidden = false;
      document.body.style.overflow = "hidden";
      m.querySelector(".picker-modal__close").focus();
    });
  }

  window.pickerModal = pickerModal;
})();
