const SUPABASE_URL = window.YUNHE_CONFIG.supabaseUrl;
const SUPABASE_KEY = window.YUNHE_CONFIG.supabaseKey;
const API = `${SUPABASE_URL}/rest/v1/contents?select=id,title,slug,intro,type,topic,created_at&type=eq.article&order=created_at.desc`;

let DATA = [];
const VISITOR_MODE = new URLSearchParams(location.search).get("visitor") === "1";

const DIMENSIONS = Object.fromEntries(
  window.YunheTaxonomy.groups.map(group => [group.name, group.items.map(item => item.name)])
);

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

function render(list) {
  const el = document.getElementById("list");
  const status = document.getElementById("status");
  el.innerHTML = "";

  if (!list.length) {
    status.textContent = "暂时没有文章。";
    return;
  }

  status.textContent = "";

  list.forEach(item => {
    const a = document.createElement("a");
    const titleParts = splitTitle(item.title);
    a.className = "article-row";
    a.href = articleUrl(item);

    a.innerHTML = `
      <div class="topic">${window.YunheTaxonomy.classifyContent(item)}<br>${String(item.created_at || "").slice(0, 10)}</div>
      <div>
        <h2>${titleParts.title || "未命名文章"}</h2>
        <p class="subtitle">${titleParts.subtitle || item.intro || ""}</p>
        ${titleParts.subtitle && item.intro ? `<p class="excerpt">${item.intro}</p>` : ""}
      </div>
    `;

    el.appendChild(a);
  });
}

function setActiveFilter(label) {
  document.querySelectorAll(".toolbar button").forEach(button => {
    const active = button.textContent.trim() === label;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function filterType(type) {
  setActiveFilter(type === "all" ? "全部" : type);
  if (type === "all") return render(DATA);
  render(DATA.filter(i => i.type === type));
}

function filterTopic(topic) {
  const canonical = window.YunheTaxonomy.canonicalTopic(topic);
  render(DATA.filter(item => window.YunheTaxonomy.classifyContent(item) === canonical));
}

function filterDimension(name) {
  setActiveFilter(name);
  const topics = DIMENSIONS[name] || [];
  render(DATA.filter(item => topics.includes(window.YunheTaxonomy.classifyContent(item))));
}

function dedupeVisitorArticles(items) {
  if (!VISITOR_MODE) return items;
  const seen = new Set();
  return items.filter(item => {
    const key = String(item.title || "")
      .toLowerCase()
      .replace(/[《》“”"'：:，,。.!！?？/\s—_-]/g, "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

fetch(API, {
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`
  }
})
  .then(r => {
    if (!r.ok) throw new Error("load failed");
    return r.json();
  })
  .then(data => {
    DATA = dedupeVisitorArticles(Array.isArray(data) ? data : []);
    render(DATA);
  })
  .catch(() => {
    document.getElementById("status").textContent = "文章加载失败，请检查 Supabase 配置。";
  });
