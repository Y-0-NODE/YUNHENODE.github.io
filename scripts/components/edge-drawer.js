(function setupEdgeDrawers(global) {
  "use strict";

  function setEdgeDrawer(drawer, open) {
    if (!drawer) return;
    drawer.classList.toggle("open", open);
    drawer.querySelector(".edge-drawer-handle")?.setAttribute("aria-expanded", String(open));
  }

  function toggleEdgeDrawer(id) {
    const target = document.getElementById(id);
    const shouldOpen = !target?.classList.contains("open");
    document.querySelectorAll(".edge-drawer.open").forEach(drawer => {
      if (drawer !== target) setEdgeDrawer(drawer, false);
    });
    setEdgeDrawer(target, shouldOpen);
  }

  document.querySelectorAll(".edge-drawer a").forEach(link => {
    link.addEventListener("click", () => setEdgeDrawer(link.closest(".edge-drawer"), false));
  });

  window.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    document.querySelectorAll(".edge-drawer.open").forEach(drawer => setEdgeDrawer(drawer, false));
  });

  global.toggleEdgeDrawer = toggleEdgeDrawer;
})(window);
