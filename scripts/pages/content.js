const SUPABASE_URL = window.YUNHE_CONFIG.supabaseUrl;
const SUPABASE_KEY = window.YUNHE_CONFIG.supabaseKey;

const params = new URLSearchParams(location.search);
const slug = params.get("slug");
const id = params.get("id");

const SITE_DESIGN_KEY = "yunhe.site.design.v1";
const SECTION_RE =
  /^(Problem|Analysis|Decision|Validation|系统分析|排查流程|沟通策略|GitHub|Supabase|Vercel|Codex)(（[^）]+）|\([^)]*\))?$/i;
const META_RE = /^(主题|类型|编号|状态|日期)：/;

function applyDesign() {
  const design = JSON.parse(localStorage.getItem(SITE_DESIGN_KEY) || "{}");
  const root = document.documentElement;

  if (design.theme === "light") {
    root.style.setProperty("--bg", "#f6f4ef");
    root.style.setProperty("--surface", "#ffffff");
    root.style.setProperty("--line", "#d9d4c8");
    root.style.setProperty("--text", "#111111");
    root.style.setProperty("--muted", "#6d6a63");
    root.style.setProperty("--soft", "#333333");
    root.style.colorScheme = "light";
  }

  if (design.accent) root.style.setProperty("--accent", design.accent);
  if (design.backgroundUrl) root.style.setProperty("--bg-image", `url("${design.backgroundUrl}")`);
  if (design.backgroundOpacity) root.style.setProperty("--bg-opacity", design.backgroundOpacity);
}

function setTitle(text) {
  document.getElementById("title").innerText = text;
}

const escapeHtml = window.YunheUtils.escapeHtml;

function splitTitle(title) {
  const text = String(title || "").trim();
  const match = text.match(/^(.*?)\s*(——|—|-)\s*(.+)$/);
  if (!match) return { title: text, subtitle: "" };
  return {
    title: match[1].trim() || text,
    subtitle: match[3].trim()
  };
}

function readMeta(raw) {
  return window.YunheMetadata.content.parse(raw);
}

function cleanBody(raw) {
  return window.YunheMetadata.content.strip(raw);
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

function findOriginalLink(raw) {
  const match = String(raw || "").match(/原文链接[：:]\s*(https?:\/\/\S+)/);
  return match ? match[1].trim() : "";
}

function sourceLabel(meta, raw) {
  const link = findOriginalLink(raw);
  const source = String(meta.source || "").trim();
  if (/mp\.weixin\.qq\.com/.test(link)) return "云鹤系统公众号转载";
  return source || "本站撰写";
}

function renderMeta(meta, createdAt, raw) {
  const items = [];
  if (meta.originalDate) items.push(`原始撰写时间：${formatDate(meta.originalDate)}`);
  if (createdAt) items.push(`入库时间：${formatDate(createdAt)}`);
  items.push(`来源：${sourceLabel(meta, raw)}`);
  const text = items.join("　/　");
  document.getElementById("meta-top").textContent = text;
  document.getElementById("meta-footer").textContent = text ? `记录信息：${text}` : "";
}

function buildQuery() {
  if (slug) return `slug=eq.${encodeURIComponent(slug)}`;
  if (id) return `id=eq.${encodeURIComponent(id)}`;
  return "";
}

function lineType(line, index) {
  if (parseMediaLine(line)) return "media";
  if (index === 0 && /^Case\s+\d+/i.test(line)) return "doc-title";
  if (/^#{1,3}\s+/.test(line)) return "markdown-heading";
  if (SECTION_RE.test(line)) return "section-title";
  if (META_RE.test(line)) return "meta-line";
  if (/^\d+[.、]/.test(line)) return "numbered";
  if (line.length <= 28 && /[:：]$/.test(line)) return "sub-title";
  return "paragraph";
}

function parseMediaLine(line) {
  const mediaMatch = line.match(
    /^\[(image|video|图片|视频)(?::\s*([^\]]+))?\]\((https?:\/\/[^)]+)\)$/i
  );
  const markdownImage = line.match(/^!\[([^\]]*)\]\((https?:\/\/[^)]+)\)$/i);

  if (mediaMatch) {
    const kind = /video|视频/i.test(mediaMatch[1]) ? "video" : "image";
    return {
      kind,
      caption: mediaMatch[2] || "",
      url: mediaMatch[3]
    };
  }

  if (markdownImage) {
    const url = markdownImage[2];
    const kind = /\.(mp4|webm|mov)(\?|$)/i.test(url) ? "video" : "image";
    return {
      kind,
      caption: markdownImage[1] || "",
      url
    };
  }

  return null;
}

