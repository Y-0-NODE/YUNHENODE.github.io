(function initializeHome() {
  "use strict";

  const config = window.YUNHE_CONFIG;
  const { escapeHtml, formatDate } = window.YunheUtils;
  const typeNames = { article: "文章", case: "案例", photo: "摄影", video: "影像" };
  const publicMediaApi = "https://yunhenode-github-io-qwu7.vercel.app/api/media-list";

  function contentUrl(content) {
    const query = content.slug
      ? `slug=${encodeURIComponent(content.slug)}`
      : `id=${encodeURIComponent(content.id)}`;
    return `content.html?${query}`;
  }

  function formatArchiveDate(value) {
    const formatted = formatDate(value);
    return formatted ? formatted.replaceAll("-", ".").replaceAll("/", ".") : "未标注";
  }

  function formatArchiveStatusDate(value) {
    const formatted = formatDate(value);
    const parts = String(formatted || "").match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (!parts) return "暂无更新时间";
    return `${parts[1]} 年 ${Number(parts[2])} 月 ${Number(parts[3])} 日`;
  }

  function workUrl() {
    return "gallery.html";
  }

  async function fetchContents() {
    const query =
      "select=id,title,slug,intro,topic,type,created_at&type=in.(article,case)&order=created_at.desc&limit=60";
    const response = await fetch(`${config.supabaseUrl}/rest/v1/contents?${query}`, {
      cache: "no-store",
      headers: {
        apikey: config.supabaseKey,
        Authorization: `Bearer ${config.supabaseKey}`
      }
    });
    if (!response.ok) throw new Error(`contents HTTP ${response.status}`);
    return response.json();
  }

  async function fetchKnowledgeCards() {
    const query =
      "select=id,title,slug,intro,topic,created_at&type=eq.knowledge_card&order=created_at.desc&limit=6";
    try {
      const response = await fetch(`${config.supabaseUrl}/rest/v1/contents?${query}`, {
        cache: "no-store",
        headers: {
          apikey: config.supabaseKey,
          Authorization: `Bearer ${config.supabaseKey}`
        }
      });
      if (!response.ok) return [];
      const rows = await response.json();
      return Array.isArray(rows) ? rows : [];
    } catch (error) {
      return [];
    }
  }

  async function fetchWorks() {
    try {
      const response = await fetch(`./api/media-list?archive=${Date.now()}`, { cache: "no-store" });
      const result = response.ok
        ? await response.json()
        : await fetch(`${publicMediaApi}?archive=${Date.now()}`, { cache: "no-store" }).then(res =>
            res.ok ? res.json() : { data: [] }
          );
      return Array.isArray(result.data)
        ? result.data.filter(item => ["photo", "video"].includes(item.kind))
        : [];
    } catch (error) {
      return [];
    }
  }

  function updateArchiveStatus(contents, works) {
    const articles = contents.filter(item => item.type === "article");
    const cases = contents.filter(item => item.type === "case");
    const dates = [...contents, ...works]
      .map(item => item.shot_at || item.created_at)
      .filter(Boolean)
      .sort()
      .reverse();
    document.getElementById("archive-articles").textContent = `已归档 ${articles.length} 篇文章`;
    document.getElementById("archive-cases").textContent = `已归档 ${cases.length} 个案例`;
    document.getElementById("archive-works").textContent = `已归档 ${works.length} 项作品`;
    document.getElementById("archive-updated").textContent = dates[0]
      ? `更新于 ${formatArchiveStatusDate(dates[0])}`
      : "暂无更新时间";
    document.getElementById("archive-status-note").textContent =
      "档案状态会随公开文章、案例和作品持续更新。";
  }

  function archiveItems(contents, works) {
    const contentItems = contents.map(content => ({
      title: content.title,
      summary: content.intro || content.topic || "暂无摘要",
      type: content.type,
      date: content.created_at,
      href: contentUrl(content)
    }));
    const workItems = works.map(work => ({
      title: work.title || "未命名作品",
      summary: work.description || "摄影与视觉作品归档。",
      type: work.kind === "video" ? "video" : "photo",
      date: work.shot_at || work.created_at,
      href: workUrl(work)
    }));
    return [...contentItems, ...workItems]
      .filter(item => item.title && item.date)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
      .slice(0, 8);
  }

  function renderLatestArchive(items) {
    const status = document.getElementById("latest-status");
    const box = document.getElementById("latest");
    if (!items.length) {
      status.textContent = "暂无公开归档。";
      box.innerHTML = "";
      return;
    }
    status.textContent = "";
    box.innerHTML = items
      .map(
        item => `
        <a class="archive-row" href="${escapeHtml(item.href)}">
          <time datetime="${escapeHtml(item.date)}">${formatArchiveDate(item.date)}</time>
          <span>${escapeHtml(typeNames[item.type] || "归档")}</span>
          <h3>《${escapeHtml(item.title)}》</h3>
          <p>${escapeHtml(item.summary || "")}</p>
        </a>
      `
      )
      .join("");
  }

  const knowledgeGuideCards = [
    {
      topic: "Observation",
      title: "观察",
      intro: "记录一个还没有结论、但值得继续追踪的现象。"
    },
    {
      topic: "Decision",
      title: "判断",
      intro: "把随笔里的直觉压缩成一句可以被验证的核心判断。"
    },
    {
      topic: "Connection",
      title: "关联",
      intro: "连接文章、案例与摄影材料，让一张卡片拥有现实依据。"
    }
  ];

  function renderKnowledgeCards(cards) {
    const box = document.getElementById("knowledge-card-list");
    const status = document.getElementById("knowledge-card-status");
    const items = cards.length ? cards : knowledgeGuideCards;
    box.innerHTML = items
      .map((card, index) => {
        const guide = !cards.length;
        const tag = escapeHtml(card.topic || "知识卡片");
        const title = escapeHtml(card.title || "未命名卡片");
        const intro = escapeHtml(card.intro || "等待补充核心判断。");
        const date = guide ? "SYSTEM GUIDE" : formatArchiveDate(card.created_at);
        const inner = `
          <div class="knowledge-card-meta"><span>${String(index + 1).padStart(2, "0")}</span><span>${tag}</span></div>
          <h3>${title}</h3>
          <p>${intro}</p>
          <footer><span>${escapeHtml(date)}</span><span>${guide ? "整理方法" : "打开卡片 →"}</span></footer>
        `;
        if (guide) return `<article class="knowledge-card is-guide">${inner}</article>`;
        return `<a class="knowledge-card" href="${escapeHtml(contentUrl(card))}">${inner}</a>`;
      })
      .join("");
    status.textContent = cards.length
      ? `展示最近 ${cards.length} 张知识卡片。`
      : "建立第一张卡片后，这里会自动替换为真实内容。";
  }

  async function loadArchive() {
    const latestStatus = document.getElementById("latest-status");
    const archiveStatus = document.getElementById("archive-status-note");
    try {
      const [contents, works, knowledgeCards] = await Promise.all([
        fetchContents(),
        fetchWorks(),
        fetchKnowledgeCards()
      ]);
      const safeContents = Array.isArray(contents) ? contents : [];
      const safeWorks = Array.isArray(works) ? works : [];
      updateArchiveStatus(safeContents, safeWorks);
      renderLatestArchive(archiveItems(safeContents, safeWorks));
      renderKnowledgeCards(knowledgeCards);
    } catch (error) {
      latestStatus.textContent = "最新归档读取失败。";
      archiveStatus.textContent = "档案状态暂时无法读取。";
      renderKnowledgeCards([]);
    }
  }

  window.enterAdmin = async function enterAdmin() {
    const status = document.getElementById("login-status");
    const password = document.getElementById("admin-password").value;
    if (!password) {
      status.textContent = "请输入密码。";
      return;
    }
    status.textContent = "正在验证…";
    try {
      await window.YunheApi.post("admin-list", {
        adminName: config.adminName,
        password,
        type: "article"
      });
      sessionStorage.setItem("yunhe.cms.verified", "1");
      location.href = "admin.html";
    } catch (error) {
      status.textContent = error.message;
    }
  };

  loadArchive();
})();
