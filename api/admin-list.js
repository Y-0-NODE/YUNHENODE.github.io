const { checkAdmin, requireSupabaseEnv } = require("../lib/_auth");
const { supabaseRequest } = require("../lib/_supabase-rest");

const DEFAULT_CONFIG = {
  templates: [
    { code:"A", name:"案例库", description:"现实事件、当事人与处理过程" },
    { code:"B", name:"方法库", description:"可复用的方法、流程与工具" },
    { code:"C", name:"研究记录", description:"观察、证据、假设与分析" },
    { code:"D", name:"项目档案", description:"项目背景、节点、成果与复盘" },
    { code:"E", name:"媒体库", description:"摄影、影像、声音与视觉资料" },
    { code:"X", name:"未分类档案", description:"等待归类的临时内容" }
  ],
  topics: ["个人成长与自我观察", "情感关系与人际处理", "系统组织与规则设计", "创作表达与内容方法", "技术工具与数字实践", "社会观察与公共议题"],
  levels: ["Observation", "Analysis", "Decision", "Validation", "Method"],
  archives: ["案例档案", "方法档案", "研究档案", "项目档案", "媒体档案", "未分类档案"],
  categories: ["人与关系", "组织与系统", "社会与现实", "创作与内在", "项目与方法", "未分类"],
  tags: ["观察", "分析", "案例", "方法", "研究", "复盘"],
  relationRules: ["共享主题时建立关联", "共享两个以上关键词时建立关联", "后续文章引用前文时建立关联"]
};

function readMeta(body) {
  const match = String(body || "").match(/<!--yunhe-meta:([\s\S]*?)-->\s*$/m);
  if (!match) return {};
  try { return JSON.parse(match[1]); } catch (error) { return {}; }
}

function cleanBody(body) {
  return String(body || "").replace(/\n*<!--yunhe-meta:[\s\S]*?-->\s*$/m, "").trim();
}

function parseConfig(row) {
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(row?.body || "{}") }; }
  catch (error) { return DEFAULT_CONFIG; }
}

async function getSearchIndex() {
  const rows = await supabaseRequest("/rest/v1/contents?select=id,title,slug,intro,body,type,topic,created_at&order=created_at.desc");
  return (Array.isArray(rows) ? rows : [])
    .filter(row => !["thought_profile", "system_config"].includes(row.type))
    .map(row => {
      const meta = readMeta(row.body);
      return {
        ...row,
        body: cleanBody(row.body),
        keywords: Array.isArray(meta.keywords) ? meta.keywords : [],
        template: meta.template || "",
        knowledge_level: meta.knowledge_level || "",
        archive: meta.archive || "",
        related_documents: Array.isArray(meta.related_documents) ? meta.related_documents : [],
        seo_title: meta.seo_title || row.title || "",
        seo_description: meta.seo_description || row.intro || ""
      };
    });
}

async function getConfigRow() {
  const rows = await supabaseRequest("/rest/v1/contents?type=eq.system_config&topic=eq.knowledge-system&select=id,body&limit=1");
  return rows?.[0] || null;
}

async function saveConfig(input) {
  const current = await getConfigRow();
  const config = {
    templates: Array.isArray(input?.templates) ? input.templates : DEFAULT_CONFIG.templates,
    topics: Array.isArray(input?.topics) ? input.topics : DEFAULT_CONFIG.topics,
    levels: Array.isArray(input?.levels) ? input.levels : DEFAULT_CONFIG.levels,
    archives: Array.isArray(input?.archives) ? input.archives : DEFAULT_CONFIG.archives,
    categories: Array.isArray(input?.categories) ? input.categories : DEFAULT_CONFIG.categories,
    tags: Array.isArray(input?.tags) ? input.tags : DEFAULT_CONFIG.tags,
    relationRules: Array.isArray(input?.relationRules) ? input.relationRules : DEFAULT_CONFIG.relationRules
  };

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

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    if (req.query?.view === "knowledge-config") {
      const env = requireSupabaseEnv();
      if (!env.ok) return res.status(env.status).json({ success:false, error:env.error });
      try {
        const row = await getConfigRow();
        return res.status(200).json({ success:true, data:parseConfig(row) });
      } catch (error) {
        return res.status(500).json({ success:false, error:error.message });
      }
    }
    return res.status(200).json({ success: true, version: "admin-list-rest-2026-07-15-v2", message: "管理列表、搜索索引和知识配置共用一个接口。" });
  }
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Only POST allowed" });

  try {
    const data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const auth = checkAdmin(data?.adminName, data?.password);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });
    const env = requireSupabaseEnv();
    if (!env.ok) return res.status(env.status).json({ success: false, error: env.error });

    if (data?.action === "search-index") {
      return res.status(200).json({ success: true, data: await getSearchIndex(), generatedAt: new Date().toISOString() });
    }
    if (data?.action === "config-get") {
      const row = await getConfigRow();
      return res.status(200).json({ success: true, id: row?.id || null, data: parseConfig(row) });
    }
    if (data?.action === "config-save") {
      return res.status(200).json({ success: true, data: await saveConfig(data?.config) });
    }

    const allowedTypes = ["article", "case", "video", "thought", "thought_profile"];
    const requestedType = allowedTypes.includes(data?.type) ? data.type : "article";
    const contents = await supabaseRequest(`/rest/v1/contents?select=id,title,slug,intro,body,type,topic,created_at&type=eq.${requestedType}&order=created_at.desc`);
    return res.status(200).json({ success: true, data: Array.isArray(contents) ? contents : [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message, detail: error.data || null });
  }
};
