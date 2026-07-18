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
    renderFeaturedGroup("primary", items);
    renderFeaturedGroup("observation", items);
    renderFeaturedGroup("extended", items);
  } catch (error) {
    document.querySelectorAll(".featured-list").forEach(box => {
      box.innerHTML = '<p class="featured-loading">精选内容暂时无法读取。</p>';
    });
  }
}

function visitorLogElements() {
  return {
    panel: document.getElementById("visitor-log-panel"),
    trigger: null,
    form: document.getElementById("visitor-log-form"),
    status: document.getElementById("visitor-log-status")
  };
}

function visitorToolsElements() {
  return {
    panel: document.getElementById("visitor-tools-panel"),
    trigger: document.querySelector(".visitor-tools-trigger")
  };
}

function setVisitorTools(open) {
  const { panel, trigger } = visitorToolsElements();
  if (!panel) return;
  panel.hidden = !open;
  panel.setAttribute("aria-hidden", String(!open));
  trigger?.setAttribute("aria-expanded", String(open));
}

function toggleVisitorTools() {
  const { panel } = visitorToolsElements();
  setVisitorTools(Boolean(panel?.hidden));
}

function chooseVisitorTool(type) {
  setVisitorTools(false);
  if (type === "log") openVisitorLog();
  if (type === "assistant") openVisitorAssistant();
}

function openVisitorLog() {
  const { panel, trigger } = visitorLogElements();
  if (!panel) return;
  panel.hidden = false;
  panel.setAttribute("aria-hidden", "false");
  trigger?.setAttribute("aria-expanded", "true");
  window.setTimeout(() => document.getElementById("visitor-log-source")?.focus(), 20);
}

function closeVisitorLog() {
  const { panel, trigger } = visitorLogElements();
  if (!panel) return;
  panel.hidden = true;
  panel.setAttribute("aria-hidden", "true");
  trigger?.setAttribute("aria-expanded", "false");
}

