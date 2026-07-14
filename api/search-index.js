const { checkAdmin, requireSupabaseEnv } = require("../lib/_auth");
const { supabaseRequest } = require("../lib/_supabase-rest");

function readMeta(body) {
  const match = String(body || "").match(/<!--yunhe-meta:([\s\S]*?)-->\s*$/m);
  if (!match) return {};
  try { return JSON.parse(match[1]); } catch (error) { return {}; }
}

function cleanBody(body) {
  return String(body || "").replace(/\n*<!--yunhe-meta:[\s\S]*?-->\s*$/m, "").trim();
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Only POST allowed" });

  try {
    const data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const auth = checkAdmin(data?.adminName, data?.password);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });
    const env = requireSupabaseEnv();
    if (!env.ok) return res.status(env.status).json({ success: false, error: env.error });

    const rows = await supabaseRequest("/rest/v1/contents?select=id,title,slug,intro,body,type,topic,created_at&order=created_at.desc");
    const index = (Array.isArray(rows) ? rows : [])
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
    return res.status(200).json({ success: true, data: index, generatedAt: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message, detail: error.data || null });
  }
};