function parseSourceLink(line) {
  return String(line || "").match(/^原文链接[：:]\s*(https?:\/\/\S+)$/);
}

function renderMedia(line) {
  const media = parseMediaLine(line);
  if (!media) return "";

  const url = escapeHtml(media.url);
  const caption = escapeHtml(media.caption);
  const captionHtml = caption ? `<figcaption>${caption}</figcaption>` : "";

  if (media.kind === "video") {
    return `<figure class="media-block"><video src="${url}" controls playsinline preload="metadata"></video>${captionHtml}</figure>`;
  }

  return `<figure class="media-block"><img src="${url}" alt="${caption || "文章图片"}" loading="lazy">${captionHtml}</figure>`;
}

function renderBody(raw) {
  const lines = String(raw || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    document.getElementById("body").innerHTML = `<p class="empty">暂无正文。</p>`;
    return;
  }

  document.getElementById("body").innerHTML = lines
    .map((line, index) => {
      const type = lineType(line, index);
      const sourceMatch = parseSourceLink(line);
      if (sourceMatch) {
        const url = escapeHtml(sourceMatch[1]);
        return `<p class="source-link">原文链接：<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></p>`;
      }

      const safe = escapeHtml(line);

      if (type === "media") return renderMedia(line);

      if (type === "numbered") {
        const match = safe.match(/^(\d+[.、])\s*(.*)$/);
        return `<p class="numbered"><span>${match?.[1] || ""}</span><b>${match?.[2] || safe}</b></p>`;
      }

      if (type === "markdown-heading") {
        const level = (line.match(/^#+/) || [""])[0].length;
        const text = escapeHtml(line.replace(/^#{1,3}\s+/, ""));
        if (level === 1) return `<h2 class="doc-title">${text}</h2>`;
        if (level === 2) return `<h3 class="section-title">${text}</h3>`;
        return `<h4 class="sub-title">${text}</h4>`;
      }

      if (type === "doc-title") return `<h2 class="doc-title">${safe}</h2>`;
      if (type === "section-title") return `<h3 class="section-title">${safe}</h3>`;
      if (type === "sub-title") return `<h4 class="sub-title">${safe}</h4>`;
      if (type === "meta-line") return `<p class="meta-line">${safe}</p>`;
      return `<p class="paragraph">${safe}</p>`;
    })
    .join("");
}

function paywallConfig(meta) {
  const allowed = new Set(["9.9", "19.9", "29.9", "59", "99", "199"]);
  const source = meta?.paywall || {};
  const price = allowed.has(String(source.price)) ? String(source.price) : "9.9";
  return {
    enabled: Boolean(source.enabled),
    price
  };
}

async function loadPaymentOptions(price) {
  const fallback = {
    wechat: "",
    alipay: "",
    note: "扫码付款后，请保留付款截图，并通过“关于”页面的联系方式与我联系。"
  };
  try {
    const response = await fetch(`./api/media-list?includeSettings=1&payment=${Date.now()}`, {
      cache: "no-store"
    });
    if (!response.ok) return fallback;
    const result = await response.json();
    const record = (Array.isArray(result.data) ? result.data : []).find(
      item => item.title === "YUNHE_PAYMENT_SETTINGS"
    );
    if (!record?.description) return fallback;
    const settings = JSON.parse(record.description);
    const tier = settings.tiers?.[price] || {};
    return {
      wechat: String(tier.wechat || ""),
      alipay: String(tier.alipay || ""),
      note: String(settings.note || fallback.note)
    };
  } catch (error) {
    return fallback;
  }
}

function closePaywallWindow() {
  const windowElement = document.getElementById("paywall-window");
  if (!windowElement) return;
  windowElement.hidden = true;
  windowElement.setAttribute("aria-hidden", "true");
  document.body.classList.remove("paywall-window-open");
}

function openPaywallWindow() {
  const windowElement = document.getElementById("paywall-window");
  if (!windowElement) return;
  windowElement.hidden = false;
  windowElement.setAttribute("aria-hidden", "false");
  document.body.classList.add("paywall-window-open");
  windowElement.querySelector(".paywall-close")?.focus();
}

function renderPaywall(config) {
  const methods = [
    { key: "wechat", label: "微信支付", url: config.wechat },
    { key: "alipay", label: "支付宝", url: config.alipay }
  ].filter(method => method.url);
  const paymentChoices = methods.length
    ? methods
        .map(
          method => `
            <article class="paywall-method">
              <h3>${method.label}</h3>
              <img src="${escapeHtml(method.url)}" alt="${method.label} ¥${escapeHtml(config.price)} 二维码" loading="eager">
            </article>
          `
        )
        .join("")
    : '<p class="paywall-qr-missing">这个价位的付款二维码还没有上传，请通过“关于”页面联系作者。</p>';
  document.getElementById("body").innerHTML = `
    <section class="paywall-gate" aria-label="付费阅读">
      <p class="paywall-kicker">PAID READING / 付费阅读</p>
      <h2>这篇文章需要付费阅读</h2>
      <p>当前页面保留文章标题与摘要，付款确认后可获取完整内容。</p>
      <div class="paywall-price"><span>阅读价格</span><strong>¥${escapeHtml(config.price)}</strong></div>
      <button type="button" onclick="openPaywallWindow()">查看付款二维码</button>
    </section>
    <div id="paywall-window" class="paywall-window" role="dialog" aria-modal="true" aria-hidden="true" aria-label="付款二维码窗口" hidden>
      <div class="paywall-window-card">
        <button class="paywall-close" type="button" onclick="closePaywallWindow()" aria-label="关闭付款窗口">×</button>
        <p class="paywall-kicker">YUNHENODE PAID READING</p>
        <h2>扫码付款 ¥${escapeHtml(config.price)}</h2>
        <div class="paywall-methods">${paymentChoices}</div>
        <p class="paywall-note">${escapeHtml(config.note)}</p>
        <a href="about.html?visitor=1#contact">前往联系方式</a>
      </div>
    </div>
  `;
  document.getElementById("paywall-window")?.addEventListener("click", event => {
    if (event.target.id === "paywall-window") closePaywallWindow();
  });
}

applyDesign();

const query = buildQuery();

if (!query) {
  setTitle("未找到文章");
  throw new Error("missing article id");
}

fetch(
  `${SUPABASE_URL}/rest/v1/contents?select=title,intro,body,type,topic,created_at&${query}&limit=1`,
  {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  }
)
  .then(res => {
    if (!res.ok) throw new Error("load failed");
    return res.json();
  })
  .then(async data => {
    if (!data || data.length === 0) {
      setTitle("文章不存在");
      return;
    }

    const post = data[0];
    const parts = splitTitle(post.title);
    const meta = readMeta(post.body || "");
    const subtitle = meta.subtitle || parts.subtitle || "";
    document.querySelector(".kicker").innerText =
      `YUNHENODE / ${post.type || "CONTENT"} / ${post.topic || "未分类"}`;
    document.getElementById("title").innerText = parts.title || "无标题";
    document.getElementById("subtitle").innerText = subtitle;
    document.getElementById("intro").innerText =
      post.intro && post.intro !== subtitle ? post.intro : "";
    const body = cleanBody(post.body || "");
    renderMeta(meta, post.created_at, body);
    const paywall = paywallConfig(meta);
    if (post.type === "article" && paywall.enabled) {
      const paymentOptions = await loadPaymentOptions(paywall.price);
      renderPaywall({ ...paywall, ...paymentOptions });
    } else renderBody(body);
    renderArticleTools(post);
  })
  .catch(err => {
    console.error(err);
    setTitle("加载失败");
  });

function renderArticleTools(post) {
  const tools = document.getElementById("manage-tools");
  const backLink = document.getElementById("back-link");
  const visitorMode = new URLSearchParams(location.search).get("visitor") === "1";
  const listUrl =
    post.type === "case"
      ? "case-list.html"
      : post.type === "video"
        ? "video-list.html"
        : "article-list.html";
  backLink.href = visitorMode ? "visitor.html?visitor=1" : listUrl;
  backLink.textContent = visitorMode ? "YUNHENODE" : "返回列表";
  backLink.setAttribute("aria-label", visitorMode ? "返回访客入口" : "返回列表");
  tools.hidden = true;
  tools.innerHTML = "";
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closePaywallWindow();
});
