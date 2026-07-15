const SUPABASE_URL = window.YUNHE_CONFIG.supabaseUrl;
const SUPABASE_KEY = window.YUNHE_CONFIG.supabaseKey;
const escapeHtml = window.YunheUtils.escapeHtml;

function articleUrl(item) {
  if (item.slug) return `content.html?slug=${encodeURIComponent(item.slug)}`;
  return `content.html?id=${encodeURIComponent(item.id)}`;
}

async function loadTopic() {
  const requested = new URLSearchParams(location.search).get("topic") || "未分类";
  const topic = window.YunheTaxonomy.canonicalTopic(requested);
  const title = document.getElementById("title");
  const status = document.getElementById("status");
  const list = document.getElementById("list");
  title.textContent = topic;
  document.title = `${topic}｜文章分类｜云鹤系统`;

  try {
    const query =
      "select=id,title,slug,intro,topic,created_at&type=eq.article&order=created_at.desc";
    const res = await fetch(`${SUPABASE_URL}/rest/v1/contents?${query}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) throw new Error("load failed");
    const data = await res.json();
    const articles = (Array.isArray(data) ? data : []).filter(
      item => window.YunheTaxonomy.classifyContent(item) === topic
    );

    if (!articles.length) {
      status.textContent = `“${topic}”分类下暂时没有文章。`;
      return;
    }

    status.textContent = `共 ${articles.length} 篇文章。`;
    list.innerHTML = articles
      .map(
        item => `
      <a class="topic-row" href="${articleUrl(item)}">
        <div class="date">${escapeHtml(window.YunheTaxonomy.classifyContent(item))}<br>${String(item.created_at || "").slice(0, 10)}</div>
        <div><h2>${escapeHtml(item.title || "未命名文章")}</h2><p>${escapeHtml(item.intro || "")}</p></div>
      </a>
    `
      )
      .join("");
  } catch (error) {
    status.textContent = "主题文章加载失败，请检查 Supabase 配置。";
  }
}

loadTopic();
