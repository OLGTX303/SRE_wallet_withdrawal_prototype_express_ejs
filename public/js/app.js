// Simple helper for demo: auto-advance from loading screens
// Each loading screen has data-next attribute in the DOM.
(function(){
  const el = document.querySelector("[data-auto-next]");
  if(!el) return;
  const next = el.getAttribute("data-auto-next");
  if(!next) return;
  const ms = Number(el.getAttribute("data-delay-ms") || 1200);
  setTimeout(()=>{ window.location.href = next; }, ms);
})();

// Success flow: show side process notifications
(function(){
  const host = document.querySelector("[data-process-toast]");
  if(!host) return;
  const stepsAttr = host.getAttribute("data-steps") || "";
  const steps = stepsAttr.split("|").map(s => s.trim()).filter(Boolean);
  if(!steps.length) return;
  steps.forEach((label, idx) => {
    const toast = document.createElement("div");
    toast.className = "process-toast";
    toast.textContent = label;
    toast.style.animationDelay = (idx * 260) + "ms";
    toast.style.animationDuration = "260ms, 260ms";
    toast.style.animationTimingFunction = "ease, ease";
    toast.style.animationFillMode = "forwards, forwards";
    toast.style.animationName = "toast-in, toast-out";
    toast.style.animationDelay = (idx * 260) + "ms, " + (idx * 260 + 2200) + "ms";
    host.appendChild(toast);
  });
})();

// Loading screens: inline process feed
(function(){
  const host = document.querySelector("[data-process-feed]");
  if(!host) return;
  const stepsAttr = host.getAttribute("data-steps") || "";
  const steps = stepsAttr.split("|").map(s => s.trim()).filter(Boolean);
  if(!steps.length) return;
  const items = steps.map((label) => {
    const row = document.createElement("div");
    row.className = "process-feed-item";
    const dot = document.createElement("span");
    dot.className = "process-feed-dot";
    const icon = document.createElement("span");
    icon.className = "process-feed-icon";
    const text = document.createElement("span");
    text.textContent = label;
    row.appendChild(dot);
    row.appendChild(icon);
    row.appendChild(text);
    host.appendChild(row);
    return { row, icon };
  });
  const outcome = (host.getAttribute("data-outcome") || "pass").toLowerCase();
  const iconMap = {
    pass: "✅",
    fail: "❌",
    timeout: "⚠",
    hold: "⚠",
    blocked: "❌",
    limit: "⚠",
  };
  const loader = host.closest(".card") ? host.closest(".card").querySelector(".loader") : null;
  const resultIcon = (result) => {
    if (!loader || loader.dataset.replaced === "1") return;
    const wrap = document.createElement("div");
    wrap.className = "process-result-icon " + (result === "pass" ? "success" : (result === "fail" || result === "blocked") ? "danger" : "warn");
    wrap.innerHTML = result === "pass"
      ? '<svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"></circle><path d="M16 27.5l6.2 6.2L36 20"></path></svg>'
      : (result === "fail" || result === "blocked")
        ? '<svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"></circle><path d="M18 18l16 16M34 18l-16 16"></path></svg>'
        : '<svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"></circle><path d="M26 14v16"></path><circle cx="26" cy="34" r="2"></circle></svg>';
    loader.dataset.replaced = "1";
    loader.replaceWith(wrap);
  };
  let idx = 1;
  const terminal = items.length - 1;
  const render = (activeIndex, warnLast) => {
    items.forEach((item, i) => {
      const row = item.row;
      row.classList.remove("active", "done", "warn");
      if (i < activeIndex) row.classList.add("done");
      if (i === activeIndex) row.classList.add(warnLast ? "warn" : "active");
      item.icon.textContent = "";
    });
  };
  const tick = () => {
    if (outcome !== "pass" && idx >= terminal) {
      render(terminal, true);
      items[terminal].icon.textContent = iconMap[outcome] || "!";
      resultIcon(outcome);
      return;
    }
    render(idx, false);
    idx = Math.min(idx + 1, items.length);
    if (idx <= terminal) {
      setTimeout(tick, 700);
    } else {
      items.forEach((item) => item.row.classList.add("done"));
      items[terminal].icon.textContent = iconMap[outcome] || "OK";
      resultIcon(outcome);
    }
  };
  tick();
})();

// Modal helper (non-pass outcomes)
(function(){
  const showModal = () => {
    const modals = document.querySelectorAll("[data-modal]");
    if(!modals.length) return;
    modals.forEach((modal) => {
      requestAnimationFrame(() => modal.classList.add("show"));
      const closeBtn = modal.querySelector("[data-modal-close]");
      if(closeBtn){
        closeBtn.addEventListener("click", () => {
          modal.classList.remove("show");
        });
      }
    });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showModal);
  } else {
    showModal();
  }
})();
