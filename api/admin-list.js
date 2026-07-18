const { checkAdmin, requireSupabaseEnv } = require("../lib/_auth");
const { supabaseRequest } = require("../lib/_supabase-rest");
const { buildSearchIndex } = require("../lib/services/search-index-service");
const { listContent } = require("../lib/services/content-query-service");
const knowledgeConfig = require("../lib/services/knowledge-config-service");

async function listVisitorLogs() {
  return supabaseRequest(
    "/rest/v1/visitor_logs?select=id,created_at,display_name,source,purpose,message,page_url,is_important,highlight_color,admin_note,updated_at&order=created_at.desc&limit=500",
    {
      method: "GET"
    }
  );
}

const VISITOR_SOURCES = new Set(["公众号", "视频", "朋友推荐", "搜索", "其他"]);
const VISITOR_PURPOSES = new Set(["看文章", "看案例", "看作品", "了解云鹤系统", "其他"]);
const VISITOR_HIGHLIGHTS = new Set(["none", "red", "amber", "green", "blue"]);

async function updateVisitorLog(input) {
  const id = Number(input.id);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("访客记录 ID 无效");
  const source = String(input.source || "").trim();
  const purpose = String(input.purpose || "").trim();
  const highlightColor = String(input.highlightColor || "none").trim();
  if (!VISITOR_SOURCES.has(source)) throw new Error("访客来源无效");
  if (!VISITOR_PURPOSES.has(purpose)) throw new Error("进入目的无效");
  if (!VISITOR_HIGHLIGHTS.has(highlightColor)) throw new Error("重点颜色无效");

  const payload = {
    display_name: String(input.displayName || "").trim().slice(0, 120) || null,
    source,
    purpose,
    message: String(input.message || "").trim().slice(0, 4000) || null,
    is_important: Boolean(input.isImportant),
    highlight_color: highlightColor,
    admin_note: String(input.adminNote || "").trim().slice(0, 4000) || null,
    updated_at: new Date().toISOString()
  };

  return supabaseRequest(
    `/rest/v1/visitor_logs?id=eq.${encodeURIComponent(id)}&select=id,created_at,display_name,source,purpose,message,page_url,is_important,highlight_color,admin_note,updated_at`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    }
  );
}

module.exports = async function adminQueryRouter(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const env = requireSupabaseEnv();
    if (!env.ok) return res.status(env.status).json({ success: false, error: env.error });

    if (req.method === "GET" && req.query?.view === "knowledge-config") {
      return res
        .status(200)
        .json({ success: true, data: (await knowledgeConfig.getConfig()).data });
    }
    if (req.method === "GET") {
      return res.status(200).json({ success: true, version: "admin-query-router-v3" });
    }
    if (req.method !== "POST")
      return res.status(405).json({ success: false, error: "Only POST allowed" });

    const input = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const auth = checkAdmin(input.adminName, input.password);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });

    if (input.action === "search-index") {
      return res.status(200).json({
        success: true,
        data: await buildSearchIndex(),
        generatedAt: new Date().toISOString()
      });
    }
    if (input.action === "config-get") {
      return res.status(200).json({ success: true, ...(await knowledgeConfig.getConfig()) });
    }
    if (input.action === "config-save") {
      return res
        .status(200)
        .json({ success: true, data: await knowledgeConfig.saveConfig(input.config) });
    }
    if (input.action === "visitor-log-list") {
      return res.status(200).json({ success: true, data: await listVisitorLogs() });
    }
    if (input.action === "visitor-log-update") {
      return res.status(200).json({ success: true, data: await updateVisitorLog(input) });
    }
    return res.status(200).json({ success: true, data: await listContent(input.type) });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: error.message, detail: error.data || null });
  }
};
