const SUPABASE_URL = window.YUNHE_CONFIG.supabaseUrl;
const SUPABASE_KEY = window.YUNHE_CONFIG.supabaseKey;
const API = `${SUPABASE_URL}/rest/v1/contents?select=id,title,slug,intro,topic,type,created_at&type=eq.article&order=created_at.desc&limit=8`;

function articleUrl(item) {
  if (item.slug) return `content.html?slug=${encodeURIComponent(item.slug)}`;
  return `content.html?id=${encodeURIComponent(item.id)}`;
}

function splitTitle(title) {
  const text = String(title || "").trim();
  const match = text.match(/^(.*?)\s*(——|—|-)\s*(.+)$/);
  if (!match) return { title: text, subtitle: "" };
  return {
    title: match[1].trim() || text,
    subtitle: match[3].trim()
  };
}

function renderList(data) {
  const box = document.getElementById("content-list");
  const status = document.getElementById("status");

  if (!data.length) {
    status.textContent = "暂时没有文章。";
    return;
  }

  status.textContent = "";
  box.innerHTML = data
    .map(
      item => `
    <a class="card article-card" href="${articleUrl(item)}">
      <span>${item.topic || "ARTICLE"}</span>
      <h2>${splitTitle(item.title).title || "未命名文章"}</h2>
      <p class="subtitle">${splitTitle(item.title).subtitle || item.intro || ""}</p>
      ${splitTitle(item.title).subtitle && item.intro ? `<p class="excerpt">${item.intro}</p>` : ""}
    </a>
  `
    )
    .join("");
}

fetch(API, {
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`
  }
})
  .then(res => {
    if (!res.ok) throw new Error("load failed");
    return res.json();
  })
  .then(data => renderList(Array.isArray(data) ? data : []))
  .catch(() => {
    document.getElementById("status").textContent = "文章加载失败，请检查 Supabase 配置。";
  });
