const SUPABASE_URL = window.YUNHE_CONFIG.supabaseUrl;
const SUPABASE_KEY = window.YUNHE_CONFIG.supabaseKey;
const API = `${SUPABASE_URL}/rest/v1/contents?select=id,title,slug,intro,type,topic,created_at&type=eq.article&order=created_at.desc`;

let DATA = [];

const LEGACY_TOPIC_MAP = {
  情感关系与人际处理: "情感与关系",
  个人成长与自我观察: "个体成长",
  系统组织与规则设计: "系统机制",
  社会观察与公共议题: "社会观察",
  技术工具与数字实践: "平台与技术",
  平台: "平台与技术",
  技术: "平台与技术",
  组织: "组织结构",
  城市: "城市与空间",
  空间: "城市与空间",
  消费: "消费与生活",
  品牌: "商业与品牌",
  艺术: "艺术与创作",
  梦境: "梦境与潜意识",
  文化: "社会观察",
  社会: "社会观察"
};

function canonicalTopic(value) {
  const topic = String(value || "未分类").trim() || "未分类";
  return LEGACY_TOPIC_MAP[topic] || topic;
}

const DIMENSIONS = {
  人与关系: ["情感与关系", "亲密关系与家庭", "沟通与冲突", "个体成长"],
  组织与系统: ["组织结构", "系统机制", "管理与协作", "平台与技术"],
  社会与现实: ["社会观察", "城市与空间", "消费与生活", "商业与品牌"],
  创作与内在: ["艺术与创作", "方法与思考", "梦境与潜意识", "未分类"]
};

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
      <div class="topic">${canonicalTopic(item.topic)}<br>${String(item.created_at || "").slice(0, 10)}</div>
      <div>
        <h2>${titleParts.title || "未命名文章"}</h2>
        <p class="subtitle">${titleParts.subtitle || item.intro || ""}</p>
        ${titleParts.subtitle && item.intro ? `<p class="excerpt">${item.intro}</p>` : ""}
      </div>
    `;

    el.appendChild(a);
  });
}

function filterType(type) {
  if (type === "all") return render(DATA);
  render(DATA.filter(i => i.type === type));
}

function filterTopic(topic) {
  render(DATA.filter(item => canonicalTopic(item.topic) === canonicalTopic(topic)));
}

function filterDimension(name) {
  const topics = DIMENSIONS[name] || [];
  render(DATA.filter(item => topics.includes(canonicalTopic(item.topic))));
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
    DATA = Array.isArray(data) ? data : [];
    render(DATA);
  })
  .catch(() => {
    document.getElementById("status").textContent = "文章加载失败，请检查 Supabase 配置。";
  });
