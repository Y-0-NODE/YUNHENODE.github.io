const VISITOR_BACKGROUND_TITLE = "YUNHE_VISITOR_BACKGROUND";

function injectVisitorBrowseStyles() {
  if (document.getElementById("visitor-browse-styles")) return;
  const style = document.createElement("style");
  style.id = "visitor-browse-styles";
  style.textContent = `
    html.visitor-browse-mode{color-scheme:light!important;background:#fff!important}
    body.visitor-browse-mode{background:#fff!important;color:#111!important}
    body.visitor-browse-mode::before{display:none!important}
    body.visitor-browse-mode .topbar{background:rgba(255,255,255,.95)!important;border-bottom-color:#ddd!important;backdrop-filter:blur(12px)}
    body.visitor-browse-mode .topbar a,body.visitor-browse-mode .logo,body.visitor-browse-mode a{color:#111}
    body.visitor-browse-mode nav a{background:#fff!important;color:#111!important;border-color:#ddd!important}
    body.visitor-browse-mode .intro,body.visitor-browse-mode .status,body.visitor-browse-mode .eyebrow,body.visitor-browse-mode p{color:#444}
    body.visitor-browse-mode .card,body.visitor-browse-mode .article-row,body.visitor-browse-mode .work,body.visitor-browse-mode .mini-card,body.visitor-browse-mode .about-section,body.visitor-browse-mode .roadmap,body.visitor-browse-mode .route-step{background:#fff!important;color:#111!important;border-color:#ddd!important}
    body.visitor-browse-mode .card h2,body.visitor-browse-mode .article-row h2,body.visitor-browse-mode .work h2,body.visitor-browse-mode h1,body.visitor-browse-mode h2,body.visitor-browse-mode h3{color:#111!important}
    body.visitor-browse-mode .article-row h2{font-size:clamp(20px,2.2vw,32px)!important;line-height:1.25!important}
    body.visitor-browse-mode .reading-shell>h1{font-size:clamp(32px,4.2vw,60px)!important;line-height:1.12!important}
    body.visitor-browse-mode .article-row:visited,body.visitor-browse-mode .article-row:active{color:#111!important}
    body.visitor-browse-mode button,body.visitor-browse-mode input,body.visitor-browse-mode select{background:#fff!important;color:#111!important;border-color:#bbb!important}
    body.visitor-browse-mode .detail{background:rgba(255,255,255,.97)!important;color:#111!important}
    body.visitor-browse-mode .detail-media img,body.visitor-browse-mode .detail-media video{background:#f4f4f4!important}
    body.visitor-browse-mode .detail-meta,body.visitor-browse-mode .detail-bar{border-color:#ddd!important}
    body.visitor-browse-mode .detail-meta p,body.visitor-browse-mode .detail-side{color:#333!important}
    body.visitor-browse-mode .reading-shell{--bg:#fff;--surface:#fff;--line:#ddd;--text:#111;--muted:#666;--soft:#333;--accent:#111;background:#fff!important;color:#111!important}
    body.visitor-browse-mode .article-body,body.visitor-browse-mode .article-body p{color:#222!important}
    body.visitor-browse-mode .topbar nav a[href*="video.html"],body.visitor-browse-mode .topbar nav a[href*="thought.html"]{display:none}
  `;
  document.head.appendChild(style);
}

function visitorModeEnabled() {
  const entrance = Boolean(document.querySelector(".visitor-shell"));
  const queryMode = new URLSearchParams(location.search).get("visitor") === "1";
  return entrance || queryMode;
}