async function submitVisitorLog(event) {
  event.preventDefault();
  const { form, status } = visitorLogElements();
  if (!form || !window.YUNHE_CONFIG) return;

  const formData = new FormData(form);
  const payload = {
    display_name: String(formData.get("display_name") || "").trim() || null,
    source: String(formData.get("source") || "").trim(),
    purpose: String(formData.get("purpose") || "").trim(),
    message: String(formData.get("message") || "").trim() || null,
    page_url: location.href,
    user_agent: navigator.userAgent
  };

  if (!payload.source || !payload.purpose) {
    if (status) status.textContent = "请选择来源和进入目的。";
    return;
  }

  if (status) status.textContent = "正在提交…";
  const { supabaseUrl, supabaseKey } = window.YUNHE_CONFIG;
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/visitor_logs`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("登记失败");
    form.reset();
    if (status) status.textContent = "已提交，谢谢。";
    window.setTimeout(closeVisitorLog, 900);
  } catch (error) {
    if (status) status.textContent = "暂时提交失败，请稍后再试。";
  }
}

function initVisitorLog() {
  const { form, panel } = visitorLogElements();
  form?.addEventListener("submit", submitVisitorLog);
  panel?.addEventListener("click", event => {
    if (event.target === panel) closeVisitorLog();
  });
  window.addEventListener("keydown", event => {
    if (event.key === "Escape") closeVisitorLog();
  });
}

const VISITOR_ASSISTANT_ANSWERS = {
  current:
    "访客入口当前在做一件事：把云鹤系统公开内容整理成一条可阅读路径。\n\n你可以先看重点文章，理解“节点定义权”“公共系统责任下沉”“虚假结构内容识别”这些核心判断；再看现实观察与案例；最后延伸到艺术、商业和消费结构。",
  cases:
    "当前推荐从这两个方向进入案例：\n\n1.《新人不要在小区门口做，这里是存量区。》：适合理解存量区 / 开放区的现实判断。\n2.《BO H5模块化升级：从结构判断到验证》：适合看项目如何从判断进入修改、对比和验证。\n\n你可以点击访客入口里的“现实观察与案例”继续阅读。",
  start:
    "建议阅读顺序：\n\n1. 先读“重点文章”，理解云鹤系统的判断方式。\n2. 再读“现实观察与案例”，看概念如何落到具体事件。\n3. 然后看“作品”，理解视觉记录和内容系统的关系。\n4. 最后看“关于”，确认方法、边界和合作方式。",
  system:
    "云鹤系统不是普通博客分类，而是一套观察现实结构的内容系统。\n\n它关心：谁定义问题、责任如何转移、系统如何组织人和资源、内容如何从现象进入判断，再进入案例和验证。",
  course:
    "地理课程相关问题目前只做咨询说明，不在这里展开外部闲聊。\n\n现阶段可以回答：课程目录、适合谁、如何购买、如何从公开文章进入课程理解。后续如果你开放课程页面，阅读助手可以只引用课程页面内容回答。"
};

function visitorAssistantElements() {
  return {
    panel: document.getElementById("visitor-assistant-panel"),
    trigger: null,
    form: document.getElementById("visitor-assistant-form"),
    input: document.getElementById("visitor-assistant-input"),
    conversation: document.getElementById("visitor-assistant-conversation")
  };
}

function openVisitorAssistant() {
  const { panel, trigger, input } = visitorAssistantElements();
  if (!panel) return;
  panel.hidden = false;
  panel.setAttribute("aria-hidden", "false");
  trigger?.setAttribute("aria-expanded", "true");
  window.setTimeout(() => input?.focus(), 20);
}

function closeVisitorAssistant() {
  const { panel, trigger } = visitorAssistantElements();
  if (!panel) return;
  panel.hidden = true;
  panel.setAttribute("aria-hidden", "true");
  trigger?.setAttribute("aria-expanded", "false");
}

function classifyVisitorQuestion(question) {
  const text = String(question || "").trim();
  if (!text) return "start";
  if (/^(你好|您好|嗨|哈喽|hello|hi|在吗)[！!。.，,\s]*$/i.test(text)) return "greeting";
  if (/谢谢|多谢|感谢/.test(text)) return "thanks";
  if (/这篇|当前|讨论|讲什么|内容/.test(text)) return "current";
  if (/案例|相关|BO|H5|小区|存量/.test(text)) return "cases";
  if (/开始|路线|先看|阅读|入口/.test(text)) return "start";
  if (/云鹤系统|是什么|方法|结构/.test(text)) return "system";
  if (/课程|地理|购买|价格|目录/.test(text)) return "course";
  if (/文章|作品|摄影|关于|访客/.test(text)) return "start";
  return "boundary";
}

const VISITOR_ASSISTANT_PROMPTS = {
  current: "这篇内容在讨论什么？",
  cases: "有哪些相关案例？",
  start: "我应该从哪里开始阅读？",
  system: "云鹤系统是什么？",
  course: "地理课程包含什么？"
};

const VISITOR_ASSISTANT_SMALL_TALK = {
  greeting:
    "你好，我在。你可以告诉我现在更想看文章、案例还是作品，我会帮你找到合适的阅读入口。",
  thanks: "不客气。你还可以继续问我某个主题有什么文章，或者下一步适合读什么。"
};

function appendAssistantMessage(role, text) {
  const { conversation } = visitorAssistantElements();
  if (!conversation) return;
  const item = document.createElement("div");
  item.className = `assistant-message assistant-message--${role}`;
  const content = document.createElement("p");
  content.textContent = text;
  if (role === "bot") {
    const avatar = document.createElement("span");
    avatar.textContent = "鹤";
    item.append(avatar);
  }
  item.append(content);
  conversation.append(item);
  conversation.scrollTo({ top: conversation.scrollHeight, behavior: "smooth" });
}

function answerVisitorAssistant(questionKeyOrText, options = {}) {
  const raw = String(questionKeyOrText || "").trim();
  const displayQuestion = VISITOR_ASSISTANT_PROMPTS[raw] || raw;
  if (options.echo !== false && displayQuestion) appendAssistantMessage("user", displayQuestion);
  const key = VISITOR_ASSISTANT_ANSWERS[questionKeyOrText]
    ? questionKeyOrText
    : classifyVisitorQuestion(questionKeyOrText);
  const reply =
    VISITOR_ASSISTANT_ANSWERS[key] ||
    VISITOR_ASSISTANT_SMALL_TALK[key] ||
    "这个问题超出了当前阅读助手的范围。\n\n我这里只回答云鹤系统公开访客入口相关内容：文章、案例、作品、关于说明、课程目录和购买咨询。外部知识、闲聊、通用问答不会在这里展开。";
  window.setTimeout(() => appendAssistantMessage("bot", reply), 180);
}

function initVisitorAssistant() {
  const { form, panel, input } = visitorAssistantElements();
  document.querySelectorAll("[data-assistant-question]").forEach(button => {
    button.addEventListener("click", () =>
      answerVisitorAssistant(button.dataset.assistantQuestion)
    );
  });
  form?.addEventListener("submit", event => {
    event.preventDefault();
    const question = input?.value.trim() || "";
    if (!question) return;
    answerVisitorAssistant(question);
    input.value = "";
  });
  panel?.addEventListener("click", event => {
    if (event.target === panel) closeVisitorAssistant();
  });
  window.addEventListener("keydown", event => {
    if (event.key === "Escape") closeVisitorAssistant();
  });
}

function initVisitorTools() {
  document.addEventListener("click", event => {
    const { panel, trigger } = visitorToolsElements();
    if (!panel || panel.hidden) return;
    if (panel.contains(event.target) || trigger?.contains(event.target)) return;
    setVisitorTools(false);
  });
  window.addEventListener("keydown", event => {
    if (event.key === "Escape") setVisitorTools(false);
  });
}

enableVisitorBrowseMode();
initVisitorTools();
initVisitorLog();
initVisitorAssistant();
if (document.querySelector(".visitor-shell")) {
  loadVisitorBackground();
  loadFeaturedContent();
}

window.openVisitorLog = openVisitorLog;
window.closeVisitorLog = closeVisitorLog;
window.openVisitorAssistant = openVisitorAssistant;
window.closeVisitorAssistant = closeVisitorAssistant;
window.toggleVisitorTools = toggleVisitorTools;
window.chooseVisitorTool = chooseVisitorTool;
