const SUPABASE_URL = window.YUNHE_CONFIG.supabaseUrl;
const SUPABASE_KEY = window.YUNHE_CONFIG.supabaseKey;
const BASE_TOPICS = ["品牌", "平台", "城市", "组织", "消费", "艺术", "空间", "技术", "梦境"];

function detectTopic(item) {
  const saved = String(item.topic || "").trim();
  if (saved && saved !== "未分类") return saved;

  const text = `${item.title || ""} ${item.intro || ""} ${item.body || ""}`.toLowerCase();
  const rules = [
    [
      "技术",
      ["github", "supabase", "vercel", "codex", "api", "h5", "网站", "架构", "模块", "部署"]
    ],
    ["平台", ["apple", "账号", "微信", "公众号", "小程序", "平台", "系统"]],
    ["品牌", ["品牌", "logo", "视觉", "包装", "定位"]],
    ["城市", ["城市", "街区", "地方", "社区"]],
    ["组织", ["组织", "公司", "团队", "机构"]],
    ["消费", ["消费", "用户", "产品", "购买", "服务"]],
    ["艺术", ["艺术", "摄影", "影像", "展览"]],
    ["空间", ["空间", "建筑", "场地", "室内"]],
    ["梦境", ["梦", "梦境", "潜意识"]]
  ];

  const found = rules.find(([, words]) => words.some(word => text.includes(word)));
  return found ? found[0] : "未分类";
}

function caseUrl(item) {
  if (item.slug) return `content.html?slug=${encodeURIComponent(item.slug)}`;
  return `content.html?id=${encodeURIComponent(item.id)}`;
}

async function loadCategories() {
  const box = document.getElementById("category-list");
  const status = document.getElementById("status");
  status.textContent = "正在读取案例...";

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/contents?select=id,title,slug,intro,body,type,topic,created_at&type=eq.case&order=created_at.desc`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    }
  );

  if (!res.ok) {
    status.textContent = "案例分类读取失败，请检查 Supabase 配置。";
    return;
  }

  const cases = await res.json();
  const topics = [...BASE_TOPICS];

  cases.forEach(item => {
    const topic = detectTopic(item);
    if (!topics.includes(topic)) topics.push(topic);
  });

  status.textContent = "";
  box.innerHTML = topics
    .map(topic => {
      const count = cases.filter(item => detectTopic(item) === topic).length;
      return `
      <a class="card" href="case-topic.html?topic=${encodeURIComponent(topic)}">
        <span>${count} 个案例</span>
        <h2>${topic}</h2>
        <p>查看${topic}相关案例。</p>
      </a>
    `;
    })
    .join("");
}

loadCategories();