function markVisitorLinks() {
  document.querySelectorAll("a[href]").forEach(link => {
    const href = link.getAttribute("href") || "";
    if (!href || href.startsWith("#") || /^(mailto:|tel:|https?:|javascript:)/i.test(href)) return;
    if (/admin|manage|login|publish|design-settings|media-center/i.test(href)) return;
    if (/^index\.html(?:$|[?#])/.test(href)) {
      link.setAttribute("href", "visitor.html");
      return;
    }
    if (!href.includes(".html")) return;
    const url = new URL(href, location.href);
    url.searchParams.set("visitor", "1");
    link.setAttribute("href", `${url.pathname.split("/").pop()}${url.search}${url.hash}`);
  });
}

function enableVisitorBrowseMode() {
  if (!visitorModeEnabled()) return;
  document.documentElement.classList.add("visitor-browse-mode");
  document.body.classList.add("visitor-browse-mode");
  injectVisitorBrowseStyles();
  markVisitorLinks();
  new MutationObserver(markVisitorLinks).observe(document.body, { childList: true, subtree: true });
}

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
    .visitor-custom-veil{background:rgba(255,255,255,.08)}
    body.visitor-custom-active .visitor-shell{position:relative;z-index:1}
    body.visitor-custom-active .topbar{z-index:10}
    body.visitor-side-left .visitor-shell{margin-left:clamp(20px,7vw,110px);margin-right:auto}
    body.visitor-side-right .visitor-shell{margin-left:auto;margin-right:clamp(20px,7vw,110px)}
    body.visitor-side-center .visitor-shell{margin-left:auto;margin-right:auto}
    body.visitor-theme-light{background:#fff!important;color:#111!important}
    body.visitor-theme-light .topbar{background:rgba(255,255,255,.92)!important;border-bottom-color:rgba(0,0,0,.14)!important;backdrop-filter:blur(12px)}
    body.visitor-theme-light .topbar a{color:#111!important}
    body.visitor-theme-light .visitor-hero{border-bottom-color:rgba(0,0,0,.18)!important}
    body.visitor-theme-light .visitor-hero p{color:#343434!important}
    body.visitor-theme-light .visitor-card{border-color:rgba(0,0,0,.18)!important;background:rgba(255,255,255,.88)!important;color:#111!important;backdrop-filter:blur(10px)}
    body.visitor-theme-light .visitor-card p{color:#444!important}
    body.visitor-theme-light .visitor-card span,body.visitor-theme-light .visitor-note,body.visitor-theme-light .eyebrow{color:#555!important}
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
    contentSide: "center",
    theme: "light"
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
  veil.style.background = `rgba(255,255,255,${config.veil})`;

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

const FEATURED_CONTENT = {
  primary: [
    {
      title: "谁掌握了节点定义权，谁就更接近定义现实",
      summary: "从真实事件进入核心概念、结构模型与判断总结。"
    },
    {
      title: "从12345反馈到“个人问题”：一次公共系统责任下沉机制的结构分析",
      summary: "持续跟踪现实系统、部门边界和责任如何被转译。"
    },
    {
      title: "如何识别虚假的结构内容",
      summary: "辨认结构语言、真实判断与表面包装之间的区别。"
    }
  ],
  observation: [
    {
      title: "新人不要在小区门口做，这里是存量区。",
      summary: "从具体事件提炼“存量区／开放区”的可复用判断模型。"
    },
    {
      title: "Case 001 / BO H5 Modular Upgrade",
      displayTitle: "BO H5模块化升级：从结构判断到验证",
      aliases: ["BO H5模块化升级：从结构判断到验证"],
      summary: "项目背景、结构调整、修改前后对比、验证过程与最终结果。"
    }
  ],
  extended: [
    {
      title: "艺术系统 vs 商业系统",
      summary: "从艺术与商业的不同运行逻辑理解价值和判断。"
    },
    {
      title: "为什么商业不生产“真正需要的东西”？",
      summary: "继续进入商业、消费与需求结构的关系。"
    }
  ]
};

function normalizeFeaturedTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[《》“”"'：:，,。.!！?？/\s-]/g, "");
}

function featuredUrl(item) {
  const target = item.slug
    ? `content.html?slug=${encodeURIComponent(item.slug)}`
    : `content.html?id=${encodeURIComponent(item.id)}`;
  return `${target}&visitor=1&curated=1`;
}

function renderVisitorCategories(items) {
  const box = document.getElementById("visitor-category-list");
  if (!box || !window.YunheTaxonomy) return;
  const escape = window.YunheUtils?.escapeHtml || (value => String(value || ""));
  const articles = items.filter(item => item.type === "article");

  box.innerHTML = window.YunheTaxonomy.groups
    .map(
      group => `
        <section class="visitor-category-group">
          <div class="visitor-category-group-head">
            <h3>${escape(group.name)}</h3>
            <p>${escape(group.description)}</p>
          </div>
          <div class="visitor-topic-grid">
            ${group.items
              .map(item => {
                const count = articles.filter(
                  article => window.YunheTaxonomy.classifyContent(article) === item.name
                ).length;
                return `
                  <a class="visitor-topic" href="article-topic.html?topic=${encodeURIComponent(item.name)}&visitor=1">
                    <span>${count} 篇</span>
                    <strong>${escape(item.name)}</strong>
                    <small>${escape(item.description)}</small>
                  </a>
                `;
              })
              .join("")}
          </div>
        </section>
      `
    )
    .join("");
}

function renderFeaturedGroup(groupName, items) {
  const box = document.getElementById(`featured-${groupName}`);
  if (!box) return;
  const escape = window.YunheUtils?.escapeHtml || (value => String(value || ""));
  const definitions = FEATURED_CONTENT[groupName] || [];
  box.innerHTML = definitions
    .map(definition => {
      const keys = [definition.title, ...(definition.aliases || [])].map(normalizeFeaturedTitle);
      const item = items.find(row => keys.includes(normalizeFeaturedTitle(row.title)));
      if (!item) return "";
      const title = definition.displayTitle || item.title;
      const topic = window.YunheTaxonomy?.classifyContent(item) || item.topic || "未分类";
      const type = item.type === "case" ? "CASE" : "ARTICLE";
      return `
        <a class="featured-card" href="${featuredUrl(item)}">
          <div>
            <div class="featured-meta">${type} / ${escape(topic)} / 访客整理版</div>
            <h4>${escape(title)}</h4>
            <p>${escape(definition.summary || item.intro || "")}</p>
          </div>
          <time class="featured-date">${escape(String(item.created_at || "").slice(0, 10))}</time>
        </a>
      `;
    })
    .filter(Boolean)
    .join("");
  if (!box.innerHTML.trim()) box.innerHTML = '<p class="featured-loading">内容整理中。</p>';
}

async function loadFeaturedContent() {
  if (!document.getElementById("featured-primary") || !window.YUNHE_CONFIG) return;
  const { supabaseUrl, supabaseKey } = window.YUNHE_CONFIG;
  try {
    const query =
      "select=id,title,slug,intro,type,topic,created_at&type=in.(article,case)&order=created_at.desc";
    const response = await fetch(`${supabaseUrl}/rest/v1/contents?${query}`, {
      cache: "no-store",
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    if (!response.ok) throw new Error("featured load failed");
    const result = await response.json();
    const items = Array.isArray(result) ? result : [];
    renderVisitorCategories(items);
    renderFeaturedGroup("primary", items);
    renderFeaturedGroup("observation", items);
    renderFeaturedGroup("extended", items);
  } catch (error) {
    const categoryBox = document.getElementById("visitor-category-list");
    if (categoryBox) {
      categoryBox.innerHTML = '<p class="featured-loading">文章分类暂时无法读取。</p>';
    }
    document.querySelectorAll(".featured-list").forEach(box => {
      box.innerHTML = '<p class="featured-loading">精选内容暂时无法读取。</p>';
    });
  }
}

enableVisitorBrowseMode();
if (document.querySelector(".visitor-shell")) {
  loadVisitorBackground();
  loadFeaturedContent();
}
