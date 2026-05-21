// Promise-based confirm dialog. Reuses the save-modal aesthetic
// (navy header, X close, body, outline-cancel + filled-confirm
// footer). Usage:
//
//   const ok = await window.confirmDialog({
//     title: "Delete map",
//     message: "Are you sure you want to delete <strong>X</strong>?",
//     confirmLabel: "Delete",
//     destructive: true,
//   });
//   if (ok) { ...do the thing... }

(function () {
  let modal = null;

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement("div");
    modal.className = "confirm-modal";
    modal.dataset.confirmModal = "";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="confirm-modal__backdrop" data-confirm-close></div>
      <div class="confirm-modal__panel" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
        <header class="confirm-modal__head">
          <h2 class="confirm-modal__title" id="confirm-modal-title">Confirm</h2>
          <button class="confirm-modal__close" aria-label="Close" data-confirm-close>
            <img src="assets/icons/x-mark.svg" alt="" width="18" height="18" />
          </button>
        </header>
        <div class="confirm-modal__body" data-confirm-body></div>
        <footer class="confirm-modal__foot">
          <button class="btn btn--outline" data-confirm-cancel>Cancel</button>
          <button class="btn btn--danger" data-confirm-ok>Delete</button>
        </footer>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  }

  function confirmDialog({
    title = "Confirm",
    message = "",
    confirmLabel = "Delete",
    destructive = true,
  } = {}) {
    const m = ensureModal();
    m.querySelector(".confirm-modal__title").textContent = title;
    m.querySelector("[data-confirm-body]").innerHTML = message;
    const okBtn = m.querySelector("[data-confirm-ok]");
    okBtn.textContent = confirmLabel;
    okBtn.classList.toggle("btn--danger", destructive);
    okBtn.classList.toggle("btn--primary", !destructive);

    return new Promise((resolve) => {
      function cleanup(result) {
        m.hidden = true;
        document.body.style.overflow = "";
        m.removeEventListener("click", onClick);
        document.removeEventListener("keydown", onKey);
        resolve(result);
      }
      function onClick(e) {
        if (
          e.target.closest("[data-confirm-cancel]") ||
          e.target.closest("[data-confirm-close]")
        ) {
          cleanup(false);
        } else if (e.target.closest("[data-confirm-ok]")) {
          cleanup(true);
        }
      }
      function onKey(e) {
        if (e.key === "Escape") cleanup(false);
        if (e.key === "Enter") cleanup(true);
      }
      m.addEventListener("click", onClick);
      document.addEventListener("keydown", onKey);
      m.hidden = false;
      document.body.style.overflow = "hidden";
      // Focus Cancel by default — safer for destructive actions.
      m.querySelector("[data-confirm-cancel]").focus();
    });
  }

  window.confirmDialog = confirmDialog;
})();
