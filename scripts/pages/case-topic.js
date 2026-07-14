const SUPABASE_URL = window.YUNHE_CONFIG.supabaseUrl;
const SUPABASE_KEY = window.YUNHE_CONFIG.supabaseKey;

function normalizeTopic(value) {
  return String(value || "未分类")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

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

async function loadTopic() {
  const params = new URLSearchParams(location.search);
  const topic = params.get("topic") || "未分类";
  const topicKey = normalizeTopic(topic);
  const box = document.getElementById("list");
  const status = document.getElementById("status");
  document.getElementById("title").textContent = `${topic}案例`;
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
    status.textContent = "主题案例读取失败，请检查 Supabase 配置。";
    return;
  }

  const data = await res.json();
  const cases = data.filter(item => normalizeTopic(detectTopic(item)) === topicKey);

  if (!cases.length) {
    status.textContent = "暂无该主题案例。";
    box.innerHTML = "";
    return;
  }

  status.textContent = "";
  box.innerHTML = cases
    .map(
      item => `
    <a class="card" href="${caseUrl(item)}">
      <span>${detectTopic(item)}</span>
      <h2>${item.title || "未命名案例"}</h2>
      <p>${item.intro || ""}</p>
    </a>
  `
    )
    .join("");
}

loadTopic();
