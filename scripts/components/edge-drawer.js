(function setupEdgeDrawers(global) {
  "use strict";

  const SWIPE_DISTANCE = 46;
  const SWIPE_EDGE = 54;
  let touchState = null;

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

  function primaryDrawer() {
    return document.querySelector(".edge-drawer");
  }

  function handleTouchStart(event) {
    const touch = event.touches?.[0];
    if (!touch) return;
    const drawer = event.target.closest(".edge-drawer") || primaryDrawer();
    const drawerOpen = drawer?.classList.contains("open");
    const fromLeftEdge = touch.clientX <= SWIPE_EDGE;
    if (!drawerOpen && !fromLeftEdge) return;

    touchState = {
      drawer,
      startX: touch.clientX,
      startY: touch.clientY,
      startedOpen: drawerOpen
    };
  }

  function handleTouchEnd(event) {
    if (!touchState?.drawer) return;
    const touch = event.changedTouches?.[0];
    if (!touch) {
      touchState = null;
      return;
    }

    const dx = touch.clientX - touchState.startX;
    const dy = touch.clientY - touchState.startY;
    const horizontalSwipe = Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.25;

    if (horizontalSwipe && dx > 0 && !touchState.startedOpen) {
      setEdgeDrawer(touchState.drawer, true);
    }
    if (horizontalSwipe && dx < 0 && touchState.startedOpen) {
      setEdgeDrawer(touchState.drawer, false);
    }

    touchState = null;
  }

  document.querySelectorAll(".edge-drawer a").forEach(link => {
    link.addEventListener("click", () => setEdgeDrawer(link.closest(".edge-drawer"), false));
  });

  document.querySelectorAll(".edge-drawer-handle").forEach(handle => {
    if (!handle.querySelector(".edge-drawer-switch")) {
      const title = handle.querySelector("strong");
      const switchMarkup = '<span class="edge-drawer-switch" aria-hidden="true"></span>';
      if (title) {
        title.insertAdjacentHTML("afterend", switchMarkup);
      } else {
        handle.insertAdjacentHTML("afterbegin", switchMarkup);
      }
    }
  });

  window.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    document.querySelectorAll(".edge-drawer.open").forEach(drawer => setEdgeDrawer(drawer, false));
  });

  window.addEventListener("touchstart", handleTouchStart, { passive: true });
  window.addEventListener("touchend", handleTouchEnd, { passive: true });

  global.toggleEdgeDrawer = toggleEdgeDrawer;
})(window);
