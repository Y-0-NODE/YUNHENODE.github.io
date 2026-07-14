const SUPABASE_URL = window.YUNHE_CONFIG.supabaseUrl;
const SUPABASE_KEY = window.YUNHE_CONFIG.supabaseKey;
const TOPIC_ALIASES = {
  情感与关系: ["情感与关系", "情感", "关系"],
  亲密关系与家庭: ["亲密关系与家庭", "亲密关系", "家庭"],
  沟通与冲突: ["沟通与冲突"],
  个体成长: ["个体成长"],
  组织结构: ["组织结构", "组织"],
  系统机制: ["系统机制"],
  管理与协作: ["管理与协作"],
  平台与技术: ["平台与技术", "平台", "技术"],
  社会观察: ["社会观察"],
  城市与空间: ["城市与空间", "城市", "空间"],
  消费与生活: ["消费与生活", "消费"],
  商业与品牌: ["商业与品牌", "品牌"],
  艺术与创作: ["艺术与创作", "艺术"],
  方法与思考: ["方法与思考"],
  梦境与潜意识: ["梦境与潜意识", "梦境"],
  未分类: ["未分类", ""]
};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function articleUrl(item) {
  if (item.slug) return `content.html?slug=${encodeURIComponent(item.slug)}`;
  return `content.html?id=${encodeURIComponent(item.id)}`;
}

async function loadTopic() {
  const topic = new URLSearchParams(location.search).get("topic") || "未分类";
  const aliases = TOPIC_ALIASES[topic] || [topic];
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
    const articles = (Array.isArray(data) ? data : []).filter(item =>
      aliases.includes(String(item.topic || "未分类"))
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
        <div class="date">${escapeHtml(item.topic || topic)}<br>${String(item.created_at || "").slice(0, 10)}</div>
        <div><h2>${escapeHtml(item.title || "未命名文章")}</h2><p>${escapeHtml(item.intro || "")}</p></div>
      </a>
    `
      )
      .join("");
  } catch (e) {
    status.textContent = "主题文章加载失败，请检查 Supabase 配置。";
  }
}

loadTopic();
