const { checkAdmin, requireSupabaseEnv } = require("../lib/_auth");
const { supabaseRequest } = require("../lib/_supabase-rest");

const DEFAULTS = {
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
  relationRules: ["共享主题时建立关联", "共享两个以上关键词时建立关联", "后续文章引用前文时建立关联"]
};

function parseConfig(row) {
  try { return { ...DEFAULTS, ...JSON.parse(row?.body || "{}") }; } catch (error) { return DEFAULTS; }
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ success:false, error:"Only POST allowed" });
  try {
    const data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const auth = checkAdmin(data?.adminName, data?.password);
    if (!auth.ok) return res.status(auth.status).json({ success:false, error:auth.error });
    const env = requireSupabaseEnv();
    if (!env.ok) return res.status(env.status).json({ success:false, error:env.error });

    const rows = await supabaseRequest("/rest/v1/contents?type=eq.system_config&topic=eq.knowledge-system&select=id,body&limit=1");
    const current = rows?.[0] || null;
    if (data?.action !== "save") return res.status(200).json({ success:true, id:current?.id || null, data:parseConfig(current) });

    const config = {
      templates: Array.isArray(data.config?.templates) ? data.config.templates : DEFAULTS.templates,
      topics: Array.isArray(data.config?.topics) ? data.config.topics : DEFAULTS.topics,
      levels: Array.isArray(data.config?.levels) ? data.config.levels : DEFAULTS.levels,
      archives: Array.isArray(data.config?.archives) ? data.config.archives : DEFAULTS.archives,
      relationRules: Array.isArray(data.config?.relationRules) ? data.config.relationRules : DEFAULTS.relationRules
    };
    const now = new Date().toISOString();
    if (current) {
      await supabaseRequest(`/rest/v1/contents?id=eq.${encodeURIComponent(current.id)}`, {
        method:"PATCH", headers:{ Prefer:"return=minimal" }, body:JSON.stringify({ body:JSON.stringify(config), intro:"知识系统配置" })
      });
    } else {
      await supabaseRequest("/rest/v1/contents", {
        method:"POST", headers:{ Prefer:"return=minimal" }, body:JSON.stringify({ title:"知识系统配置", slug:`knowledge-system-${Date.now()}`, intro:"知识系统配置", body:JSON.stringify(config), video:"", type:"system_config", topic:"knowledge-system", created_at:now })
      });
    }
    return res.status(200).json({ success:true, data:config });
  } catch (error) {
    return res.status(500).json({ success:false, error:error.message, detail:error.data || null });
  }
};
