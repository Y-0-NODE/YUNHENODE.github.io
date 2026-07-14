const { checkAdmin, requireSupabaseEnv } = require("../lib/_auth");
const { buildSearchIndex } = require("../lib/services/search-index-service");
const { listContent } = require("../lib/services/content-query-service");
const knowledgeConfig = require("../lib/services/knowledge-config-service");

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
    return res.status(200).json({ success: true, data: await listContent(input.type) });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: error.message, detail: error.data || null });
  }
};
