const SUPABASE_URL = window.YUNHE_CONFIG.supabaseUrl;
const SUPABASE_KEY = window.YUNHE_CONFIG.supabaseKey;
const CATEGORY_GROUPS = window.YunheTaxonomy.groups;
const escapeHtml = window.YunheUtils.escapeHtml;

async function loadCategories() {
  const status = document.getElementById("status");
  const box = document.getElementById("category-list");
  try {
    const query = "select=title,intro,topic&type=eq.article&order=created_at.desc";
    const res = await fetch(`${SUPABASE_URL}/rest/v1/contents?${query}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) throw new Error("load failed");
    const articles = await res.json();
    const list = Array.isArray(articles) ? articles : [];

    box.innerHTML = CATEGORY_GROUPS.map(
      group => `
      <section class="category-section">
        <div class="category-head">
          <h2>${escapeHtml(group.name)}</h2>
          <p>${escapeHtml(group.description)}</p>
        </div>
        <div class="category-grid">
          ${group.items
            .map(item => {
              const count = list.filter(
                article => window.YunheTaxonomy.classifyContent(article) === item.name
              ).length;
              return `
              <a class="category-card" href="article-topic.html?topic=${encodeURIComponent(item.name)}">
                <span>${count} 篇文章</span>
                <div>
                  <h3>${escapeHtml(item.name)}</h3>
                  <p>${escapeHtml(item.description)}</p>
                </div>
              </a>
            `;
            })
            .join("")}
        </div>
      </section>
    `
    ).join("");

    status.textContent = list.length
      ? `共读取 ${list.length} 篇公开文章。分类规则已与文章管理和公众号导入同步。`
      : "目前还没有公开文章，可以先浏览分类结构。";
  } catch (error) {
    status.textContent = "文章分类加载失败，请检查 Supabase 配置。";
  }
}

loadCategories();
