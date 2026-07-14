const { supabaseRequest } = require("../_supabase-rest");

const DEFAULT_CONFIG = Object.freeze({
  templates: [
    { code: "A", name: "案例库", description: "现实事件、当事人与处理过程" },
    { code: "B", name: "方法库", description: "可复用的方法、流程与工具" },
    { code: "C", name: "研究记录", description: "观察、证据、假设与分析" },
    { code: "D", name: "项目档案", description: "项目背景、节点、成果与复盘" },
    { code: "E", name: "媒体库", description: "摄影、影像、声音与视觉资料" },
    { code: "X", name: "未分类档案", description: "等待归类的临时内容" }
  ],
  topics: [
    "个人成长与自我观察",
    "情感关系与人际处理",
    "系统组织与规则设计",
    "创作表达与内容方法",
    "技术工具与数字实践",
    "社会观察与公共议题"
  ],
  levels: ["Observation", "Analysis", "Decision", "Validation", "Method"],
  archives: ["案例档案", "方法档案", "研究档案", "项目档案", "媒体档案", "未分类档案"],
  categories: ["人与关系", "组织与系统", "社会与现实", "创作与内在", "项目与方法", "未分类"],
  tags: ["观察", "分析", "案例", "方法", "研究", "复盘"],
  relationRules: [
    "共享主题时建立关联",
    "共享两个以上关键词时建立关联",
    "后续文章引用前文时建立关联"
  ]
});

function parseConfig(row) {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(row?.body || "{}") };
  } catch (error) {
    return { ...DEFAULT_CONFIG };
  }
}

async function getRow() {
  return (
    (
      await supabaseRequest(
        "/rest/v1/contents?type=eq.system_config&topic=eq.knowledge-system&select=id,body&limit=1"
      )
    )?.[0] || null
  );
}

async function getConfig() {
  const row = await getRow();
  return { id: row?.id || null, data: parseConfig(row) };
}

async function saveConfig(input = {}) {
  const current = await getRow();
  const config = Object.fromEntries(
    Object.keys(DEFAULT_CONFIG).map(key => [
      key,
      Array.isArray(input[key]) ? input[key] : DEFAULT_CONFIG[key]
    ])
  );
  if (current) {
    await supabaseRequest(`/rest/v1/contents?id=eq.${encodeURIComponent(current.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ body: JSON.stringify(config), intro: "知识系统配置" })
    });
  } else {
    await supabaseRequest("/rest/v1/contents", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        title: "知识系统配置",
        slug: `knowledge-system-${Date.now()}`,
        intro: "知识系统配置",
        body: JSON.stringify(config),
        video: "",
        type: "system_config",
        topic: "knowledge-system",
        created_at: new Date().toISOString()
      })
    });
  }
  return config;
}

module.exports = { getConfig, saveConfig };
