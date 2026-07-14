const VISITOR_BACKGROUND_TITLE = "YUNHE_VISITOR_BACKGROUND";

function visitorNumber(value, fallback, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function injectVisitorBackgroundStyles() {
  if (document.getElementById("visitor-background-runtime-styles")) return;
  const style = document.createElement("style");
  style.id = "visitor-background-runtime-styles";
  style.textContent = `
    body.visitor-background-managed::before{display:none!important}
    .visitor-custom-background,.visitor-custom-veil{position:fixed;inset:0;z-index:0;pointer-events:none}
    .visitor-custom-background{background-repeat:no-repeat}
    .visitor-custom-veil{background:rgba(248,248,246,.08)}
    body.visitor-custom-active .visitor-shell{position:relative;z-index:1}
    body.visitor-custom-active .topbar{z-index:10}
    body.visitor-side-left .visitor-shell{margin-left:clamp(20px,7vw,110px);margin-right:auto}
    body.visitor-side-right .visitor-shell{margin-left:auto;margin-right:clamp(20px,7vw,110px)}
    body.visitor-side-center .visitor-shell{margin-left:auto;margin-right:auto}
    body.visitor-theme-light{background:#f8f8f6!important;color:#111!important}
    body.visitor-theme-light .topbar{background:rgba(248,248,246,.88)!important;border-bottom-color:rgba(0,0,0,.14)!important;backdrop-filter:blur(12px)}
    body.visitor-theme-light .topbar a{color:#111!important}
    body.visitor-theme-light .visitor-hero{border-bottom-color:rgba(0,0,0,.18)!important}
    body.visitor-theme-light .visitor-hero p{color:#343434!important}
    body.visitor-theme-light .visitor-card{border-color:rgba(0,0,0,.18)!important;background:rgba(248,248,246,.82)!important;color:#111!important;backdrop-filter:blur(10px)}
    body.visitor-theme-light .visitor-card p{color:#444!important}
    body.visitor-theme-light .visitor-card span,body.visitor-theme-light .visitor-note,body.visitor-theme-light .eyebrow{color:#555!important}
    body.visitor-theme-dark{background:#090909!important;color:#f2f2f2!important}
    body.visitor-theme-dark .topbar{background:rgba(9,9,9,.86)!important;backdrop-filter:blur(12px)}
    body.visitor-theme-dark .visitor-card{background:rgba(10,10,10,.8)!important;backdrop-filter:blur(10px)}
    @media(max-width:760px){
      body.visitor-side-left .visitor-shell,body.visitor-side-right .visitor-shell,body.visitor-side-center .visitor-shell{width:auto;margin-left:14px;margin-right:14px}
    }
  `;
  document.head.appendChild(style);
}

function applyVisitorBackground(item) {
  let raw = {};
  try {
    raw = JSON.parse(item.description || "{}");
  } catch (error) {
    raw = {};
  }
  const config = {
    positionX: visitorNumber(raw.positionX, 0, 0, 100),
    positionY: visitorNumber(raw.positionY, 50, 0, 100),
    scale: visitorNumber(raw.scale, 90, 40, 200),
    imageOpacity: visitorNumber(raw.imageOpacity, 1, 0.1, 1),
    veil: visitorNumber(raw.veil, 0.08, 0, 0.9),
    contentSide: ["left", "right", "center"].includes(raw.contentSide) ? raw.contentSide : "right",
    theme: raw.theme === "dark" ? "dark" : "light"
  };

  injectVisitorBackgroundStyles();
  document.body.classList.add(
    "visitor-custom-active",
    `visitor-side-${config.contentSide}`,
    `visitor-theme-${config.theme}`
  );

  const background = document.createElement("div");
  background.className = "visitor-custom-background";
  background.style.backgroundImage = `url("${item.url}")`;
  background.style.backgroundSize = `${config.scale}% auto`;
  background.style.backgroundPosition = `${config.positionX}% ${config.positionY}%`;
  background.style.opacity = config.imageOpacity;

  const veil = document.createElement("div");
  veil.className = "visitor-custom-veil";
  veil.style.background =
    config.theme === "dark" ? `rgba(9,9,9,${config.veil})` : `rgba(248,248,246,${config.veil})`;

  document.body.prepend(veil);
  document.body.prepend(background);
}

async function loadVisitorBackground() {
  injectVisitorBackgroundStyles();
  document.body.classList.add("visitor-background-managed");
  try {
    const response = await fetch(`./api/media-list?visitor=${Date.now()}`, {
      cache: "no-store"
    });
    if (!response.ok) return;
    const result = await response.json();
    const item = (Array.isArray(result.data) ? result.data : []).find(
      media => media.kind === "asset" && media.title === VISITOR_BACKGROUND_TITLE && media.url
    );
    if (item) applyVisitorBackground(item);
  } catch (error) {
    // 保留页面默认背景，不影响访客浏览。
  }
}

loadVisitorBackground();
